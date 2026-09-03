package com.nanainter.smssender

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import android.provider.Settings
import android.provider.Telephony
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Uploads only SMS and call-log metadata; contacts, audio and microphone data are never read. */
object ActivitySync {
    private const val PREFS = "nana_sms"
    private const val INITIAL_WINDOW_MS = 30L * 24 * 60 * 60 * 1000
    private const val INITIAL_CAP = 1000

    fun sync(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val server = prefs.getString("server", "").orEmpty().trimEnd('/')
        if (!server.startsWith("https://") || BuildConfig.SMS_DEVICE_API_KEY.isBlank()) return
        val records = mutableListOf<JSONObject>()
        var smsMax = prefs.getLong("last_sms_sync_at", 0L)
        var callMax = prefs.getLong("last_call_sync_at", 0L)
        val initialSince = System.currentTimeMillis() - INITIAL_WINDOW_MS

        if (context.checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED) {
            val since = if (smsMax > 0) smsMax else initialSince
            context.contentResolver.query(Telephony.Sms.CONTENT_URI,
                arrayOf(Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.TYPE),
                "${Telephony.Sms.DATE} > ? AND ${Telephony.Sms.TYPE} IN (?,?)",
                arrayOf(since.toString(), Telephony.Sms.MESSAGE_TYPE_INBOX.toString(), Telephony.Sms.MESSAGE_TYPE_SENT.toString()),
                "${Telephony.Sms.DATE} ASC LIMIT $INITIAL_CAP")?.use { cursor ->
                while (cursor.moveToNext()) {
                    val at = cursor.getLong(3); smsMax = maxOf(smsMax, at)
                    records += JSONObject().put("deviceRecordId", "sms:${cursor.getLong(0)}").put("recordType", "sms")
                        .put("direction", if (cursor.getInt(4) == Telephony.Sms.MESSAGE_TYPE_INBOX) "incoming" else "outgoing")
                        .put("phone", cursor.getString(1).orEmpty()).put("message", cursor.getString(2).orEmpty())
                        .put("occurredAt", isoTime(at))
                }
            }
        }
        if (context.checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
            val since = if (callMax > 0) callMax else initialSince
            context.contentResolver.query(CallLog.Calls.CONTENT_URI,
                arrayOf(CallLog.Calls._ID, CallLog.Calls.NUMBER, CallLog.Calls.DATE, CallLog.Calls.DURATION, CallLog.Calls.TYPE),
                "${CallLog.Calls.DATE} > ?", arrayOf(since.toString()), "${CallLog.Calls.DATE} ASC LIMIT $INITIAL_CAP")?.use { cursor ->
                while (cursor.moveToNext()) {
                    val direction = when (cursor.getInt(4)) {
                        CallLog.Calls.INCOMING_TYPE -> "incoming"; CallLog.Calls.OUTGOING_TYPE -> "outgoing"
                        CallLog.Calls.MISSED_TYPE -> "missed"; CallLog.Calls.REJECTED_TYPE -> "rejected"; else -> "other"
                    }
                    val at = cursor.getLong(2); callMax = maxOf(callMax, at)
                    records += JSONObject().put("deviceRecordId", "call:${cursor.getLong(0)}").put("recordType", "call")
                        .put("direction", direction).put("phone", cursor.getString(1).orEmpty())
                        .put("callDurationSeconds", cursor.getInt(3)).put("occurredAt", isoTime(at))
                }
            }
        }
        records.chunked(100).forEach { upload(context, server, it) }
        // Cursors advance only after every upload succeeds, so a network failure is retried next time.
        prefs.edit().putLong("last_sms_sync_at", smsMax).putLong("last_call_sync_at", callMax).apply()
    }

    private fun upload(context: Context, server: String, records: List<JSONObject>) {
        if (records.isEmpty()) return
        val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        val connection = URL("$server/api/sms-device/activity").openConnection() as HttpURLConnection
        connection.requestMethod = "POST"; connection.connectTimeout = 8000; connection.readTimeout = 8000; connection.doOutput = true
        connection.setRequestProperty("Authorization", "Bearer ${BuildConfig.SMS_DEVICE_API_KEY}")
        connection.setRequestProperty("Content-Type", "application/json")
        val array = JSONArray(); records.forEach(array::put)
        val body = JSONObject().put("deviceId", deviceId).put("records", array).toString().toByteArray()
        connection.outputStream.use { it.write(body) }
        val code = connection.responseCode
        (if (code in 200..299) connection.inputStream else connection.errorStream)?.close()
        connection.disconnect()
        if (code !in 200..299) throw IllegalStateException("activity upload HTTP $code")
    }

    private fun isoTime(value: Long) = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date(value))
}
