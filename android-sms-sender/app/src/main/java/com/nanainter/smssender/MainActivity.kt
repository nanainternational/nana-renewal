package com.nanainter.smssender

import android.Manifest
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var server: EditText
    private lateinit var deviceName: EditText
    private lateinit var status: TextView
    private val deviceId by lazy { Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) }
    private val statusReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            showStatus(intent?.getStringExtra(SmsPollingService.EXTRA_STATUS) ?: return,
                intent.getIntExtra(SmsPollingService.EXTRA_COLOR, Color.GRAY))
        }
    }

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
        buttons.addView(Button(this).apply { text = "연결 중지"; setOnClickListener { stopConnection() } }, LinearLayout.LayoutParams(0, -2, 1f))
        root.addView(buttons)
        status = TextView(this).apply { text = if (prefs.getBoolean("running", false)) "● 서버 연결 중..." else "● 연결 대기"; textSize = 17f; setTextColor(Color.GRAY); setPadding(16, 24, 16, 24) }; root.addView(status)
        setContentView(root)
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter(SmsPollingService.ACTION_STATUS)
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(statusReceiver, filter, RECEIVER_NOT_EXPORTED)
        else @Suppress("DEPRECATION") registerReceiver(statusReceiver, filter)
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
        if (code == 100 && results.isNotEmpty() && results.all { it == PackageManager.PERMISSION_GRANTED }) startConnection()
        else showStatus("SMS 및 알림 권한이 필요합니다.", Color.RED)
    }

    private fun stopConnection() {
        getSharedPreferences("nana_sms", MODE_PRIVATE).edit().putBoolean("running", false).apply()
        startService(Intent(this, SmsPollingService::class.java).setAction(SmsPollingService.ACTION_STOP))
        showStatus("연결이 중지되었습니다.", Color.GRAY)
    }

    private fun showStatus(text: String, color: Int) { status.text = text; status.setTextColor(color) }
}
