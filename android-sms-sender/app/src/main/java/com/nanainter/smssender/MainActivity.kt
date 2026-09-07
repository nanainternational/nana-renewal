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
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var status: TextView
    private lateinit var deviceName: TextView
    private lateinit var activityStatus: TextView
    private lateinit var connectionButton: Button
    private val deviceId by lazy { Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) }
    private val statusReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == SmsPollingService.ACTION_ACTIVITY_SYNC_STATUS) {
                updateScreen()
                return
            }
            showStatus(intent?.getStringExtra(SmsPollingService.EXTRA_STATUS) ?: return,
                intent.getIntExtra(SmsPollingService.EXTRA_COLOR, Color.GRAY))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val scrollView = ScrollView(this).apply { isFillViewport = true }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 72, 48, 48)
            setBackgroundColor(Color.WHITE)
        }
        fun label(text: String) = TextView(this).apply {
            this.text = text
            textSize = 14f
            setTextColor(Color.DKGRAY)
            setPadding(0, 24, 0, 6)
        }
        root.addView(TextView(this).apply { text = "Nana SMS Sender"; textSize = 28f; setTextColor(Color.BLACK) })
        status = TextView(this).apply { textSize = 17f; setPadding(0, 28, 0, 12) }
        root.addView(status)
        deviceName = TextView(this).apply { textSize = 20f; setTextColor(Color.BLACK); setPadding(0, 12, 0, 12) }
        root.addView(deviceName)
        root.addView(label("통신이력"))
        activityStatus = TextView(this).apply { textSize = 15f; setTextColor(Color.DKGRAY); setPadding(0, 8, 0, 20) }
        root.addView(activityStatus)
        val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        actions.addView(Button(this).apply { text = "권한 설정"; setOnClickListener { requestActivityPermissions(200) } }, LinearLayout.LayoutParams(0, -2, 1f))
        connectionButton = Button(this).apply { setOnClickListener { toggleConnection() } }
        actions.addView(connectionButton, LinearLayout.LayoutParams(0, -2, 1f))
        root.addView(actions)
        root.addView(Button(this).apply { text = "상세 진단"; setOnClickListener { showActivityDiagnostics() } })
        root.addView(Button(this).apply { text = "배터리 설정"; setOnClickListener { openBatterySettings() } })
        scrollView.addView(root, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT))
        setContentView(scrollView)
        updateScreen()
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter().apply {
            addAction(SmsPollingService.ACTION_STATUS)
            addAction(SmsPollingService.ACTION_ACTIVITY_SYNC_STATUS)
        }
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(statusReceiver, filter, RECEIVER_NOT_EXPORTED)
        else @Suppress("DEPRECATION") registerReceiver(statusReceiver, filter)
        updateScreen()
    }

    override fun onStop() {
        runCatching { unregisterReceiver(statusReceiver) }
        super.onStop()
    }

    private fun requiredPermissions(): List<String> = buildList {
        add(Manifest.permission.SEND_SMS)
        add(Manifest.permission.RECEIVE_SMS)
        add(Manifest.permission.READ_SMS)
        add(Manifest.permission.READ_CALL_LOG)
        if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
    }

    private fun requestActivityPermissions(code: Int) {
        val missing = requiredPermissions().filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) requestPermissions(missing.toTypedArray(), code) else updateScreen()
    }

    private fun toggleConnection() {
        if (getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean("running", false)) stopConnection() else startConnection()
    }

    private fun startConnection() {
        val missing = requiredPermissions().filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) { requestPermissions(missing.toTypedArray(), 100); return }
        if (BuildConfig.SMS_DEVICE_API_KEY.isBlank()) { showStatus("설정 오류: API 키가 없습니다.", Color.RED); return }
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        val server = prefs.getString("server", DEFAULT_SERVER).orEmpty().trim().trimEnd('/')
        val name = prefs.getString("name", DEFAULT_DEVICE_NAME).orEmpty().trim()
        if (!server.startsWith("https://") || name.isBlank()) { showStatus("연결 설정을 확인하세요.", Color.RED); return }
        prefs.edit().putString("server", server).putString("name", name).putBoolean("running", true).apply()
        startForegroundService(Intent(this, SmsPollingService::class.java).setAction(SmsPollingService.ACTION_START)
            .putExtra(SmsPollingService.EXTRA_SERVER, server).putExtra(SmsPollingService.EXTRA_DEVICE_NAME, name))
        showStatus("● 서버 연결 중\n문자 발송 대기 중", Color.rgb(37, 99, 235))
        updateScreen()
    }

    override fun onRequestPermissionsResult(code: Int, permissions: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(code, permissions, results)
        if (code == 100 && results.isNotEmpty() && results.all { it == PackageManager.PERMISSION_GRANTED }) startConnection()
        updateScreen()
    }

    private fun updateScreen() {
        if (!::activityStatus.isInitialized) return
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        val running = prefs.getBoolean("running", false)
        deviceName.text = prefs.getString("name", DEFAULT_DEVICE_NAME)
        connectionButton.text = if (running) "연결 중지" else "서버 연결 시작"
        if (running) showStatus("● 서버 연결됨\n문자 발송 대기 중", Color.rgb(5, 150, 105))
        else showStatus("● 연결 대기", Color.GRAY)

        val receiveState = when {
            checkSelfPermission(Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED -> "권한 필요"
            prefs.getLong("activity_last_incoming_sms_at", 0L) > 0 -> "정상"
            else -> "준비됨"
        }
        val sentState = providerState(Manifest.permission.READ_SMS, "sms_last_sent_scan_at", "sms_last_sent_error")
        val callState = providerState(Manifest.permission.READ_CALL_LOG, "call_last_scan_at", "call_last_error")
        activityStatus.text = "문자 수신       $receiveState\n문자 발신 이력  $sentState\n전화 이력       $callState\n\n" +
            "최근 동기화\n${formatTime(prefs.getLong("activity_last_success_at", 0L))}"
    }

    private fun providerState(permission: String, scanKey: String, errorKey: String): String {
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        return when {
            checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED -> "권한 필요"
            prefs.getString(errorKey, null) != null -> "오류"
            prefs.getLong(scanKey, 0L) <= 0 -> "확인 전"
            else -> "정상"
        }
    }

    private fun showActivityDiagnostics() {
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        AlertDialog.Builder(this).setTitle("상세 진단").setMessage(
            "서버 주소: ${prefs.getString("server", DEFAULT_SERVER)}\n" +
                "Device ID: $deviceId\n" +
                "최근 activity sync: ${formatTime(prefs.getLong("activity_last_success_at", 0L))}\n\n" +
                "SMS 수신\n마지막 이벤트: ${formatTime(prefs.getLong("sms_last_broadcast_at", 0L))}\n" +
                "마지막 업로드: ${prefs.getString("sms_last_direct_upload_result", "-")}\n\n" +
                "SMS 발신\n${scanDiagnostics(prefs, "sms_last_sent")}\n\n" +
                "전화\n${scanDiagnostics(prefs, "call_last", includeRejected = false)}\n\n" +
                "마지막 sync error: ${prefs.getString("activity_last_error", "-")}")
            .setPositiveButton("확인", null).show()
    }

    private fun scanDiagnostics(prefs: android.content.SharedPreferences, prefix: String, includeRejected: Boolean = true): String {
        val rejected = if (includeRejected) "\n제외: ${prefs.getInt("${prefix}_rejected", 0)}건" else ""
        return "마지막 scan: ${formatTime(prefs.getLong("${prefix}_scan_at", 0L))}\n" +
            "검사: ${prefs.getInt("${prefix}_inspected", 0)}건\n유효: ${prefs.getInt("${prefix}_valid", 0)}건$rejected\n" +
            "오류: ${prefs.getString("${prefix}_error", "-")}"
    }

    private fun stopConnection() {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("running", false).apply()
        startService(Intent(this, SmsPollingService::class.java).setAction(SmsPollingService.ACTION_STOP))
        updateScreen()
    }

    private fun openBatterySettings() {
        val batterySettings = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
        if (batterySettings.resolveActivity(packageManager) != null && runCatching { startActivity(batterySettings) }.isSuccess) return
        startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
    }

    private fun formatTime(value: Long) = if (value <= 0) "-" else SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.KOREA).format(Date(value))
    private fun showStatus(text: String, color: Int) { status.text = text; status.setTextColor(color) }

    companion object {
        private const val PREFS = "nana_sms"
        private const val DEFAULT_SERVER = "https://nanainter.com"
        private const val DEFAULT_DEVICE_NAME = "업무폰1"
    }
}
