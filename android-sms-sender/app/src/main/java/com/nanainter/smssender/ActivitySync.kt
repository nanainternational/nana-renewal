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
    private val syncing = AtomicBoolean(false)

    private data class ScanResult(val records: List<JSONObject>, val maxTimestamp: Long, val inspected: Int, val rejected: Int)

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
            Log.i(TAG, "sync skipped: already running")
            return false
        }
        val appContext = context.applicationContext
        val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val attemptAt = System.currentTimeMillis()
        prefs.edit().putLong("activity_last_attempt_at", attemptAt).apply()
        notifyStatus(appContext)
        var stage = "prepare"
        try {
            val now = System.currentTimeMillis()
            val initialSince = now - INITIAL_WINDOW_MS
            Log.i(TAG, "call sync start now=$now initialSince=$initialSince")
            val server = prefs.getString("server", "").orEmpty().trimEnd('/')
            if (!server.startsWith("https://") || BuildConfig.SMS_DEVICE_API_KEY.isBlank()) throw IllegalStateException("앱 연결 설정을 확인해주세요")
            val callSince = prefs.getLong("last_call_sync_at", 0L).takeIf { it > 0 } ?: initialSince
            val latestAllowedAt = now + FUTURE_TOLERANCE_MS
            stage = "call_scan"
            val calls = if (appContext.checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED)
                scanCalls(appContext, callSince, latestAllowedAt) else ScanResult(emptyList(), callSince, 0, 0)
            Log.i(TAG, "call scan inspected=${calls.inspected} valid=${calls.records.size} rejected=${calls.rejected} maxTimestamp=${calls.maxTimestamp}")

            stage = "upload"
            val records = calls.records
            var serverRejected = 0
            if (records.isEmpty()) {
                Log.i(TAG, "activity upload empty ping")
                upload(appContext, server, emptyList())
            } else records.chunked(100).forEach { chunk ->
                Log.i(TAG, "activity upload chunk size=${chunk.size}")
                serverRejected += upload(appContext, server, chunk)
            }
            Log.i(TAG, "activity upload complete rejected=$serverRejected")

            val callCount = calls.records.size
            val localRejected = calls.rejected
            val checkResult = "신규 전화 ${callCount}건" +
                if (localRejected + serverRejected > 0) " · 제외 ${localRejected + serverRejected}건" else ""
            stage = "persist"
            val editor = prefs.edit().putLong("activity_last_success_at", System.currentTimeMillis()).putString("activity_last_check_result", checkResult)
                .remove("activity_last_error")
            editor.putLong("last_call_sync_at", calls.maxTimestamp)
            if (callCount > 0) editor.putString("activity_last_nonzero_result", "전화 ${callCount}건")
                .putLong("activity_last_nonzero_at", System.currentTimeMillis())
            editor.apply()
            Log.i(TAG, "call sync complete callCount=$callCount")
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

    private fun scanCalls(context: Context, since: Long, latestAllowedAt: Long): ScanResult {
        var inspected = 0; var rejected = 0; var maxTimestamp = since
        val records = mutableListOf<JSONObject>()
        context.contentResolver.query(CallLog.Calls.CONTENT_URI,
            arrayOf(CallLog.Calls._ID, CallLog.Calls.NUMBER, CallLog.Calls.DATE, CallLog.Calls.DURATION, CallLog.Calls.TYPE),
            "${CallLog.Calls.DATE} > ?", arrayOf(since.toString()), "${CallLog.Calls.DATE} ASC")?.use { cursor: Cursor ->
            while (inspected < INITIAL_CAP && cursor.moveToNext()) {
                inspected++
                val at = cursor.getLong(2)
                if (at > latestAllowedAt) { rejected++; continue }
                maxTimestamp = maxOf(maxTimestamp, at)
                val phone = normalizePhone(cursor.getString(1))
                if (phone == null) { rejected++; continue }
                val direction = when (cursor.getInt(4)) {
                    CallLog.Calls.INCOMING_TYPE -> "incoming"; CallLog.Calls.OUTGOING_TYPE -> "outgoing"
                    CallLog.Calls.MISSED_TYPE -> "missed"; CallLog.Calls.REJECTED_TYPE -> "rejected"; else -> "other"
                }
                records += JSONObject().put("deviceRecordId", "call:${cursor.getLong(0)}").put("recordType", "call")
                    .put("direction", direction).put("phone", phone).put("callDurationSeconds", cursor.getInt(3).coerceAtLeast(0))
                    .put("occurredAt", isoTime(at))
            }
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("call_last_scan_at", System.currentTimeMillis())
            .putInt("call_last_inspected", inspected).putInt("call_last_valid", records.size).apply()
        return ScanResult(records, maxTimestamp, inspected, rejected)
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
        error.message?.contains("조회 실패:") == true -> error.message!!.take(100)
        else -> "알 수 없는 오류"
    }
    private fun notifyStatus(context: Context) { context.sendBroadcast(Intent(SmsPollingService.ACTION_ACTIVITY_SYNC_STATUS).setPackage(context.packageName)) }
    private fun isoTime(value: Long) = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date(value))
}
