package com.nanainter.smssender

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.provider.CallLog
import android.provider.Settings
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.atomic.AtomicBoolean

/** Uploads only SMS and call-log metadata; contacts, audio and microphone data are never read. */
object ActivitySync {
    private const val TAG = "ActivitySync"
    private const val PREFS = "nana_sms"
    private const val INITIAL_WINDOW_MS = 30L * 24 * 60 * 60 * 1000
    private const val FUTURE_TOLERANCE_MS = 5L * 60 * 1000
    private const val INITIAL_CAP = 1000
    private const val SENT_CURSOR = "last_sms_sent_sync_at"
    private val syncing = AtomicBoolean(false)

    private data class ScanResult(val records: List<JSONObject>, val maxTimestamp: Long)

    /** Immediately uploads one logical SMS assembled from an SMS_RECEIVED broadcast. */
    fun uploadIncomingSmsFromBroadcast(context: Context, sender: String?, message: String, timestampMillis: Long): Boolean {
        val appContext = context.applicationContext
        val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        prefs.edit().putLong("sms_last_direct_upload_at", now).apply()
        val phone = normalizePhone(sender)
        if (phone == null) {
            prefs.edit().putString("sms_last_direct_upload_result", "invalid sender").apply()
            notifyStatus(appContext)
            return false
        }
        if (timestampMillis > now + 5 * 60_000L) {
            prefs.edit().putString("sms_last_direct_upload_result", "미래 시간 제외").apply()
            notifyStatus(appContext)
            return false
        }
        val server = prefs.getString("server", "").orEmpty().trimEnd('/')
        if (!server.startsWith("https://") || BuildConfig.SMS_DEVICE_API_KEY.isBlank()) {
            prefs.edit().putString("sms_last_direct_upload_result", "연결 설정 오류").apply()
            notifyStatus(appContext)
            return false
        }
        val body = message.take(10_000)
        val record = JSONObject().put("deviceRecordId", "rx:" + sha256("$phone\u0000$timestampMillis\u0000$body"))
            .put("recordType", "sms").put("direction", "incoming").put("phone", phone)
            .put("message", body).put("occurredAt", isoTime(timestampMillis))
        return try {
            if (upload(appContext, server, listOf(record)) > 0) {
                prefs.edit().putString("sms_last_direct_upload_result", "서버에서 제외").apply()
                notifyStatus(appContext)
                return false
            }
            prefs.edit().putLong("activity_last_incoming_sms_at", now)
                .putString("sms_last_direct_upload_result", "성공").apply()
            notifyStatus(appContext)
            true
        } catch (error: Exception) {
            prefs.edit().putString("sms_last_direct_upload_result", safeNetworkError(error)).apply()
            notifyStatus(appContext)
            false
        }
    }

    /** Returns false when another automatic, receiver, or manual sync is already running. */
    fun syncIfIdle(context: Context): Boolean {
        if (!syncing.compareAndSet(false, true)) {
            return false
        }
        val appContext = context.applicationContext
        val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        var stage = "prepare"
        try {
            val now = System.currentTimeMillis()
            val initialSince = now - INITIAL_WINDOW_MS
            val server = prefs.getString("server", "").orEmpty().trimEnd('/')
            if (!server.startsWith("https://") || BuildConfig.SMS_DEVICE_API_KEY.isBlank()) throw IllegalStateException("앱 연결 설정을 확인해주세요")
            val sentSince = prefs.getLong(SENT_CURSOR, 0L).takeIf { it in 1..latestTimestamp(now) } ?: initialSince
            val callSince = prefs.getLong("last_call_sync_at", 0L).takeIf { it > 0 } ?: initialSince
            val latestAllowedAt = now + FUTURE_TOLERANCE_MS
            stage = "sent_scan"
            val sentSms = if (appContext.checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED)
                scanSentSms(appContext, sentSince, latestAllowedAt) else ScanResult(emptyList(), sentSince)
            stage = "call_scan"
            val calls = if (appContext.checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED)
                scanCalls(appContext, callSince, latestAllowedAt) else ScanResult(emptyList(), callSince)

            stage = "upload"
            val records = sentSms.records + calls.records
            if (records.isEmpty()) {
                upload(appContext, server, emptyList())
            } else records.chunked(100).forEach { chunk ->
                upload(appContext, server, chunk)
            }

            stage = "persist"
            val editor = prefs.edit().putLong("activity_last_success_at", System.currentTimeMillis())
                .remove("activity_last_error")
            if (prefs.getString("sms_last_sent_error", null) == null) editor.putLong(SENT_CURSOR, sentSms.maxTimestamp)
            if (prefs.getString("call_last_error", null) == null) editor.putLong("last_call_sync_at", calls.maxTimestamp)
            editor.apply()
            notifyStatus(appContext)
            return true
        } catch (error: Exception) {
            val safeError = safeNetworkError(error)
            Log.e(TAG, "sync failed stage=$stage type=${error.javaClass.simpleName} message=$safeError")
            prefs.edit().putString("activity_last_error", safeError).apply()
            notifyStatus(appContext)
            throw error
        } finally { syncing.set(false) }
    }

    private fun latestTimestamp(now: Long) = now + FUTURE_TOLERANCE_MS

