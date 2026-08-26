package com.nanainter.smssender

import android.app.*
import android.content.*
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.os.*
import android.provider.Settings
import android.telephony.SmsManager
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import kotlin.random.Random

class SmsPollingService : Service() {
    private val executor = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private val deviceId by lazy { Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) }
    private var running = false
    private var server = ""
    private var deviceName = ""
    private var sentReceiver: BroadcastReceiver? = null
    private val poll = object : Runnable { override fun run() { if (running) executor.execute { pollOnce() } } }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIFICATION_ID, notification("서버 연결 중"), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        else startForeground(NOTIFICATION_ID, notification("서버 연결 중"))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) { stopPolling(); return START_NOT_STICKY }
        val prefs = getSharedPreferences("nana_sms", MODE_PRIVATE)
        server = intent?.getStringExtra(EXTRA_SERVER) ?: prefs.getString("server", "https://nanainter.com").orEmpty()
        deviceName = intent?.getStringExtra(EXTRA_DEVICE_NAME) ?: prefs.getString("name", "업무폰1").orEmpty()
        if (intent?.action == ACTION_START || prefs.getBoolean("running", false)) {
            running = true
            handler.removeCallbacks(poll)
            handler.post(poll)
        } else stopPolling()
        return START_STICKY
    }

    private fun pollOnce() {
        try {
            api("POST", "/api/sms-device/register", JSONObject().put("deviceId", deviceId).put("deviceName", deviceName))
            api("POST", "/api/sms-device/heartbeat", JSONObject().put("deviceId", deviceId))
            val waitMillis = nextSendAt() - System.currentTimeMillis()
            if (waitMillis > 0) {
                val waitSeconds = (waitMillis + 999) / 1000
                updateStatus("● 서버 연결됨\n다음 발송까지 ${waitSeconds / 60}분 ${waitSeconds % 60}초",
                    Color.rgb(5, 150, 105), "발송 간격 대기 중")
                scheduleNext()
                return
            }
            updateStatus("● 서버 연결됨\n문자 대기 중", Color.rgb(5, 150, 105), "서버 연결됨 / 문자 대기 중")
            val job = api("GET", "/api/sms-device/$deviceId/next", null).optJSONObject("job")
            if (job != null) sendSms(job.getString("jobId"), job.getString("phone"), job.getString("message")) else scheduleNext()
        } catch (error: Exception) {
            updateStatus("연결 오류: ${error.message}", Color.RED, "서버 연결 오류 - 재시도 중")
            scheduleNext()
        }
    }

    private fun sendSms(jobId: String, phone: String, message: String) {
        updateStatus("문자 발송 중", Color.rgb(37, 99, 235), "문자 발송 중")
        val action = "$packageName.SENT.$jobId"
        val sms = if (Build.VERSION.SDK_INT >= 31) getSystemService(SmsManager::class.java) else @Suppress("DEPRECATION") SmsManager.getDefault()
        val parts = sms.divideMessage(message)
        var remaining = parts.size
        var failureCode: Int? = null
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (resultCode != Activity.RESULT_OK && failureCode == null) failureCode = resultCode
                if (--remaining > 0) return
                runCatching { unregisterReceiver(this) }
                sentReceiver = null
                val errorCode = failureCode
                val ok = errorCode == null
                executor.execute {
                    try {
                        api("POST", "/api/sms/result", JSONObject().put("deviceId", deviceId).put("jobId", jobId)
                            .put("status", if (ok) "sent" else "failed").put("error", if (ok) JSONObject.NULL else smsError(errorCode!!)))
                        updateStatus(if (ok) "발송 성공\n문자 대기 중" else "발송 실패: ${smsError(errorCode!!)}",
                            if (ok) Color.rgb(5, 150, 105) else Color.RED, if (ok) "서버 연결됨 / 문자 대기 중" else "문자 발송 실패")
                    } catch (error: Exception) { updateStatus("결과 전송 실패: ${error.message}", Color.RED, "결과 전송 실패") }
                    scheduleNext()
                }
            }
        }
        sentReceiver = receiver
        val filter = IntentFilter(action)
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(receiver, filter, RECEIVER_NOT_EXPORTED)
        else @Suppress("DEPRECATION") registerReceiver(receiver, filter)
        val sentIntents = ArrayList(parts.indices.map { index ->
            PendingIntent.getBroadcast(this, jobId.hashCode() + index, Intent(action).setPackage(packageName), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        })
        reserveNextSendAt()
        if (parts.size == 1) sms.sendTextMessage(phone, null, message, sentIntents[0], null)
        else sms.sendMultipartTextMessage(phone, null, parts, sentIntents, null)
    }

    private fun nextSendAt(): Long = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        .getLong("$NEXT_SEND_AT_PREFIX$deviceId", 0L)

    private fun reserveNextSendAt() {
        val delaySeconds = Random.nextLong(MIN_SEND_INTERVAL_SECONDS, MAX_SEND_INTERVAL_SECONDS + 1)
        val nextSendAt = System.currentTimeMillis() + delaySeconds * 1000
        check(getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
            .putLong("$NEXT_SEND_AT_PREFIX$deviceId", nextSendAt).commit()) { "다음 발송 시간 저장 실패" }
    }

    private fun api(method: String, path: String, body: JSONObject?): JSONObject {
        val connection = URL(server.trimEnd('/') + path).openConnection() as HttpURLConnection
        connection.requestMethod = method; connection.connectTimeout = 8000; connection.readTimeout = 8000
        connection.setRequestProperty("Authorization", "Bearer ${BuildConfig.SMS_DEVICE_API_KEY}")
        connection.setRequestProperty("Content-Type", "application/json")
        if (body != null) { connection.doOutput = true; connection.outputStream.use { it.write(body.toString().toByteArray()) } }
        val code = connection.responseCode
        val text = (if (code in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() } ?: "{}"
        connection.disconnect()
        if (code !in 200..299) throw IllegalStateException("HTTP $code ${JSONObject(text).optString("error")}")
        return JSONObject(text)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "SMS 서버 연결", NotificationManager.IMPORTANCE_LOW))
    }

    private fun notification(text: String): Notification {
        val openApp = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CHANNEL_ID) else @Suppress("DEPRECATION") Notification.Builder(this)
        return builder.setSmallIcon(android.R.drawable.stat_notify_sync).setContentTitle("Nana SMS Sender")
            .setContentText(text).setOngoing(true).setContentIntent(openApp).build()
    }

    private fun updateStatus(text: String, color: Int, notificationText: String) {
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification(notificationText))
        sendBroadcast(Intent(ACTION_STATUS).setPackage(packageName).putExtra(EXTRA_STATUS, text).putExtra(EXTRA_COLOR, color))
    }
    private fun scheduleNext() { if (running) handler.postDelayed(poll, 2000) }
    private fun smsError(code: Int) = when (code) { SmsManager.RESULT_ERROR_NO_SERVICE -> "통신 서비스 없음"; SmsManager.RESULT_ERROR_RADIO_OFF -> "통신 기능 꺼짐"; SmsManager.RESULT_ERROR_NULL_PDU -> "잘못된 PDU"; else -> "Android SMS 오류 ($code)" }
    private fun stopPolling() { running = false; handler.removeCallbacks(poll); getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean("running", false).apply(); stopForeground(STOP_FOREGROUND_REMOVE); stopSelf() }
    override fun onBind(intent: Intent?) = null
    override fun onDestroy() { running = false; handler.removeCallbacks(poll); sentReceiver?.let { runCatching { unregisterReceiver(it) } }; executor.shutdownNow(); super.onDestroy() }

    companion object {
        const val ACTION_START = "com.nanainter.smssender.START"
        const val ACTION_STOP = "com.nanainter.smssender.STOP"
        const val ACTION_STATUS = "com.nanainter.smssender.STATUS"
        const val EXTRA_SERVER = "server"
        const val EXTRA_DEVICE_NAME = "deviceName"
        const val EXTRA_STATUS = "status"
        const val EXTRA_COLOR = "color"
        private const val CHANNEL_ID = "nana_sms_connection"
        private const val NOTIFICATION_ID = 1001
        private const val PREFS_NAME = "nana_sms"
        private const val NEXT_SEND_AT_PREFIX = "next_send_at_"
        private const val MIN_SEND_INTERVAL_SECONDS = 4 * 60L
        private const val MAX_SEND_INTERVAL_SECONDS = 7 * 60L
    }
}
