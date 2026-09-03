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
const JOB_STATUSES = ["queued", "processing", "sent", "failed", "cancelled"] as const;
const DEFAULT_PAGE_SIZE = 50;
const ACTIVITY_DIRECTIONS = ["incoming", "outgoing", "missed", "rejected", "other"] as const;
const SMS_AI_MODEL = "gpt-5";
const SMS_AI_CONCURRENCY = 4;
let smsAiActive = 0;
const smsAiWaiters: Array<() => void> = [];

export type SmsTemplateAnalysis = {
  topic: string;
  keyPoints: string[];
  purpose: string;
  tone: string;
  endingStyle: string;
  fixedFacts: string[];
};

async function withSmsAiLimit<T>(work: () => Promise<T>): Promise<T> {
  if (smsAiActive >= SMS_AI_CONCURRENCY)
    await new Promise<void>((resolve) => smsAiWaiters.push(resolve));
  smsAiActive += 1;
  try { return await work(); }
  finally {
    smsAiActive -= 1;
    smsAiWaiters.shift()?.();
  }
}

async function openAiStructured(name: string, schema: object, instructions: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("openai_not_configured");
  return withSmsAiLimit(async () => {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: SMS_AI_MODEL,
        input: [{ role: "user", content: [{ type: "input_text", text: instructions }] }],
        text: { format: { type: "json_schema", name, strict: true, schema } },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const payload: any = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || `openai_${response.status}`);
    const output = typeof payload?.output_text === "string" ? payload.output_text :
      (payload?.output || []).flatMap((item: any) => item?.content || []).find((part: any) => part?.type === "output_text")?.text;
    if (!output) throw new Error("empty_ai_response");
    return JSON.parse(output);
  });
}

function applyContactVariables(template: string, contact: any) {
  return template
    .replaceAll("{{companyName}}", String(contact?.companyName || ""))
    .replaceAll("{{channel}}", String(contact?.channel || ""));
}

