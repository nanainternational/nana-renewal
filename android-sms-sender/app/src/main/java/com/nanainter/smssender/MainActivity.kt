package com.nanainter.smssender

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var server: EditText
    private lateinit var deviceName: EditText
    private lateinit var status: TextView
    private lateinit var activityPermissionStatus: TextView
    private val deviceId by lazy { Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) }
    private val statusReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == SmsPollingService.ACTION_ACTIVITY_SYNC_STATUS) {
                updateActivityPermissionStatus()
                return
            }
            showStatus(intent?.getStringExtra(SmsPollingService.EXTRA_STATUS) ?: return,
                intent.getIntExtra(SmsPollingService.EXTRA_COLOR, Color.GRAY))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("nana_sms", MODE_PRIVATE)
        val scrollView = ScrollView(this).apply { isFillViewport = true }
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48, 72, 48, 48); setBackgroundColor(Color.WHITE) }
        fun label(text: String) = TextView(this).apply { this.text = text; textSize = 14f; setTextColor(Color.DKGRAY); setPadding(0, 24, 0, 6) }
        root.addView(TextView(this).apply { text = "Nana SMS Sender"; textSize = 28f; setTextColor(Color.BLACK) })
        root.addView(label("서버")); server = EditText(this).apply { setText(prefs.getString("server", "https://nanainter.com")); hint = "https://nanainter.com" }; root.addView(server)
        root.addView(label("단말기")); deviceName = EditText(this).apply { setText(prefs.getString("name", "업무폰1")); hint = "업무폰1" }; root.addView(deviceName)
        root.addView(label("Device ID")); root.addView(TextView(this).apply { text = deviceId; setTextIsSelectable(true); textSize = 15f })
        val buttons = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0, 32, 0, 24) }
        buttons.addView(Button(this).apply { text = "서버 연결 시작"; setOnClickListener { startConnection() } }, LinearLayout.LayoutParams(0, -2, 1f))
        buttons.addView(Button(this).apply { text = "연결 중지"; setOnClickListener { stopConnection() } }, LinearLayout.LayoutParams(0, -2, 1f))
        root.addView(buttons)
        status = TextView(this).apply { text = if (prefs.getBoolean("running", false)) "● 서버 연결 중..." else "● 연결 대기"; textSize = 17f; setTextColor(Color.GRAY); setPadding(16, 24, 16, 24) }; root.addView(status)
        root.addView(label("통신이력"))
        activityPermissionStatus = TextView(this).apply { textSize = 14f; setTextColor(Color.DKGRAY); setPadding(0, 8, 0, 8) }; root.addView(activityPermissionStatus)
        root.addView(Button(this).apply { text = "권한 설정"; setOnClickListener { requestActivityPermissions() } })
        root.addView(Button(this).apply { text = "지금 동기화"; setOnClickListener { syncActivityNow() } })
        root.addView(Button(this).apply { text = "상세 진단 보기"; setOnClickListener { showActivityDiagnostics() } })
        root.addView(TextView(this).apply {
            text = "화면이 꺼져 있어도 안정적으로 발송하려면 설정 > 애플리케이션 > Nana SMS Sender > 배터리에서 '제한 없음'으로 설정해주세요."
            textSize = 14f
            setTextColor(Color.DKGRAY)
            setPadding(0, 24, 0, 8)
        })
        root.addView(Button(this).apply { text = "배터리 설정 열기"; setOnClickListener { openBatterySettings() } })
        scrollView.addView(root, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT))
        setContentView(scrollView)
        updateActivityPermissionStatus()
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter().apply {
            addAction(SmsPollingService.ACTION_STATUS)
            addAction(SmsPollingService.ACTION_ACTIVITY_SYNC_STATUS)
        }
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(statusReceiver, filter, RECEIVER_NOT_EXPORTED)
        else @Suppress("DEPRECATION") registerReceiver(statusReceiver, filter)
        updateActivityPermissionStatus()
    }

    override fun onStop() {
        runCatching { unregisterReceiver(statusReceiver) }
        super.onStop()
    }

    private fun startConnection() {
        val missing = mutableListOf<String>()
        if (checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) missing += Manifest.permission.SEND_SMS
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) missing += Manifest.permission.POST_NOTIFICATIONS
        if (missing.isNotEmpty()) { requestPermissions(missing.toTypedArray(), 100); return }
        if (BuildConfig.SMS_DEVICE_API_KEY.isBlank()) { showStatus("설정 오류: SMS_DEVICE_API_KEY가 없습니다.", Color.RED); return }
        val base = server.text.toString().trim().trimEnd('/')
        val name = deviceName.text.toString().trim()
        if (!base.startsWith("https://") || name.isBlank()) { showStatus("HTTPS 서버 주소와 단말기 이름을 확인하세요.", Color.RED); return }
        getSharedPreferences("nana_sms", MODE_PRIVATE).edit().putString("server", base).putString("name", name).putBoolean("running", true).apply()
        val intent = Intent(this, SmsPollingService::class.java).setAction(SmsPollingService.ACTION_START)
            .putExtra(SmsPollingService.EXTRA_SERVER, base).putExtra(SmsPollingService.EXTRA_DEVICE_NAME, name)
        startForegroundService(intent)
        showStatus("● 서버 연결 중...", Color.rgb(37, 99, 235))
    }

    override fun onRequestPermissionsResult(code: Int, permissions: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(code, permissions, results)
        if (code == 100) {
            if (results.isNotEmpty() && results.all { it == PackageManager.PERMISSION_GRANTED }) startConnection()
            else showStatus("SMS 및 알림 권한이 필요합니다.", Color.RED)
        }
        if (code == 200) updateActivityPermissionStatus()
    }

    private fun requestActivityPermissions() {
        val permissions = arrayOf(Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_CALL_LOG)
            .filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (permissions.isNotEmpty()) requestPermissions(permissions.toTypedArray(), 200) else updateActivityPermissionStatus()
    }

    private fun updateActivityPermissionStatus() {
        if (!::activityPermissionStatus.isInitialized) return
        val smsAllowed = checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED &&
            checkSelfPermission(Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        val callsAllowed = checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
        val prefs = getSharedPreferences("nana_sms", MODE_PRIVATE)
        val success = formatSyncTime(prefs.getLong("activity_last_success_at", 0L))
        val incomingAt = prefs.getLong("activity_last_incoming_sms_at", 0L)
        activityPermissionStatus.text = "문자 수신 권한    ${if (smsAllowed) "허용됨" else "필요"}\n" +
            "전화기록 권한     ${if (callsAllowed) "허용됨" else "필요"}\n\n" +
            "최근 동기화:\n$success\n\n최근 수신 SMS:\n${if (incomingAt > 0) formatSyncTime(incomingAt) else "아직 수신 없음"}"
    }

    private fun syncActivityNow() {
        if (checkSelfPermission(Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) { requestActivityPermissions(); return }
        startForegroundService(Intent(this, SmsPollingService::class.java).setAction(SmsPollingService.ACTION_SYNC_ACTIVITY_NOW))
    }

    private fun showActivityDiagnostics() {
        val prefs = getSharedPreferences("nana_sms", MODE_PRIVATE)
        val parts = prefs.getInt("sms_last_broadcast_parts", 0)
        val callScan = "${formatSyncTime(prefs.getLong("call_last_scan_at", 0L))} · 검사 ${prefs.getInt("call_last_inspected", 0)}건 · 유효 ${prefs.getInt("call_last_valid", 0)}건"
        AlertDialog.Builder(this).setTitle("통신이력 상세 진단").setMessage(
            "마지막 SMS_RECEIVED 이벤트: ${formatSyncTime(prefs.getLong("sms_last_broadcast_at", 0L))}\n" +
                "PDU part 수: $parts\n" +
                "PDU parse 결과: ${prefs.getString("sms_last_broadcast_parse_result", "-")}\n" +
                "직접 업로드 결과: ${prefs.getString("sms_last_direct_upload_result", "-")}\n" +
                "마지막 CallLog scan: $callScan\n" +
                "마지막 sync error: ${prefs.getString("activity_last_error", "-")}")
            .setPositiveButton("확인", null).show()
    }

    private fun formatSyncTime(value: Long) = if (value <= 0) "-" else
        SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.KOREA).format(Date(value))

    private fun stopConnection() {
        getSharedPreferences("nana_sms", MODE_PRIVATE).edit().putBoolean("running", false).apply()
        startService(Intent(this, SmsPollingService::class.java).setAction(SmsPollingService.ACTION_STOP))
        showStatus("연결이 중지되었습니다.", Color.GRAY)
    }

    private fun openBatterySettings() {
        val batterySettings = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
        if (batterySettings.resolveActivity(packageManager) != null && runCatching { startActivity(batterySettings) }.isSuccess) return
        startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
    }

    private fun showStatus(text: String, color: Int) { status.text = text; status.setTextColor(color) }
}
