package com.nanainter.smssender

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.*
import android.provider.Settings
import android.telephony.SmsManager
import android.widget.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val executor = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var server: EditText
    private lateinit var deviceName: EditText
    private lateinit var status: TextView
    private var running = false
    private val deviceId by lazy { Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) }
    private val poll = object : Runnable { override fun run() { if (running) executor.execute { pollOnce() } } }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("nana_sms", MODE_PRIVATE)
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48, 72, 48, 48); setBackgroundColor(Color.WHITE) }
        fun label(text: String) = TextView(this).apply { this.text = text; textSize = 14f; setTextColor(Color.DKGRAY); setPadding(0, 24, 0, 6) }
        root.addView(TextView(this).apply { text = "Nana SMS Sender"; textSize = 28f; setTextColor(Color.BLACK) })
        root.addView(label("서버")); server = EditText(this).apply { setText(prefs.getString("server", "https://nanainter.com")); hint = "https://nanainter.com" }; root.addView(server)
        root.addView(label("단말기")); deviceName = EditText(this).apply { setText(prefs.getString("name", "업무폰1")); hint = "업무폰1" }; root.addView(deviceName)
        root.addView(label("Device ID")); root.addView(TextView(this).apply { text = deviceId; setTextIsSelectable(true); textSize = 15f })
        val buttons = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0, 32, 0, 24) }
        buttons.addView(Button(this).apply { text = "서버 연결 시작"; setOnClickListener { startConnection() } }, LinearLayout.LayoutParams(0, -2, 1f))
        buttons.addView(Button(this).apply { text = "연결 중지"; setOnClickListener { stopConnection("연결이 중지되었습니다.") } }, LinearLayout.LayoutParams(0, -2, 1f))
        root.addView(buttons)
        status = TextView(this).apply { text = "● 연결 대기"; textSize = 17f; setTextColor(Color.GRAY); setPadding(16, 24, 16, 24) }; root.addView(status)
        setContentView(root)
    }

    private fun startConnection() {
        if (checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.SEND_SMS), 100); return
        }
        if (BuildConfig.SMS_DEVICE_API_KEY.isBlank()) { showStatus("설정 오류: SMS_DEVICE_API_KEY가 없습니다.", Color.RED); return }
        val base = server.text.toString().trim().trimEnd('/')
        val name = deviceName.text.toString().trim()
        if (!base.startsWith("https://") || name.isBlank()) { showStatus("HTTPS 서버 주소와 단말기 이름을 확인하세요.", Color.RED); return }
        getSharedPreferences("nana_sms", MODE_PRIVATE).edit().putString("server", base).putString("name", name).apply()
        running = true; showStatus("● 서버 연결 중...", Color.rgb(37, 99, 235)); handler.removeCallbacks(poll); handler.post(poll)
    }

    override fun onRequestPermissionsResult(code: Int, permissions: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(code, permissions, results)
        if (code == 100 && results.firstOrNull() == PackageManager.PERMISSION_GRANTED) startConnection() else showStatus("SMS 권한이 필요합니다.", Color.RED)
    }

    private fun pollOnce() {
        try {
            val name = deviceName.text.toString().trim()
            api("POST", "/api/sms-device/register", JSONObject().put("deviceId", deviceId).put("deviceName", name))
            api("POST", "/api/sms-device/heartbeat", JSONObject().put("deviceId", deviceId))
            showStatus("● 서버 연결됨\n문자 대기 중", Color.rgb(5, 150, 105))
            val response = api("GET", "/api/sms-device/${deviceId}/next", null)
            val job = response.optJSONObject("job")
            if (job != null) sendSms(job.getString("jobId"), job.getString("phone"), job.getString("message")) else scheduleNext()
        } catch (error: Exception) {
            showStatus("연결 오류: ${error.message}", Color.RED); scheduleNext()
        }
    }

    private fun sendSms(jobId: String, phone: String, message: String) {
        showStatus("문자 발송 중", Color.rgb(37, 99, 235))
        val action = "com.nanainter.smssender.SENT.$jobId"
        val sms = if (Build.VERSION.SDK_INT >= 31) getSystemService(SmsManager::class.java) else SmsManager.getDefault()
        val parts = sms.divideMessage(message)
        var remaining = parts.size
        var failureCode: Int? = null
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (resultCode != RESULT_OK && failureCode == null) failureCode = resultCode
                remaining -= 1
                if (remaining > 0) return
                unregisterReceiver(this)
                val errorCode = failureCode
                val ok = errorCode == null
                executor.execute {
                    try { api("POST", "/api/sms/result", JSONObject().put("deviceId", deviceId).put("jobId", jobId).put("status", if (ok) "sent" else "failed").put("error", if (ok) JSONObject.NULL else smsError(errorCode!!)))
                        showStatus(if (ok) "발송 성공\n문자 대기 중" else "발송 실패: ${smsError(errorCode!!)}", if (ok) Color.rgb(5,150,105) else Color.RED)
                    } catch (e: Exception) { showStatus("결과 전송 실패: ${e.message}", Color.RED) }
                    scheduleNext()
                }
            }
        }
        registerReceiver(receiver, IntentFilter(action), if (Build.VERSION.SDK_INT >= 33) RECEIVER_NOT_EXPORTED else 0)
        val sentIntents = ArrayList(parts.indices.map { index ->
            PendingIntent.getBroadcast(this, jobId.hashCode() + index, Intent(action).setPackage(packageName), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        })
        if (parts.size == 1) sms.sendTextMessage(phone, null, message, sentIntents[0], null)
        else sms.sendMultipartTextMessage(phone, null, parts, sentIntents, null)
    }

    private fun api(method: String, path: String, body: JSONObject?): JSONObject {
        val connection = URL(server.text.toString().trim().trimEnd('/') + path).openConnection() as HttpURLConnection
        connection.requestMethod = method; connection.connectTimeout = 8000; connection.readTimeout = 8000
        connection.setRequestProperty("Authorization", "Bearer ${BuildConfig.SMS_DEVICE_API_KEY}")
        connection.setRequestProperty("Content-Type", "application/json")
        if (body != null) { connection.doOutput = true; connection.outputStream.use { it.write(body.toString().toByteArray()) } }
        val code = connection.responseCode
        val text = (if (code in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() } ?: "{}"
        if (code !in 200..299) throw IllegalStateException("HTTP $code ${JSONObject(text).optString("error")}")
        return JSONObject(text)
    }

    private fun smsError(code: Int) = when(code) { SmsManager.RESULT_ERROR_NO_SERVICE -> "통신 서비스 없음"; SmsManager.RESULT_ERROR_RADIO_OFF -> "통신 기능 꺼짐"; SmsManager.RESULT_ERROR_NULL_PDU -> "잘못된 PDU"; else -> "Android SMS 오류 ($code)" }
    private fun scheduleNext() { if (running) handler.postDelayed(poll, 2000) }
    private fun showStatus(text: String, color: Int) = handler.post { status.text = text; status.setTextColor(color) }
    private fun stopConnection(text: String) { running = false; handler.removeCallbacks(poll); showStatus(text, Color.GRAY) }
    override fun onDestroy() { stopConnection("연결 종료"); executor.shutdownNow(); super.onDestroy() }
}