export function parsePagination(query: Record<string, unknown>) {
  const parsedPage = Number(String(query.page ?? ""));
  const parsedPageSize = Number(String(query.pageSize ?? ""));
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  const pageSize =
    Number.isInteger(parsedPageSize) && parsedPageSize >= 1
      ? Math.min(parsedPageSize, 100)
      : DEFAULT_PAGE_SIZE;
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function pagination(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

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
    create table if not exists public.sms_message_templates (
      id uuid primary key default gen_random_uuid(),
      name text not null default '',
      template text not null,
      analysis jsonb,
      ad_enabled boolean not null default false,
      advertiser_name text not null default '',
      opt_out_enabled boolean not null default false,
      opt_out_number text not null default '',
      created_at timestamptz not null default now(),
      last_used_at timestamptz not null default now()
    );
    create table if not exists public.phone_activity (
      id uuid primary key default gen_random_uuid(),
      device_id text not null references public.sms_devices(device_id),
      device_record_id text not null,
      record_type text not null check (record_type in ('sms', 'call')),
      direction text not null check (direction in ('incoming', 'outgoing', 'missed', 'rejected', 'other')),
      phone text not null,
      message text,
      call_duration_seconds integer,
      occurred_at timestamptz not null,
      linked_sms_job_id uuid references public.sms_jobs(job_id),
      created_at timestamptz not null default now(),
      unique (device_id, record_type, device_record_id)
    );
    create index if not exists idx_sms_message_templates_last_used
      on public.sms_message_templates(last_used_at desc);
    alter table public.sms_devices add column if not exists next_send_at timestamptz;
    alter table public.sms_devices add column if not exists deleted_at timestamptz;
    alter table public.sms_devices add column if not exists activity_last_synced_at timestamptz;
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
    create index if not exists idx_sms_jobs_history_sort on public.sms_jobs((coalesce(completed_at, created_at)) desc, job_id desc);
    create index if not exists idx_sms_jobs_status_history on public.sms_jobs(status, (coalesce(completed_at, created_at)) desc, job_id desc);
    create index if not exists idx_sms_jobs_created_at on public.sms_jobs(created_at desc);
    create index if not exists idx_crm_contacts_company_name on public.crm_contacts(company_name);
    create index if not exists idx_crm_contacts_created_id on public.crm_contacts(created_at desc, id desc);
    create index if not exists idx_phone_activity_device_time on public.phone_activity(device_id, occurred_at desc, id desc);
    create index if not exists idx_phone_activity_phone on public.phone_activity(phone);
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

  app.post("/api/sms-device/activity", async (req, res) => {
    const auth = requireDevice(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const deviceId = String(req.body?.deviceId || "").trim();
    const records = req.body?.records;
    if (!deviceId || deviceId.length > 200 || !Array.isArray(records) || records.length < 1 || records.length > 100)
      return res.status(400).json({ ok: false, error: "invalid_activity_batch" });
    const validated: Array<{ deviceRecordId: string; recordType: string; direction: string; phone: string; message: string | null; duration: number | null; occurredAt: Date }> = [];
    let rejected = 0;
    for (const raw of records) {
      const deviceRecordId = String(raw?.deviceRecordId || "").trim();
      const recordType = String(raw?.recordType || "");
      const direction = String(raw?.direction || "");
      const phone = normalizePhone(raw?.phone);
      const message = raw?.message == null ? null : String(raw.message);
      const occurredAt = new Date(String(raw?.occurredAt || ""));
      const duration = raw?.callDurationSeconds == null ? null : Number(raw.callDurationSeconds);
      const validDirection = ACTIVITY_DIRECTIONS.includes(direction as any) &&
        (recordType === "call" || direction === "incoming" || direction === "outgoing");
      if (!deviceRecordId || deviceRecordId.length > 200 || !["sms", "call"].includes(recordType) || !validDirection ||
          !phone || phone.length > 30 || message != null && message.length > 10_000 || Number.isNaN(occurredAt.getTime()) ||
          occurredAt.getTime() > Date.now() + 5 * 60_000 || duration != null && (!Number.isInteger(duration) || duration < 0 || duration > 604_800) ||
          recordType === "sms" && duration != null || recordType === "call" && message != null)
        { rejected += 1; continue; }
      validated.push({ deviceRecordId, recordType, direction, phone, message, duration, occurredAt });
    }
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    await ensureSmsTables();
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [deviceId]);
      const device = await client.query("select 1 from public.sms_devices where device_id = $1", [deviceId]);
      if (!device.rowCount) { await client.query("rollback"); return res.status(404).json({ ok: false, error: "device_not_registered" }); }
      let accepted = 0;
      for (const record of validated) {
        if (record.recordType === "sms" && record.direction === "incoming") {
          const broadcastRecord = record.deviceRecordId.startsWith("rx:");
          const duplicate = await client.query(
            `select id from public.phone_activity
             where device_id=$1 and record_type='sms' and direction='incoming' and phone=$2 and message=$3
               and occurred_at between $4::timestamptz - interval '10 seconds' and $4::timestamptz + interval '10 seconds'
               and (($5::boolean and device_record_id like 'sms:%') or (not $5::boolean and device_record_id like 'rx:%'))
             limit 1`,
            [deviceId, record.phone, record.message, record.occurredAt, broadcastRecord],
          );
          if (duplicate.rowCount) continue;
        }
        const linked = record.recordType === "sms" && record.direction === "outgoing"
          ? await client.query(
              `select job_id from public.sms_jobs where device_id=$1 and status='sent' and phone=$2 and message=$3
               and completed_at between $4::timestamptz - interval '2 minutes' and $4::timestamptz + interval '2 minutes'
               order by abs(extract(epoch from (completed_at-$4::timestamptz))) limit 2`,
              [deviceId, record.phone, record.message, record.occurredAt],
            ) : { rows: [] as any[] };
        // Only an unambiguous phone/body/time match is linked to an automatic Nana job.
        const linkedJobId = linked.rows.length === 1 ? linked.rows[0].job_id : null;
        const inserted = await client.query(
          `insert into public.phone_activity(device_id,device_record_id,record_type,direction,phone,message,call_duration_seconds,occurred_at,linked_sms_job_id)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(device_id,record_type,device_record_id) do nothing returning id`,
          [deviceId, record.deviceRecordId, record.recordType, record.direction, record.phone, record.message, record.duration, record.occurredAt, linkedJobId],
        );
        accepted += inserted.rowCount || 0;
      }
      await client.query("update public.sms_devices set activity_last_synced_at=now(), last_seen_at=now() where device_id=$1", [deviceId]);
      await client.query("commit");
      return res.json({ ok: true, accepted, rejected });
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
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
      await pool.query(`select d.device_id, d.device_name, d.last_seen_at, d.activity_last_synced_at,
      d.last_seen_at > now() - interval '${ONLINE_WINDOW_SECONDS} seconds' as online,
      count(j.job_id) filter (where j.status = 'queued')::int as queue_count,
      count(j.job_id) filter (where j.status = 'processing')::int as processing_count,
      count(j.job_id) filter (where j.status = 'sent' and j.completed_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')::int as today_sent,
      (select count(*)::int from public.phone_activity pa where pa.device_id=d.device_id and pa.record_type='sms'
        and pa.linked_sms_job_id is null and pa.occurred_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul') +
        count(j.job_id) filter (where j.status='sent' and j.completed_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')::int as today_sms,
      (select count(*)::int from public.phone_activity pa where pa.device_id=d.device_id and pa.record_type='call'
        and pa.occurred_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul') as today_calls,
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
        todaySms: row.today_sms,
        todayCalls: row.today_calls,
        activityLastSyncedAt: row.activity_last_synced_at,
        activeBatchId: row.batch_id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        paused: Boolean(row.paused_at),
      })),
    });
  });

  app.get("/api/sms/devices/:deviceId/activity", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const deviceId = String(req.params.deviceId || "").trim();
    const type = String(req.query.type || "");
    const direction = String(req.query.direction || "");
    const search = String(req.query.search || "").trim().slice(0, 100);
    const digits = normalizePhone(search);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");
    if (!deviceId || deviceId.length > 200 || type && !["sms", "call"].includes(type) ||
        direction && !["incoming", "outgoing", "missed"].includes(direction) ||
        from && Number.isNaN(new Date(from).getTime()) || to && Number.isNaN(new Date(to).getTime()))
      return res.status(400).json({ ok: false, error: "invalid_activity_query" });
    const { page, pageSize, offset } = parsePagination(req.query);
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    await ensureSmsTables();
    const { rows } = await pool.query(
      `with combined as (
        select pa.id::text id, pa.record_type, pa.direction, pa.phone, pa.message,
          pa.call_duration_seconds, pa.occurred_at, case when pa.record_type='sms' and pa.direction='outgoing' then 'direct' else pa.record_type end source
        from public.phone_activity pa where pa.device_id=$1 and pa.linked_sms_job_id is null
        union all
        select j.job_id::text id, 'sms', 'outgoing', j.phone, j.message, null,
          coalesce(j.completed_at,j.created_at), 'nana' from public.sms_jobs j
        where j.device_id=$1 and j.status='sent'
      ), filtered as (
        select x.*, c.company_name, c.status contact_status
        from combined x left join public.crm_contacts c on c.phone=x.phone
        where ($2='' or x.record_type=$2) and ($3='' or x.direction=$3)
          and ($4='' or x.phone like '%'||$5||'%' or c.company_name ilike '%'||$4||'%')
          and ($6='' or x.occurred_at >= $6::date)
          and ($7='' or x.occurred_at < $7::date + interval '1 day')
      ) select *, count(*) over()::int total from filtered
        order by occurred_at desc, id desc limit $8 offset $9`,
      [deviceId, type, direction, search, digits, from, to, pageSize, offset],
    );
    const total = rows[0]?.total || 0;
    return res.json({ ok: true, records: rows.map((r) => ({
      id: r.id, recordType: r.record_type, direction: r.direction, phone: r.phone,
      message: r.message, callDurationSeconds: r.call_duration_seconds, occurredAt: r.occurred_at,
      source: r.source, companyName: r.company_name || null, contactStatus: r.contact_status || null,
    })), pagination: pagination(page, pageSize, total) });
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
    const { page, pageSize, offset } = parsePagination(req.query);
    const params = [search, digits];
    const countResult = await pool.query(
      `select count(*)::int total from public.crm_contacts c
       where ($1 = '' or c.company_name ilike '%' || $1 || '%' or ($2 <> '' and c.phone like '%' || $2 || '%'))`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;
    const { rows } = await pool.query(
      `select c.id, c.company_name, c.phone, c.channel, c.status,
      coalesce(j.history_count, 0)::int history_count, j.last_sent_at
      from public.crm_contacts c left join lateral (
        select count(*) filter (where status = 'sent')::int history_count,
        max(completed_at) filter (where status = 'sent') last_sent_at
        from public.sms_jobs where phone = c.phone
      ) j on true
      where ($1 = '' or c.company_name ilike '%' || $1 || '%' or ($2 <> '' and c.phone like '%' || $2 || '%'))
      order by coalesce(j.last_sent_at, c.created_at) desc, c.id desc limit $3 offset $4`,
      [...params, pageSize, offset],
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
      pagination: pagination(page, pageSize, total),
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
    const { page, pageSize, offset } = parsePagination(req.query);
    const countResult = await pool.query(
      `select count(*)::int total from public.sms_jobs j
       join public.crm_contacts c on c.phone = j.phone where c.id = $1`,
      [req.params.id],
    );
    const total = countResult.rows[0]?.total || 0;
    const { rows } = await pool.query(
      `select j.job_id, j.message, j.status, j.completed_at, j.created_at
      from public.sms_jobs j join public.crm_contacts c on c.phone = j.phone where c.id = $1
      order by coalesce(j.completed_at, j.created_at) desc, j.job_id desc limit $2 offset $3`,
      [req.params.id, pageSize, offset],
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
      pagination: pagination(page, pageSize, total),
    });
  });

  app.get("/api/crm/sms-history", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool)
      return res.status(503).json({ ok: false, error: "db_not_configured" });
    const { page, pageSize, offset } = parsePagination(req.query);
    const search = String(req.query.search || "").trim();
    const digits = normalizePhone(search);
    const requestedStatus = String(req.query.status || "");
    const status = JOB_STATUSES.includes(requestedStatus as any) ? requestedStatus : "";
    const from = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from || "")) ? String(req.query.from) : "";
    const to = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to || "")) ? String(req.query.to) : "";
    const params = [search, digits, status, from, to];
    const where = `where ($1 = '' or coalesce(c.company_name, j.company_name, '') ilike '%' || $1 || '%' or ($2 <> '' and j.phone like '%' || $2 || '%'))
      and ($3 = '' or j.status = $3) and ($4 = '' or coalesce(j.completed_at, j.created_at) >= $4::date)
      and ($5 = '' or coalesce(j.completed_at, j.created_at) < $5::date + interval '1 day')`;
    const countResult = await pool.query(
      `select count(*)::int total from public.sms_jobs j left join public.crm_contacts c on c.phone = j.phone ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;
    const { rows } = await pool.query(`select j.job_id, coalesce(c.company_name, j.company_name, '') company_name, j.phone,
      coalesce(c.channel, j.channel, '') channel, j.message, j.status, j.scheduled_at, j.completed_at, j.created_at, d.device_name,
      case when j.status = 'sent' then j.completed_at - max(j.completed_at) filter (where j.status = 'sent') over
        (partition by j.device_id order by j.completed_at rows between unbounded preceding and 1 preceding) end send_interval
      from public.sms_jobs j left join public.crm_contacts c on c.phone = j.phone left join public.sms_devices d on d.device_id = j.device_id
      ${where} order by coalesce(j.completed_at, j.created_at) desc, j.job_id desc limit $6 offset $7`,
      [...params, pageSize, offset]);
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
      pagination: pagination(page, pageSize, total),
    });
  });

  app.post("/api/crm/sms/analyze-template", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const template = String(req.body?.template || "").trim();
    if (!template || template.length > 4000)
      return res.status(400).json({ ok: false, error: "invalid_template" });
    try {
      const analysis = await openAiStructured("sms_template_analysis", {
        type: "object", additionalProperties: false,
        properties: {
          topic: { type: "string" }, keyPoints: { type: "array", items: { type: "string" } },
          purpose: { type: "string" }, tone: { type: "string" }, endingStyle: { type: "string" },
          fixedFacts: { type: "array", items: { type: "string" } },
        },
        required: ["topic", "keyPoints", "purpose", "tone", "endingStyle", "fixedFacts"],
      }, [
        "아래 기준 SMS 본문을 한국어로 분석하세요.",
        "기준 문자에 명시된 사실만 추출하고 추론하거나 가격, 혜택, 서비스, 링크, 전화번호를 만들지 마세요.",
        "{{companyName}}과 {{channel}}은 치환 변수이며 사실로 해석하지 마세요.",
        "광고 표시와 무료수신거부 문구는 분석하거나 생성하지 마세요.",
        `기준 문자:\n${template}`,
      ].join("\n"));
      return res.json({ ok: true, analysis, model: SMS_AI_MODEL });
    } catch (error: any) {
      console.error("SMS template analysis failed:", error);
      return res.status(502).json({ ok: false, error: error.message || "ai_analysis_failed" });
    }
  });

  app.post("/api/crm/sms/generate-message", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const template = String(req.body?.template || "").trim();
    const analysis = req.body?.analysis as SmsTemplateAnalysis;
    const contact = req.body?.contact || {};
    if (!template || template.length > 4000 || !analysis?.topic || !Array.isArray(analysis.keyPoints))
      return res.status(400).json({ ok: false, error: "invalid_generation_request" });
    const personalized = applyContactVariables(template, contact);
    try {
      const generated = await openAiStructured("sms_generated_body", {
        type: "object", additionalProperties: false,
        properties: { body: { type: "string" } }, required: ["body"],
      }, [
        "아래 개인화된 기준 문자와 분석을 바탕으로 같은 의미와 영업 목적의 한국어 B2B SMS 본문 한 개만 자연스럽게 변형하세요.",
        "없는 사실, 가격, 혜택, 서비스 범위, 링크, 전화번호를 추가하지 말고 업체 상황을 단정하지 마세요.",
        "짧고 정중하게 쓰며 과장하지 마세요. 목적은 표현 다양화이며 스팸 탐지 회피가 아닙니다.",
        "(광고), 발신자명, 무료수신거부 및 080 번호는 절대로 출력하지 마세요.",
        "개인화된 기준 문자의 업체명과 채널 값은 그대로 유지하세요.",
        `개인화된 기준 문자:\n${personalized}`,
        `확정 분석:\n${JSON.stringify(analysis)}`,
      ].join("\n"));
      const body = String(generated.body || "").trim();
      if (!body) throw new Error("empty_ai_body");
      if (/\(광고\)|무료\s*수신거부|080[-\d]/.test(body))
        throw new Error("ai_body_contains_compliance_text");
      return res.json({ ok: true, body, model: SMS_AI_MODEL });
    } catch (error: any) {
      console.error("SMS message generation failed:", error);
      return res.status(502).json({ ok: false, error: error.message || "ai_generation_failed" });
    }
  });

  app.get("/api/crm/sms/templates", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    const result = await pool.query(`select id, name, template, analysis, ad_enabled "adEnabled", advertiser_name "advertiserName",
      opt_out_enabled "optOutEnabled", opt_out_number "optOutNumber", created_at "createdAt", last_used_at "lastUsedAt"
      from public.sms_message_templates order by last_used_at desc limit 30`);
    return res.json({ ok: true, templates: result.rows });
  });

  app.post("/api/crm/sms/templates", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const template = String(req.body?.template || "").trim();
    if (!template || template.length > 4000) return res.status(400).json({ ok: false, error: "invalid_template" });
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    const result = await pool.query(`insert into public.sms_message_templates
      (name, template, analysis, ad_enabled, advertiser_name, opt_out_enabled, opt_out_number)
      values ($1,$2,$3,$4,$5,$6,$7) returning id`, [
      String(req.body?.name || req.body?.analysis?.topic || "기준 문자").slice(0, 100), template,
      req.body?.analysis || null, Boolean(req.body?.adEnabled), String(req.body?.advertiserName || "").slice(0, 100),
      Boolean(req.body?.optOutEnabled), String(req.body?.optOutNumber || "").slice(0, 100),
    ]);
    return res.status(201).json({ ok: true, id: result.rows[0].id });
  });

  app.post("/api/crm/sms/templates/:id/use", async (req, res) => {
    const auth = await requireAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });
    await pool.query("update public.sms_message_templates set last_used_at = now() where id = $1", [req.params.id]);
    return res.json({ ok: true });
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
