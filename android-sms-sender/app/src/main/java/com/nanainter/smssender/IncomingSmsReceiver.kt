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
                    Telephony.Sms.Intents.getMessagesFromIntent(intent)
                } catch (_: Exception) {
                    emptyArray()
                }
                val sender = parts.firstNotNullOfOrNull { it.originatingAddress }
                val body = parts.joinToString("") { it.messageBody.orEmpty() }
                val timestamp = parts.minOfOrNull { it.timestampMillis } ?: System.currentTimeMillis()
                if (parts.isNotEmpty()) ActivitySync.uploadIncomingSmsFromBroadcast(context, sender, body, timestamp)
                else prefs.edit().putString("sms_last_direct_upload_result", "PDU parse 오류").apply()
            } finally { pending.finish() }
        }
    }

    companion object {
        private val executor = Executors.newSingleThreadExecutor()
    }
}
