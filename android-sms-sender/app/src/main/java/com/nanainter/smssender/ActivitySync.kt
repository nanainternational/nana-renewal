package com.nanainter.smssender

import android.Manifest
import android.content.Context
import android.content.Intent
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
import java.util.concurrent.atomic.AtomicBoolean

/** Uploads only SMS and call-log metadata; contacts, audio and microphone data are never read. */
object ActivitySync {
    private const val PREFS = "nana_sms"
    private const val INITIAL_WINDOW_MS = 30L * 24 * 60 * 60 * 1000
    private const val INITIAL_CAP = 1000
    private val syncing = AtomicBoolean(false)

    /** Returns false when another automatic, receiver, or manual sync is already running. */
    fun syncIfIdle(context: Context): Boolean {
        if (!syncing.compareAndSet(false, true)) return false
        val appContext = context.applicationContext
        val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val attemptAt = System.currentTimeMillis()
        prefs.edit().putLong("activity_last_attempt_at", attemptAt).apply()
        notifyStatus(appContext)
        try {
            val server = prefs.getString("server", "").orEmpty().trimEnd('/')
            if (!server.startsWith("https://") || BuildConfig.SMS_DEVICE_API_KEY.isBlank()) {
                throw IllegalStateException("앱 연결 설정을 확인해주세요")
            }
            val records = mutableListOf<JSONObject>()
            var smsMax = prefs.getLong("last_sms_sync_at", 0L)
            var callMax = prefs.getLong("last_call_sync_at", 0L)
            val initialSince = System.currentTimeMillis() - INITIAL_WINDOW_MS
            var smsCount = 0
            var callCount = 0
            var locallyRejected = 0

            if (appContext.checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED) {
                val since = if (smsMax > 0) smsMax else initialSince
                appContext.contentResolver.query(Telephony.Sms.CONTENT_URI,
                    arrayOf(Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.TYPE),
                    "${Telephony.Sms.DATE} > ? AND ${Telephony.Sms.TYPE} IN (?,?)",
                    arrayOf(since.toString(), Telephony.Sms.MESSAGE_TYPE_INBOX.toString(), Telephony.Sms.MESSAGE_TYPE_SENT.toString()),
                    "${Telephony.Sms.DATE} ASC LIMIT $INITIAL_CAP")?.use { cursor ->
                    while (cursor.moveToNext()) {
                        val at = cursor.getLong(3)
                        smsMax = maxOf(smsMax, at) // Invalid permanent rows must not pin the cursor.
                        val phone = normalizePhone(cursor.getString(1))
                        if (phone == null) { locallyRejected += 1; continue }
                        records += JSONObject().put("deviceRecordId", "sms:${cursor.getLong(0)}").put("recordType", "sms")
                            .put("direction", if (cursor.getInt(4) == Telephony.Sms.MESSAGE_TYPE_INBOX) "incoming" else "outgoing")
                            .put("phone", phone).put("message", cursor.getString(2).orEmpty().take(10_000))
                            .put("occurredAt", isoTime(at))
                        smsCount += 1
                    }
                }
            }
            if (appContext.checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
                val since = if (callMax > 0) callMax else initialSince
                appContext.contentResolver.query(CallLog.Calls.CONTENT_URI,
                    arrayOf(CallLog.Calls._ID, CallLog.Calls.NUMBER, CallLog.Calls.DATE, CallLog.Calls.DURATION, CallLog.Calls.TYPE),
                    "${CallLog.Calls.DATE} > ?", arrayOf(since.toString()), "${CallLog.Calls.DATE} ASC LIMIT $INITIAL_CAP")?.use { cursor ->
                    while (cursor.moveToNext()) {
                        val at = cursor.getLong(2)
                        callMax = maxOf(callMax, at)
                        val phone = normalizePhone(cursor.getString(1))
                        if (phone == null) { locallyRejected += 1; continue }
                        val direction = when (cursor.getInt(4)) {
                            CallLog.Calls.INCOMING_TYPE -> "incoming"; CallLog.Calls.OUTGOING_TYPE -> "outgoing"
                            CallLog.Calls.MISSED_TYPE -> "missed"; CallLog.Calls.REJECTED_TYPE -> "rejected"; else -> "other"
                        }
                        records += JSONObject().put("deviceRecordId", "call:${cursor.getLong(0)}").put("recordType", "call")
                            .put("direction", direction).put("phone", phone)
                            .put("callDurationSeconds", cursor.getInt(3).coerceAtLeast(0)).put("occurredAt", isoTime(at))
                        callCount += 1
                    }
                }
            }
            var serverRejected = 0
            records.chunked(100).forEach { serverRejected += upload(appContext, server, it) }
            // HTTP success (including per-record rejection) advances past inspected provider rows.
            val result = "문자 ${smsCount}건 / 전화 ${callCount}건 동기화" +
                if (locallyRejected + serverRejected > 0) " · 제외 ${locallyRejected + serverRejected}건" else ""
            prefs.edit().putLong("last_sms_sync_at", smsMax).putLong("last_call_sync_at", callMax)
                .putLong("activity_last_success_at", System.currentTimeMillis()).putString("activity_last_result", result)
                .remove("activity_last_error").apply()
            notifyStatus(appContext)
            return true
        } catch (error: Exception) {
            val safeError = when {
                error.message?.startsWith("서버 HTTP ") == true -> error.message
                error is java.net.SocketTimeoutException -> "네트워크 시간 초과"
                error is java.io.IOException -> "네트워크 연결 실패"
                else -> error.message?.take(100) ?: "알 수 없는 오류"
            }
            prefs.edit().putString("activity_last_error", safeError).apply()
            notifyStatus(appContext)
            throw error
        } finally {
            syncing.set(false)
        }
    }

    private fun normalizePhone(value: String?): String? {
        val digits = value.orEmpty().filter(Char::isDigit)
        return digits.takeIf { it.isNotEmpty() && it.length <= 30 }
    }

    private fun upload(context: Context, server: String, records: List<JSONObject>): Int {
        if (records.isEmpty()) return 0
        val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        val connection = URL("$server/api/sms-device/activity").openConnection() as HttpURLConnection
        connection.requestMethod = "POST"; connection.connectTimeout = 8000; connection.readTimeout = 8000; connection.doOutput = true
        connection.setRequestProperty("Authorization", "Bearer ${BuildConfig.SMS_DEVICE_API_KEY}")
        connection.setRequestProperty("Content-Type", "application/json")
        val array = JSONArray(); records.forEach(array::put)
        val body = JSONObject().put("deviceId", deviceId).put("records", array).toString().toByteArray()
        connection.outputStream.use { it.write(body) }
        val code = connection.responseCode
        val response = (if (code in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader()?.use { it.readText() }.orEmpty()
        connection.disconnect()
        if (code !in 200..299) throw IllegalStateException("서버 HTTP $code")
        return runCatching { JSONObject(response).optInt("rejected", 0) }.getOrDefault(0)
    }

    private fun notifyStatus(context: Context) {
        context.sendBroadcast(Intent(SmsPollingService.ACTION_ACTIVITY_SYNC_STATUS).setPackage(context.packageName))
    }

    private fun isoTime(value: Long) = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date(value))
}
