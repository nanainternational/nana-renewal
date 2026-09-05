package com.nanainter.smssender

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import java.util.concurrent.Executors

class IncomingSmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return
        val prefs = context.getSharedPreferences("nana_sms", Context.MODE_PRIVATE)
        // Record receipt before parsing so even malformed/vendor-specific PDUs are diagnosable.
        prefs.edit().putLong("sms_last_broadcast_at", System.currentTimeMillis()).apply()
        val pending = goAsync()
        executor.execute {
            try {
                val parts = try {
                    Telephony.Sms.Intents.getMessagesFromIntent(intent).also {
                        prefs.edit().putInt("sms_last_broadcast_parts", it.size)
                            .putString("sms_last_broadcast_parse_result", if (it.isNotEmpty()) "성공" else "실패").apply()
                    }
                } catch (error: Exception) {
                    prefs.edit().putInt("sms_last_broadcast_parts", 0)
                        .putString("sms_last_broadcast_parse_result", "실패: ${error.javaClass.simpleName}").apply()
                    emptyArray()
                }
                val sender = parts.firstNotNullOfOrNull { it.originatingAddress }
                val body = parts.joinToString("") { it.messageBody.orEmpty() }
                val timestamp = parts.minOfOrNull { it.timestampMillis } ?: System.currentTimeMillis()
                if (parts.isNotEmpty()) ActivitySync.uploadIncomingSmsFromBroadcast(context, sender, body, timestamp)
            } finally { pending.finish() }
        }
    }

    companion object {
        private val executor = Executors.newSingleThreadExecutor()
    }
}
