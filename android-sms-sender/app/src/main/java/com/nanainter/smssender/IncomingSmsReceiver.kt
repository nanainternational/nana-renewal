package com.nanainter.smssender

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import java.util.concurrent.Executors

class IncomingSmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return
        val prefs = context.getSharedPreferences("nana_sms", Context.MODE_PRIVATE)
        prefs.edit().putLong("sms_last_broadcast_at", System.currentTimeMillis()).apply()
        val pending = goAsync()
        executor.execute {
            try {
                val parts = try {
                    Telephony.Sms.Intents.getMessagesFromIntent(intent).also {
                        prefs.edit().putInt("sms_last_broadcast_parts", it.size)
                            .putString("sms_last_broadcast_parse_result", if (it.isNotEmpty()) "성공" else "실패").apply()
                    }
                } catch (_: Exception) {
                    prefs.edit().putInt("sms_last_broadcast_parts", 0).putString("sms_last_broadcast_parse_result", "실패").apply()
                    emptyArray()
                }
                val sender = parts.firstNotNullOfOrNull { it.originatingAddress }
                val body = parts.joinToString("") { it.messageBody.orEmpty() }
                val timestamp = parts.minOfOrNull { it.timestampMillis } ?: System.currentTimeMillis()
                if (parts.isNotEmpty()) ActivitySync.uploadIncomingSmsFromBroadcast(context, sender, body, timestamp)
                // Provider history remains the recovery path for a failed direct upload and sent SMS discovery.
                val fallback = Intent(context, SmsPollingService::class.java)
                    .setAction(SmsPollingService.ACTION_SYNC_ACTIVITY_NOW)
                runCatching {
                    if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(fallback)
                    else context.startService(fallback)
                }
            } finally { pending.finish() }
        }
    }

    companion object {
        private val executor = Executors.newSingleThreadExecutor()
    }
}