    private fun scanSentSms(context: Context, since: Long, latestAllowedAt: Long): ScanResult {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        var inspected = 0
        var rejected = 0
        var maxTimestamp = since
        val records = mutableListOf<JSONObject>()
        try {
            val cursor = context.contentResolver.query(
                Telephony.Sms.Sent.CONTENT_URI,
                arrayOf(Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
                "${Telephony.Sms.DATE} > ?", arrayOf(since.toString()), "${Telephony.Sms.DATE} ASC",
            ) ?: throw IllegalArgumentException("null cursor")
            cursor.use {
                while (inspected < INITIAL_CAP && it.moveToNext()) {
                    inspected++
                    val at = it.getLong(3)
                    if (at > latestAllowedAt) { rejected++; continue }
                    maxTimestamp = maxOf(maxTimestamp, at)
                    val phone = normalizePhone(it.getString(1))
                    if (phone == null) { rejected++; continue }
                    records += JSONObject().put("deviceRecordId", "sms:${it.getLong(0)}")
                        .put("recordType", "sms").put("direction", "outgoing").put("phone", phone)
                        .put("message", it.getString(2).orEmpty().take(10_000)).put("occurredAt", isoTime(at))
                }
            }
            prefs.edit().putLong("sms_last_sent_scan_at", System.currentTimeMillis())
                .putInt("sms_last_sent_inspected", inspected).putInt("sms_last_sent_valid", records.size)
                .putInt("sms_last_sent_rejected", rejected).remove("sms_last_sent_error").apply()
        } catch (error: Exception) {
            val kind = if (error is SecurityException) "권한 오류" else "Provider query 오류"
            prefs.edit().putString("sms_last_sent_error", kind).apply()
            Log.w(TAG, "Sent SMS scan failed: ${error.javaClass.simpleName}")
            return ScanResult(emptyList(), since)
        }
        return ScanResult(records, maxTimestamp)
    }

    private fun scanCalls(context: Context, since: Long, latestAllowedAt: Long): ScanResult {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        var inspected = 0; var rejected = 0; var maxTimestamp = since
        val records = mutableListOf<JSONObject>()
        try {
            val cursor = context.contentResolver.query(CallLog.Calls.CONTENT_URI,
                arrayOf(CallLog.Calls._ID, CallLog.Calls.NUMBER, CallLog.Calls.DATE, CallLog.Calls.DURATION, CallLog.Calls.TYPE),
                "${CallLog.Calls.DATE} > ?", arrayOf(since.toString()), "${CallLog.Calls.DATE} ASC")
                ?: throw IllegalArgumentException("null cursor")
            cursor.use { value: Cursor ->
                while (inspected < INITIAL_CAP && value.moveToNext()) {
                    inspected++
                    val at = value.getLong(2)
                    if (at > latestAllowedAt) { rejected++; continue }
                    maxTimestamp = maxOf(maxTimestamp, at)
                    val phone = normalizePhone(value.getString(1))
                    if (phone == null) { rejected++; continue }
                    val direction = when (value.getInt(4)) {
                        CallLog.Calls.INCOMING_TYPE -> "incoming"; CallLog.Calls.OUTGOING_TYPE -> "outgoing"
                        CallLog.Calls.MISSED_TYPE -> "missed"; CallLog.Calls.REJECTED_TYPE -> "rejected"; else -> "other"
                    }
                    records += JSONObject().put("deviceRecordId", "call:${value.getLong(0)}").put("recordType", "call")
                        .put("direction", direction).put("phone", phone).put("callDurationSeconds", value.getInt(3).coerceAtLeast(0))
                        .put("occurredAt", isoTime(at))
                }
            }
            prefs.edit().putLong("call_last_scan_at", System.currentTimeMillis())
                .putInt("call_last_inspected", inspected).putInt("call_last_valid", records.size)
                .remove("call_last_error").apply()
        } catch (error: Exception) {
            val kind = if (error is SecurityException) "권한 오류" else "Provider query 오류"
            prefs.edit().putString("call_last_error", kind).apply()
            Log.w(TAG, "CallLog scan failed: ${error.javaClass.simpleName}")
            return ScanResult(emptyList(), since)
        }
        return ScanResult(records, maxTimestamp)
    }

    private fun normalizePhone(value: String?): String? {
        val digits = value.orEmpty().filter(Char::isDigit)
        return digits.takeIf { it.isNotEmpty() && it.length <= 30 }
    }
    private fun sha256(value: String) = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8)).joinToString("") {
        (it.toInt() and 0xff).toString(16).padStart(2, '0')
    }
    private fun upload(context: Context, server: String, records: List<JSONObject>): Int {
        val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        val connection = URL("$server/api/sms-device/activity").openConnection() as HttpURLConnection
        connection.requestMethod = "POST"; connection.connectTimeout = 8000; connection.readTimeout = 8000; connection.doOutput = true
        connection.setRequestProperty("Authorization", "Bearer ${BuildConfig.SMS_DEVICE_API_KEY}")
        connection.setRequestProperty("Content-Type", "application/json")
        val array = JSONArray(); records.forEach(array::put)
        connection.outputStream.use { it.write(JSONObject().put("deviceId", deviceId).put("records", array).toString().toByteArray()) }
        val code = connection.responseCode
        val response = (if (code in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
        connection.disconnect()
        if (code !in 200..299) throw IllegalStateException("서버 HTTP $code")
        return runCatching { JSONObject(response).optInt("rejected", 0) }.getOrDefault(0)
    }
    private fun safeNetworkError(error: Exception) = when {
        error.message?.startsWith("서버 HTTP ") == true -> error.message!!
        error is java.net.SocketTimeoutException -> "network timeout"
        error is java.io.IOException -> "network error"
        else -> "알 수 없는 오류"
    }
    private fun notifyStatus(context: Context) { context.sendBroadcast(Intent(SmsPollingService.ACTION_ACTIVITY_SYNC_STATUS).setPackage(context.packageName)) }
    private fun isoTime(value: Long) = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date(value))
}
