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
        val pending = goAsync()
        executor.execute {
            try {
                val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                val sender = parts.firstNotNullOfOrNull { it.originatingAddress }
                val body = parts.joinToString("") { it.messageBody.orEmpty() }
                val timestamp = parts.minOfOrNull { it.timestampMillis } ?: System.currentTimeMillis()
                runCatching { ActivitySync.uploadIncomingSmsFromBroadcast(context, sender, body, timestamp) }
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
