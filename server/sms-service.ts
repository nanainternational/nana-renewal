import type { Express, Request } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { getPgPool } from "./credits";
import {
  getAdminUserByEmail,
  normalizeEmail,
  syncAdminUserByEmail,
} from "./order-system";
import { generateScheduledTimes } from "./sms-schedule";

const ONLINE_WINDOW_SECONDS = 10;
const SMS_RELEASE_TAG_PATTERN = /^sms-sender-v(\d+)\.(\d+)\.(\d+)$/;
const SMS_RELEASES_API =
  "https://api.github.com/repos/nanainternational/nana-renewal/releases?per_page=100";
const SMS_APK_ASSET_NAME = "nana-sms-sender.apk";
const CONTACT_STATUSES = ["미분류", "상담중", "고객", "수신거부"] as const;

function normalizePhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

type GithubRelease = {
  tag_name?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: Array<{ name?: string; url?: string }>;
};

function githubHeaders(accept: string): Record<string, string> {
  const token = String(process.env.SMS_GITHUB_TOKEN || "").trim();
  return {
    Accept: accept,
    "User-Agent": "nana-renewal-sms-downloader",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function releaseVersion(
  release: GithubRelease,
): [number, number, number] | null {
  const match = String(release.tag_name || "").match(SMS_RELEASE_TAG_PATTERN);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function latestSmsRelease(releases: GithubRelease[]): GithubRelease | null {
  return (
    releases
      .filter(
        (release) =>
          !release.draft && !release.prerelease && releaseVersion(release),
      )
      .sort((left, right) => {
        const a = releaseVersion(left)!;
        const b = releaseVersion(right)!;
        return b[0] - a[0] || b[1] - a[1] || b[2] - a[2];
      })[0] || null
  );
}

function userFromCookie(req: Request): any | null {
  const token = req.cookies?.token;
  if (!token) return null;
  try {
    return jwt.verify(
      token,
      process.env.SESSION_SECRET || "your-secret-key-change-this",
    );
  } catch {
    return null;
  }
}

async function requireAdmin(req: Request) {
  const user = userFromCookie(req);
  if (!user) return { ok: false as const, status: 403, error: "not_logged_in" };

  const email = normalizeEmail(user.email);
  if (!email)
    return { ok: false as const, status: 403, error: "missing_email" };

  // 기존 주문 관리자와 동일하게 admin_invites/admin_users를 기준으로 인증한다.
  await syncAdminUserByEmail(email);
  const admin = await getAdminUserByEmail(email);
  if (!admin) return { ok: false as const, status: 403, error: "not_invited" };
  if (!admin.is_active)
    return { ok: false as const, status: 403, error: "inactive" };
  return { ok: true as const, admin };
}

function requireDevice(req: Request) {
  const expected = process.env.SMS_DEVICE_API_KEY;
  if (!expected)
    return {
      ok: false as const,
      status: 503,
      error: "device_api_key_not_configured",
    };
  const supplied = String(req.headers.authorization || "").replace(
    /^Bearer\s+/i,
    "",
  );
  const valid =
    supplied.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  return valid
    ? { ok: true as const }
    : { ok: false as const, status: 401, error: "invalid_device_api_key" };
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
      batch_id uuid,
      status text not null default 'queued' check (status in ('queued', 'processing', 'sent', 'failed')),
      error text,
      created_at timestamptz not null default now(),
      processing_at timestamptz,
      completed_at timestamptz
    );
    create table if not exists public.crm_contacts (
      id uuid primary key default gen_random_uuid(),
      company_name text not null default '',
      phone text not null unique,
      channel text not null default '',
      status text not null default '미분류' check (status in ('미분류', '상담중', '고객', '수신거부')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists public.sms_batches (
      batch_id uuid primary key,
      device_id text not null references public.sms_devices(device_id),
      starts_at timestamptz not null,
      ends_at timestamptz not null,
      paused_at timestamptz,
      created_at timestamptz not null default now()
    );
    alter table public.sms_devices add column if not exists next_send_at timestamptz;
    alter table public.sms_devices add column if not exists deleted_at timestamptz;
    alter table public.sms_jobs add column if not exists contact_id uuid references public.crm_contacts(id);
    alter table public.sms_jobs add column if not exists company_name text;
    alter table public.sms_jobs add column if not exists channel text;
    alter table public.sms_jobs add column if not exists batch_id uuid;
    alter table public.sms_jobs add column if not exists scheduled_at timestamptz;
    alter table public.sms_jobs drop constraint if exists sms_jobs_status_check;
    alter table public.sms_jobs add constraint sms_jobs_status_check
      check (status in ('queued', 'processing', 'sent', 'failed', 'cancelled'));
    create index if not exists idx_sms_jobs_device_queue
      on public.sms_jobs(device_id, created_at) where status = 'queued';
    create index if not exists idx_sms_jobs_batch_id on public.sms_jobs(batch_id) where batch_id is not null;
    create index if not exists idx_sms_jobs_device_schedule
      on public.sms_jobs(device_id, scheduled_at) where status = 'queued';
    create index if not exists idx_sms_jobs_phone_completed on public.sms_jobs(phone, completed_at desc);
    create index if not exists idx_crm_contacts_company_name on public.crm_contacts(company_name);
  `);
}

export function registerSmsRoutes(app: Express) {
  app.get("/api/sms/app/download", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    let releasesResponse: Response;
    try {
      releasesResponse = await fetch(SMS_RELEASES_API, {
        headers: githubHeaders("application/vnd.github+json"),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      console.error("sms apk GitHub releases API request failed:", error);
      return res
        .status(502)
        .json({ ok: false, error: "github_releases_api_error" });
    }

    if (!releasesResponse.ok) {
      const detail = (await releasesResponse.text()).slice(0, 500);
      console.error("sms apk GitHub releases API error:", {
        status: releasesResponse.status,
        detail,
      });
      return res.status(502).json({
        ok: false,
        error: "github_releases_api_error",
        status: releasesResponse.status,
      });
    }

    let releases: GithubRelease[];
    try {
      const payload = await releasesResponse.json();
      if (!Array.isArray(payload))
        throw new Error("unexpected GitHub releases response");
      releases = payload;
    } catch (error) {
      console.error(
        "sms apk GitHub releases API response parse failed:",
        error,
      );
      return res
        .status(502)
        .json({ ok: false, error: "github_releases_api_error" });
    }

    const release = latestSmsRelease(releases);
    if (!release) {
      console.error(
        "sms apk release not found: no stable sms-sender-v* release",
      );
      return res
        .status(404)
        .json({ ok: false, error: "sms_release_not_found" });
    }

    const asset = release.assets?.find(
      (candidate) => candidate.name === SMS_APK_ASSET_NAME,
    );
    if (!asset?.url) {
      console.error("sms apk release asset not found:", {
        tag: release.tag_name,
        asset: SMS_APK_ASSET_NAME,
      });
      return res.status(404).json({
        ok: false,
        error: "sms_apk_asset_not_found",
        tag: release.tag_name,
      });
    }

    let apkResponse: Response;
    try {
      apkResponse = await fetch(asset.url, {
        headers: githubHeaders("application/octet-stream"),
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      console.error("sms apk asset download request failed:", {
        tag: release.tag_name,
        error,
      });
      return res.status(502).json({
        ok: false,
        error: "sms_apk_download_failed",
        tag: release.tag_name,
      });
    }

    if (!apkResponse.ok || !apkResponse.body) {
      const detail = (await apkResponse.text()).slice(0, 500);
      console.error("sms apk asset download failed:", {
        tag: release.tag_name,
        status: apkResponse.status,
        detail,
      });
      return res.status(502).json({
        ok: false,
        error: "sms_apk_download_failed",
        tag: release.tag_name,
        status: apkResponse.status,
      });
    }

    res.status(200);
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Nana-SMS-Sender.apk"',
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const contentLength = apkResponse.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    try {
      await pipeline(Readable.fromWeb(apkResponse.body as any), res);
    } catch (error) {
      console.error("sms apk response streaming failed:", {
        tag: release.tag_name,
        error,
      });
      if (!res.headersSent)
        return res.status(502).json({
          ok: false,
          error: "sms_apk_stream_failed",
          tag: release.tag_name,
        });
      res.destroy(error as Error);
    }
  });

  app.post("/api/sms-device/register", async (req, res) => {
    const auth = requireDevice(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const deviceId = String(req.body?.deviceId || "").trim();
    const deviceName = String(req.body?.deviceName || "").trim();
    if (
      !deviceId ||
      deviceId.length > 200 ||
      !deviceName ||
      deviceName.length > 100
    ) {
      return res.status(400).json({ ok: false, error: "invalid_device" });
    }
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    await ensureSmsTables();
    await pool.query(
      `insert into public.sms_devices(device_id, device_name) values ($1, $2)
      on conflict (device_id) do update set device_name = excluded.device_name,
        last_seen_at = now(), deleted_at = null`,
      [deviceId, deviceName],
    );
    return res.json({ ok: true });
  });

  app.post("/api/sms-device/heartbeat", async (req, res) => {
    const auth = requireDevice(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const nextSendAt =
      req.body?.nextSendAt == null
        ? null
        : new Date(Number(req.body.nextSendAt));
    if (nextSendAt && Number.isNaN(nextSendAt.getTime()))
      return res.status(400).json({ ok: false, error: "invalid_next_send_at" });
    const result = await pool.query(
      "update public.sms_devices set last_seen_at = now(), next_send_at = $2 where device_id = $1",
      [String(req.body?.deviceId || ""), nextSendAt],
    );
    if (!result.rowCount)
      return res
        .status(404)
        .json({ ok: false, error: "device_not_registered" });
    return res.json({ ok: true });
  });

  app.get("/api/sms-device/:deviceId/next", async (req, res) => {
    const auth = requireDevice(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        "update public.sms_devices set last_seen_at = now() where device_id = $1",
        [req.params.deviceId],
      );
      const { rows } = await client.query(
        `select j.job_id, j.phone, j.message from public.sms_jobs j
        join public.sms_devices d on d.device_id = j.device_id and d.deleted_at is null
        left join public.sms_batches b on b.batch_id = j.batch_id
        where j.device_id = $1 and j.status = 'queued'
          and (j.scheduled_at is null or j.scheduled_at <= now())
          and (b.batch_id is null or b.paused_at is null)
          and (b.batch_id is null or now() < b.ends_at)
        order by j.scheduled_at nulls first, j.created_at for update of j skip locked limit 1`,
        [req.params.deviceId],
      );
      if (rows[0])
        await client.query(
          "update public.sms_jobs set status = 'processing', processing_at = now() where job_id = $1",
          [rows[0].job_id],
        );
      await client.query("commit");
      return res.json({
        job: rows[0]
          ? {
              jobId: rows[0].job_id,
              phone: rows[0].phone,
              message: rows[0].message,
            }
          : null,
      });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  });

  app.post("/api/sms/result", async (req, res) => {
    const auth = requireDevice(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const status = String(req.body?.status || "");
    if (!["sent", "failed"].includes(status))
      return res.status(400).json({ ok: false, error: "invalid_status" });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const result = await pool.query(
      `update public.sms_jobs set status = $1, error = $2, completed_at = now()
      where job_id = $3 and device_id = $4 and status = 'processing'`,
      [
        status,
        status === "failed"
          ? String(req.body?.error || "SMS 발송 실패").slice(0, 1000)
          : null,
        req.body?.jobId,
        req.body?.deviceId,
      ],
    );
    if (!result.rowCount)
      return res
        .status(404)
        .json({ ok: false, error: "processing_job_not_found" });
    return res.json({ ok: true });
  });

  app.get("/api/sms/devices", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    await ensureSmsTables();
    const { rows } =
      await pool.query(`select d.device_id, d.device_name, d.last_seen_at,
      d.last_seen_at > now() - interval '${ONLINE_WINDOW_SECONDS} seconds' as online,
      count(j.job_id) filter (where j.status = 'queued')::int as queue_count,
      count(j.job_id) filter (where j.status = 'processing')::int as processing_count,
      count(j.job_id) filter (where j.status = 'sent' and j.completed_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')::int as today_sent,
      active.batch_id, active.starts_at, active.ends_at, active.paused_at,
      min(j.scheduled_at) filter (where j.status = 'queued' and j.batch_id = active.batch_id and active.paused_at is null) next_send_at
      from public.sms_devices d left join public.sms_jobs j on j.device_id = d.device_id
      left join lateral (select b.* from public.sms_batches b
        where b.device_id = d.device_id and exists (select 1 from public.sms_jobs q where q.batch_id = b.batch_id and q.status = 'queued')
        order by b.created_at desc limit 1) active on true
      where d.deleted_at is null
      group by d.device_id, active.batch_id, active.starts_at, active.ends_at, active.paused_at order by d.device_name`);
    return res.json({
      ok: true,
      devices: rows.map((row) => ({
        deviceId: row.device_id,
        deviceName: row.device_name,
        lastSeenAt: row.last_seen_at,
        nextSendAt: row.next_send_at,
        online: row.online,
        queueCount: row.queue_count,
        processingCount: row.processing_count,
        todaySent: row.today_sent,
        activeBatchId: row.batch_id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        paused: Boolean(row.paused_at),
      })),
    });
  });

  app.delete("/api/sms/devices/:deviceId", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const deviceId = String(req.params.deviceId || "").trim();
    if (!deviceId || deviceId.length > 200)
      return res.status(400).json({ ok: false, error: "invalid_device" });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    await ensureSmsTables();
    const result = await pool.query(
      `update public.sms_devices set deleted_at = now()
       where device_id = $1 and deleted_at is null returning device_id`,
      [deviceId],
    );
    if (!result.rowCount)
      return res.status(404).json({ ok: false, error: "device_not_found" });
    return res.json({ ok: true });
  });

  app.get("/api/crm/contacts", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    await ensureSmsTables();
    const search = String(req.query.search || "").trim();
    const digits = normalizePhone(search);
    const { rows } = await pool.query(
      `select c.id, c.company_name, c.phone, c.channel, c.status,
      count(j.job_id) filter (where j.status = 'sent')::int history_count,
      max(j.completed_at) filter (where j.status = 'sent') last_sent_at
      from public.crm_contacts c left join public.sms_jobs j on j.phone = c.phone
      where ($1 = '' or c.company_name ilike '%' || $1 || '%' or ($2 <> '' and c.phone like '%' || $2 || '%'))
      group by c.id order by coalesce(max(j.completed_at), c.created_at) desc limit 500`,
      [search, digits],
    );
    return res.json({
      ok: true,
      contacts: rows.map((r) => ({
        id: r.id,
        companyName: r.company_name,
        phone: r.phone,
        channel: r.channel,
        status: r.status,
        historyCount: r.history_count,
        lastSentAt: r.last_sent_at,
      })),
    });
  });

  app.post("/api/crm/contacts/check", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const contacts = Array.isArray(req.body?.contacts)
      ? req.body.contacts.slice(0, 2000)
      : [];
    const phones = contacts
      .map((c: any) => normalizePhone(c.phone))
      .filter((p: string) => /^01\d{8,9}$/.test(p));
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const { rows } = await pool.query(
      `select c.id, p.phone, coalesce(c.status, '미분류') status,
      coalesce(c.company_name, '') company_name, coalesce(c.channel, '') channel,
      count(j.job_id) filter (where j.status = 'sent')::int history_count,
      max(j.completed_at) filter (where j.status = 'sent') last_sent_at
      from unnest($1::text[]) p(phone)
      left join public.crm_contacts c on c.phone = p.phone
      left join public.sms_jobs j on j.phone = p.phone
      group by p.phone, c.id`,
      [phones],
    );
    return res.json({
      ok: true,
      matches: rows.map((r) => ({
        id: r.id,
        phone: r.phone,
        status: r.status,
        companyName: r.company_name,
        channel: r.channel,
        historyCount: r.history_count,
        lastSentAt: r.last_sent_at,
      })),
    });
  });

  app.patch("/api/crm/contacts/:id/status", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const status = String(req.body?.status || "");
    if (!CONTACT_STATUSES.includes(status as any))
      return res.status(400).json({ ok: false, error: "invalid_status" });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const { rows } = await pool.query(
      "update public.crm_contacts set status = $1, updated_at = now() where id = $2 returning id, status",
      [status, req.params.id],
    );
    return rows[0]
      ? res.json({ ok: true, contact: rows[0] })
      : res.status(404).json({ ok: false, error: "contact_not_found" });
  });

  app.get("/api/crm/contacts/:id/history", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const { rows } = await pool.query(
      `select j.job_id, j.message, j.status, j.completed_at, j.created_at
      from public.sms_jobs j join public.crm_contacts c on c.phone = j.phone where c.id = $1 order by coalesce(j.completed_at, j.created_at) desc`,
      [req.params.id],
    );
    return res.json({
      ok: true,
      history: rows.map((r) => ({
        jobId: r.job_id,
        message: r.message,
        status: r.status,
        sentAt: r.completed_at,
        createdAt: r.created_at,
      })),
    });
  });

  app.get("/api/crm/sms-history", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const { rows } =
      await pool.query(`select j.job_id, coalesce(c.company_name, j.company_name, '') company_name, j.phone,
      coalesce(c.channel, j.channel, '') channel, j.message, j.status, j.scheduled_at, j.completed_at, j.created_at, d.device_name,
      case when j.status = 'sent' then j.completed_at - max(j.completed_at) filter (where j.status = 'sent') over
        (partition by j.device_id order by j.completed_at rows between unbounded preceding and 1 preceding) end send_interval
      from public.sms_jobs j left join public.crm_contacts c on c.phone = j.phone join public.sms_devices d on d.device_id = j.device_id
      order by coalesce(j.completed_at, j.created_at) desc limit 500`);
    return res.json({
      ok: true,
      history: rows.map((r) => ({
        jobId: r.job_id,
        companyName: r.company_name,
        phone: r.phone,
        channel: r.channel,
        message: r.message,
        status: r.status,
        scheduledAt: r.scheduled_at,
        sentAt: r.completed_at,
        createdAt: r.created_at,
        deviceName: r.device_name,
        sendInterval: r.send_interval,
      })),
    });
  });

  app.post("/api/crm/sms/queue", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const deviceId = String(req.body?.deviceId || "").trim();
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const startsAt = new Date(String(req.body?.startsAt || ""));
    const endsAt = new Date(String(req.body?.endsAt || ""));
    if (
      !deviceId ||
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      startsAt.getTime() <= Date.now() ||
      startsAt >= endsAt ||
      !items.length ||
      items.length > 2000 ||
      items.some(
        (i: any) =>
          !/^01\d{8,9}$/.test(normalizePhone(i.phone)) ||
          !String(i.finalMessage || "").trim() ||
          String(i.finalMessage).length > 2000,
      )
    )
      return res
        .status(400)
        .json({ ok: false, error: "invalid_confirmed_queue" });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const client = await pool.connect();
    const batchId = crypto.randomUUID();
    try {
      await client.query("begin");
      const device = await client.query(
        "select 1 from public.sms_devices where device_id = $1 and deleted_at is null",
        [deviceId],
      );
      if (!device.rowCount)
        throw Object.assign(new Error("device_not_found"), { status: 404 });
      const allowed: Array<{ item: any; phone: string; contactId: string }> =
        [];
      for (const item of items) {
        const phone = normalizePhone(item.phone);
        const contact = await client.query(
          `insert into public.crm_contacts(company_name, phone, channel) values ($1,$2,$3)
          on conflict(phone) do update set company_name = case when excluded.company_name <> '' then excluded.company_name else crm_contacts.company_name end,
          channel = case when excluded.channel <> '' then excluded.channel else crm_contacts.channel end, updated_at = now() returning id, status`,
          [
            String(item.companyName || "").slice(0, 200),
            phone,
            String(item.channel || "").slice(0, 100),
          ],
        );
        if (contact.rows[0].status === "수신거부") continue;
        allowed.push({ item, phone, contactId: contact.rows[0].id });
      }
      if (!allowed.length)
        throw Object.assign(new Error("no_sendable_contacts"), { status: 400 });
      const schedule = generateScheduledTimes(startsAt, endsAt, allowed.length);
      await client.query(
        "insert into public.sms_batches(batch_id, device_id, starts_at, ends_at) values ($1,$2,$3,$4)",
        [batchId, deviceId, startsAt, endsAt],
      );
      for (let index = 0; index < allowed.length; index += 1) {
        const { item, phone, contactId } = allowed[index];
        await client.query(
          "insert into public.sms_jobs(device_id, phone, message, batch_id, contact_id, company_name, channel, scheduled_at) values ($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            deviceId,
            phone,
            String(item.finalMessage),
            batchId,
            contactId,
            String(item.companyName || ""),
            String(item.channel || ""),
            schedule[index],
          ],
        );
      }
      await client.query("commit");
      return res.status(201).json({
        ok: true,
        batchId,
        queued: allowed.length,
        firstScheduledAt: schedule[0],
        lastScheduledAt: schedule[schedule.length - 1],
      });
    } catch (error: any) {
      await client.query("rollback");
      if (error.status)
        return res
          .status(error.status)
          .json({ ok: false, error: error.message });
      throw error;
    } finally {
      client.release();
    }
  });

  app.post("/api/sms/send", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const deviceId = String(req.body?.deviceId || "").trim();
    const phone = String(req.body?.phone || "").replace(/[\s-]/g, "");
    const message = String(req.body?.message || "");
    if (
      !deviceId ||
      !/^01\d{8,9}$/.test(phone) ||
      !message.trim() ||
      message.length > 2000
    ) {
      return res.status(400).json({ ok: false, error: "invalid_sms_request" });
    }
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const { rows } = await pool.query(
      `insert into public.sms_jobs(device_id, phone, message)
      select device_id, $2, $3 from public.sms_devices where device_id = $1 and deleted_at is null returning job_id, status`,
      [deviceId, phone, message],
    );
    if (!rows[0])
      return res.status(404).json({ ok: false, error: "device_not_found" });
    return res
      .status(201)
      .json({ ok: true, jobId: rows[0].job_id, status: rows[0].status });
  });

  app.post("/api/sms/batch/:batchId/pause", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const { rows } = await pool.query(
      "update public.sms_batches set paused_at = coalesce(paused_at, now()) where batch_id = $1 returning paused_at",
      [req.params.batchId],
    );
    return rows[0]
      ? res.json({ ok: true, pausedAt: rows[0].paused_at })
      : res.status(404).json({ ok: false, error: "sms_batch_not_found" });
  });

  app.post("/api/sms/batch/:batchId/resume", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const client = await pool.connect();
    try {
      await client.query("begin");
      const batchResult = await client.query(
        "select ends_at, paused_at from public.sms_batches where batch_id = $1 for update",
        [req.params.batchId],
      );
      if (!batchResult.rows[0])
        throw Object.assign(new Error("sms_batch_not_found"), { status: 404 });
      if (!batchResult.rows[0].paused_at)
        throw Object.assign(new Error("batch_not_paused"), { status: 409 });
      const end = req.body?.endsAt
        ? new Date(String(req.body.endsAt))
        : new Date(batchResult.rows[0].ends_at);
      const start = new Date(Date.now() + 2_000);
      const queued = await client.query(
        "select job_id from public.sms_jobs where batch_id = $1 and status = 'queued' order by scheduled_at, created_at for update",
        [req.params.batchId],
      );
      if (!queued.rowCount)
        throw Object.assign(new Error("no_queued_jobs"), { status: 409 });
      if (
        Number.isNaN(end.getTime()) ||
        end.getTime() - start.getTime() < queued.rowCount * 10_000
      )
        throw Object.assign(new Error("insufficient_remaining_time"), {
          status: 409,
        });
      const schedule = generateScheduledTimes(start, end, queued.rowCount);
      for (let index = 0; index < queued.rows.length; index += 1)
        await client.query(
          "update public.sms_jobs set scheduled_at = $1 where job_id = $2",
          [schedule[index], queued.rows[index].job_id],
        );
      await client.query(
        "update public.sms_batches set paused_at = null, ends_at = $2 where batch_id = $1",
        [req.params.batchId, end],
      );
      await client.query("commit");
      return res.json({
        ok: true,
        queued: queued.rowCount,
        firstScheduledAt: schedule[0],
        lastScheduledAt: schedule[schedule.length - 1],
      });
    } catch (error: any) {
      await client.query("rollback");
      if (error.status)
        return res
          .status(error.status)
          .json({ ok: false, error: error.message });
      throw error;
    } finally {
      client.release();
    }
  });

  app.post("/api/sms/batch/:batchId/cancel-queued", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const result = await pool.query(
      "update public.sms_jobs set status = 'cancelled', completed_at = now() where batch_id = $1 and status = 'queued'",
      [req.params.batchId],
    );
    return res.json({ ok: true, cancelled: result.rowCount });
  });

  app.post("/api/sms/send-bulk", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const deviceId = String(req.body?.deviceId || "").trim();
    const message = String(req.body?.message || "");
    const rawPhones = Array.isArray(req.body?.phones) ? req.body.phones : [];
    const phones = Array.from(
      new Set(
        rawPhones.map((value: unknown) =>
          String(value || "").replace(/\D/g, ""),
        ),
      ),
    ).filter((phone) => /^01\d{8,9}$/.test(phone));
    if (
      !deviceId ||
      !message.trim() ||
      message.length > 2000 ||
      !phones.length ||
      phones.length > 2000
    ) {
      return res
        .status(400)
        .json({ ok: false, error: "invalid_bulk_sms_request" });
    }
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    await ensureSmsTables();
    const batchId = crypto.randomUUID();
    const { rows } = await pool.query(
      `insert into public.sms_jobs(device_id, phone, message, batch_id)
      select d.device_id, p.phone, $3, $4::uuid
      from public.sms_devices d cross join unnest($2::text[]) as p(phone)
      left join public.crm_contacts c on c.phone = p.phone
      where d.device_id = $1 and d.deleted_at is null
        and coalesce(c.status, '') <> '수신거부' returning job_id`,
      [deviceId, phones, message, batchId],
    );
    if (!rows.length)
      return res.status(404).json({ ok: false, error: "device_not_found" });
    return res.status(201).json({ ok: true, batchId, queued: rows.length });
  });

  app.get("/api/sms/batch/:batchId/status", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const batchId = String(req.params.batchId || "");
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        batchId,
      )
    ) {
      return res.status(400).json({ ok: false, error: "invalid_batch_id" });
    }
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const { rows } = await pool.query(
      `select j.status, count(*)::int as count, b.starts_at, b.ends_at, b.paused_at,
      min(j.scheduled_at) filter (where j.status = 'queued') next_scheduled_at
      from public.sms_jobs j left join public.sms_batches b on b.batch_id = j.batch_id
      where j.batch_id = $1::uuid group by j.status, b.starts_at, b.ends_at, b.paused_at`,
      [batchId],
    );
    if (!rows.length)
      return res.status(404).json({ ok: false, error: "sms_batch_not_found" });
    const counts = {
      queued: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const row of rows)
      if (row.status in counts)
        counts[row.status as keyof typeof counts] = Number(row.count);
    return res.json({
      ok: true,
      batchId,
      counts,
      startsAt: rows[0].starts_at,
      endsAt: rows[0].ends_at,
      paused: Boolean(rows[0].paused_at),
      nextScheduledAt: rows.find((row) => row.next_scheduled_at)
        ?.next_scheduled_at,
    });
  });

  app.get("/api/sms/status/:jobId", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const { rows } = await pool.query(
      "select job_id, status, error, created_at, processing_at, completed_at from public.sms_jobs where job_id = $1",
      [req.params.jobId],
    );
    if (!rows[0])
      return res.status(404).json({ ok: false, error: "job_not_found" });
    const job = rows[0];
    return res.json({
      ok: true,
      job: {
        jobId: job.job_id,
        status: job.status,
        error: job.error,
        createdAt: job.created_at,
        processingAt: job.processing_at,
        completedAt: job.completed_at,
      },
    });
  });
}
