import type { Express, Request } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import { getPgPool } from "./credits";

const ONLINE_WINDOW_SECONDS = 10;

function userFromCookie(req: Request): any | null {
  const token = req.cookies?.token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.SESSION_SECRET || "your-secret-key-change-this");
  } catch {
    return null;
  }
}

function requireAdmin(req: Request) {
  const user = userFromCookie(req);
  const admins = String(process.env.SMS_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!user) return { ok: false as const, status: 401, error: "not_logged_in" };
  if (!admins.length) return { ok: false as const, status: 403, error: "admin_not_configured" };
  if (!admins.includes(String(user.email || "").toLowerCase())) {
    return { ok: false as const, status: 403, error: "forbidden" };
  }
  return { ok: true as const };
}

function requireDevice(req: Request) {
  const expected = process.env.SMS_DEVICE_API_KEY;
  if (!expected) return { ok: false as const, status: 503, error: "device_api_key_not_configured" };
  const supplied = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const valid = supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  return valid ? { ok: true as const } : { ok: false as const, status: 401, error: "invalid_device_api_key" };
}

export async function ensureSmsTables() {
  const pool = getPgPool();
  if (!pool) return;
  await pool.query(`
    create table if not exists public.sms_devices (
      device_id text primary key,
      device_name text not null,
      registered_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now()
    );
    create table if not exists public.sms_jobs (
      job_id uuid primary key default gen_random_uuid(),
      device_id text not null references public.sms_devices(device_id),
      phone text not null,
      message text not null,
      status text not null default 'queued' check (status in ('queued', 'processing', 'sent', 'failed')),
      error text,
      created_at timestamptz not null default now(),
      processing_at timestamptz,
      completed_at timestamptz
    );
    create index if not exists idx_sms_jobs_device_queue
      on public.sms_jobs(device_id, created_at) where status = 'queued';
  `);
}

export function registerSmsRoutes(app: Express) {
  app.get("/api/sms/app/download", (req, res) => {
    const auth = requireAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const apkPath = process.env.SMS_APK_PATH
      ? path.resolve(process.env.SMS_APK_PATH)
      : path.resolve(process.cwd(), "server", "private-apk", "nana-sms-sender.apk");
    if (!fs.existsSync(apkPath)) return res.status(404).json({ ok: false, error: "apk_not_deployed" });
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.download(apkPath, "Nana-SMS-Sender.apk");
  });

  app.post("/api/sms-device/register", async (req, res) => {
    const auth = requireDevice(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const deviceId = String(req.body?.deviceId || "").trim();
    const deviceName = String(req.body?.deviceName || "").trim();
    if (!deviceId || deviceId.length > 200 || !deviceName || deviceName.length > 100) {
      return res.status(400).json({ ok: false, error: "invalid_device" });
    }
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    await ensureSmsTables();
    await pool.query(`insert into public.sms_devices(device_id, device_name) values ($1, $2)
      on conflict (device_id) do update set device_name = excluded.device_name, last_seen_at = now()`, [deviceId, deviceName]);
    return res.json({ ok: true });
  });

  app.post("/api/sms-device/heartbeat", async (req, res) => {
    const auth = requireDevice(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    const result = await pool.query("update public.sms_devices set last_seen_at = now() where device_id = $1", [String(req.body?.deviceId || "")]);
    if (!result.rowCount) return res.status(404).json({ ok: false, error: "device_not_registered" });
    return res.json({ ok: true });
  });

  app.get("/api/sms-device/:deviceId/next", async (req, res) => {
    const auth = requireDevice(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("update public.sms_devices set last_seen_at = now() where device_id = $1", [req.params.deviceId]);
      const { rows } = await client.query(`select job_id, phone, message from public.sms_jobs
        where device_id = $1 and status = 'queued' order by created_at for update skip locked limit 1`, [req.params.deviceId]);
      if (rows[0]) await client.query("update public.sms_jobs set status = 'processing', processing_at = now() where job_id = $1", [rows[0].job_id]);
      await client.query("commit");
      return res.json({ job: rows[0] ? { jobId: rows[0].job_id, phone: rows[0].phone, message: rows[0].message } : null });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  });

  app.post("/api/sms/result", async (req, res) => {
    const auth = requireDevice(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const status = String(req.body?.status || "");
    if (!['sent', 'failed'].includes(status)) return res.status(400).json({ ok: false, error: "invalid_status" });
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    const result = await pool.query(`update public.sms_jobs set status = $1, error = $2, completed_at = now()
      where job_id = $3 and device_id = $4 and status = 'processing'`,
      [status, status === "failed" ? String(req.body?.error || "SMS 발송 실패").slice(0, 1000) : null, req.body?.jobId, req.body?.deviceId]);
    if (!result.rowCount) return res.status(404).json({ ok: false, error: "processing_job_not_found" });
    return res.json({ ok: true });
  });

  app.get("/api/sms/devices", async (req, res) => {
    const auth = requireAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    await ensureSmsTables();
    const { rows } = await pool.query(`select device_id, device_name, last_seen_at,
      last_seen_at > now() - interval '${ONLINE_WINDOW_SECONDS} seconds' as online from public.sms_devices order by device_name`);
    return res.json({ ok: true, devices: rows.map((row) => ({ deviceId: row.device_id, deviceName: row.device_name, lastSeenAt: row.last_seen_at, online: row.online })) });
  });

  app.post("/api/sms/send", async (req, res) => {
    const auth = requireAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const deviceId = String(req.body?.deviceId || "").trim();
    const phone = String(req.body?.phone || "").replace(/[\s-]/g, "");
    const message = String(req.body?.message || "");
    if (!deviceId || !/^01\d{8,9}$/.test(phone) || !message.trim() || message.length > 2000) {
      return res.status(400).json({ ok: false, error: "invalid_sms_request" });
    }
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    const { rows } = await pool.query(`insert into public.sms_jobs(device_id, phone, message)
      select device_id, $2, $3 from public.sms_devices where device_id = $1 returning job_id, status`, [deviceId, phone, message]);
    if (!rows[0]) return res.status(404).json({ ok: false, error: "device_not_found" });
    return res.status(201).json({ ok: true, jobId: rows[0].job_id, status: rows[0].status });
  });

  app.get("/api/sms/status/:jobId", async (req, res) => {
    const auth = requireAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    const { rows } = await pool.query("select job_id, status, error, created_at, processing_at, completed_at from public.sms_jobs where job_id = $1", [req.params.jobId]);
    if (!rows[0]) return res.status(404).json({ ok: false, error: "job_not_found" });
    const job = rows[0];
    return res.json({ ok: true, job: { jobId: job.job_id, status: job.status, error: job.error, createdAt: job.created_at, processingAt: job.processing_at, completedAt: job.completed_at } });
  });
}
