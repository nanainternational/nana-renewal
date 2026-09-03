package com.nanainter.smssender

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.util.concurrent.Executors

class IncomingSmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return
        // The provider combines multipart PDUs into one persisted SMS row; trigger an immediate provider sync.
        val pending = goAsync()
        executor.execute {
            try {
                Thread.sleep(1500) // Allow the system SMS provider to persist and combine multipart PDUs.
                ActivitySync.syncIfIdle(context.applicationContext)
            } finally { pending.finish() }
        }
    }

    companion object {
        private val executor = Executors.newSingleThreadExecutor()
    }
}
