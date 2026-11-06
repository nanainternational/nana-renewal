import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getPgPool } from "./credits";

type AdminLookup = (req: Request) => Promise<{ admin: any | null; reason?: string; email?: string }>;
type Platform = "ably" | "4910" | "zigzag" | "domeggook";
const PLATFORMS = new Set<Platform>(["ably", "4910", "zigzag", "domeggook"]);
let tableInit: Promise<void> | null = null;

async function ensureTables(): Promise<void> {
  if (tableInit) return tableInit;
  tableInit = (async () => {
    const pool = getPgPool();
    if (!pool) throw new Error("db_not_configured");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
    await client.query(
      "CREATE TABLE IF NOT EXISTS public.collector_jobs (" +
      "id uuid PRIMARY KEY DEFAULT gen_random_uuid()," +
      "platform text NOT NULL, status text NOT NULL DEFAULT 'queued'," +
      "created_by text NOT NULL, worker_id text, progress integer NOT NULL DEFAULT 0," +
      "message text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()," +
      "started_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()," +
      "finished_at timestamptz)"
    );
    await client.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS collector_one_active_per_platform " +
      "ON public.collector_jobs(platform) " +
      "WHERE status IN ('queued','running','cancel_requested')"
    );
    await client.query(
      "CREATE TABLE IF NOT EXISTS public.collector_job_events (" +
      "id bigserial PRIMARY KEY, job_id uuid NOT NULL REFERENCES public.collector_jobs(id) ON DELETE CASCADE," +
      "message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS collector_job_events_job_id ON public.collector_job_events(job_id, id DESC)"
    );
    await client.query(
      "CREATE TABLE IF NOT EXISTS public.collector_workers (" +
      "worker_id text PRIMARY KEY, worker_name text NOT NULL DEFAULT ''," +
      "version text NOT NULL DEFAULT '', current_job uuid," +
      "last_seen timestamptz NOT NULL DEFAULT now())"
    );
      // Public schema is exposed via Supabase Data API: deny all client access.
      await client.query("ALTER TABLE public.collector_jobs ENABLE ROW LEVEL SECURITY");
      await client.query("ALTER TABLE public.collector_job_events ENABLE ROW LEVEL SECURITY");
      await client.query("ALTER TABLE public.collector_workers ENABLE ROW LEVEL SECURITY");
      await client.query("REVOKE ALL ON TABLE public.collector_jobs, public.collector_job_events, public.collector_workers FROM anon, authenticated");
      await client.query("REVOKE ALL ON SEQUENCE public.collector_job_events_id_seq FROM anon, authenticated");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })().catch((error) => {
    tableInit = null;
    throw error;
  });
  return tableInit;
}

function workerAllowed(req: Request): boolean {
  const expected = String(process.env.COLLECTOR_WORKER_TOKEN || "");
  const actual = String(req.header("x-collector-worker-token") || "");
  if (expected.length < 32 || actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function validWorkerId(value: unknown): string | null {
  const id = String(value || "");
  return /^[A-Za-z0-9_.-]{1,64}$/.test(id) ? id : null;
}

function validateUuid(value: unknown): string | null {
  const id = String(value || "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

function safeAdminOrigin(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = String(req.header("origin") || "").replace(/\/$/, "");
  if (!origin) return false;
  const allowed = new Set([
    "https://nanainter.com",
    "https://www.nanainter.com",
    ...String(process.env.COLLECTOR_ALLOWED_ORIGINS || "")
      .split(",").map((value) => value.trim()).filter(Boolean),
  ]);
  const host = String(req.header("x-forwarded-host") || req.header("host") || "")
    .split(",")[0].trim();
  try {
    const url = new URL(origin);
    if (allowed.has(origin)) return true;
    return url.host === host && (url.protocol === "https:" || url.hostname === "localhost");
  } catch {
    return false;
  }
}

async function requireAdmin(req: Request, res: Response, lookup: AdminLookup): Promise<boolean> {
  if (String(process.env.SESSION_SECRET || "").length < 32) {
    res.status(503).json({ ok: false, error: "session_secret_not_configured" });
    return false;
  }
  if (!safeAdminOrigin(req)) {
    res.status(403).json({ ok: false, error: "invalid_origin" });
    return false;
  }
  const { admin, reason } = await lookup(req);
  if (!admin) {
    res.status(reason === "not_logged_in" ? 401 : 403).json({ ok: false, error: "forbidden" });
    return false;
  }
  if (!["OWNER", "ADMIN"].includes(String(admin.role))) {
    res.status(403).json({ ok: false, error: "forbidden_role" });
    return false;
  }
  return true;
}

function handler(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, _next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch((error: any) => {
      console.error("[collector]", error);
      if (!res.headersSent) res.status(error?.message === "db_not_configured" ? 503 : 500)
        .json({ ok: false, error: error?.message === "db_not_configured" ? "db_not_configured" : "server_error" });
    });
  };
}

export function registerCollectorRoutes(app: Express, getCurrentAdmin: AdminLookup) {
  const admin = (fn: (req: Request, res: Response) => Promise<unknown>) =>
    handler(async (req, res) => {
      if (!await requireAdmin(req, res, getCurrentAdmin)) return;
      await ensureTables();
      return fn(req, res);
    });

  const worker = (fn: (req: Request, res: Response) => Promise<unknown>) =>
    handler(async (req, res) => {
      if (!workerAllowed(req)) return res.status(403).json({ ok: false, error: "forbidden" });
      await ensureTables();
      return fn(req, res);
    });

  // Access checks must work even before the collector tables/worker are configured.
  app.get("/api/admin/collector/access", handler(async (req, res) => {
    if (!await requireAdmin(req, res, getCurrentAdmin)) return;
    return res.json({ ok: true });
  }));

  app.get("/api/admin/collector/overview", admin(async (_req, res) => {
    const pool = getPgPool()!;
    const [jobs, workers] = await Promise.all([
      pool.query("SELECT id,platform,status,created_by,worker_id,progress,message,created_at,started_at,updated_at,finished_at FROM public.collector_jobs ORDER BY created_at DESC LIMIT 60"),
      pool.query(
        "SELECT worker_id,worker_name,version,current_job,last_seen," +
        "(last_seen > now() - interval '60 seconds') AS online " +
        "FROM public.collector_workers ORDER BY last_seen DESC LIMIT 20"
      ),
    ]);
    return res.json({ ok: true, jobs: jobs.rows, workers: workers.rows });
  }));

  app.get("/api/admin/collector/jobs/:id/events", admin(async (req, res) => {
    const id = validateUuid(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "invalid_job_id" });
    const { rows } = await getPgPool()!.query(
      "SELECT id,message,created_at FROM public.collector_job_events WHERE job_id=$1 ORDER BY id DESC LIMIT 100", [id]
    );
    return res.json({ ok: true, events: rows.reverse() });
  }));

  app.post("/api/admin/collector/jobs", admin(async (req, res) => {
    const platform = String(req.body?.platform || "") as Platform;
    if (!PLATFORMS.has(platform)) return res.status(400).json({ ok: false, error: "invalid_platform" });
    const { email } = await getCurrentAdmin(req);
    try {
      const { rows } = await getPgPool()!.query(
        "INSERT INTO public.collector_jobs(platform, created_by) VALUES($1,$2) " +
        "RETURNING id,platform,status,created_at",
        [platform, String(email || "").slice(0,250)]
      );
      return res.status(201).json({ ok: true, job: rows[0] });
    } catch (error: any) {
      if (error?.code === "23505") return res.status(409).json({ ok: false, error: "already_queued_or_running" });
      throw error;
    }
  }));

  app.post("/api/admin/collector/jobs/:id/cancel", admin(async (req, res) => {
    const id = validateUuid(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "invalid_job_id" });
    const { rows } = await getPgPool()!.query(
      "UPDATE public.collector_jobs SET " +
      "status=CASE WHEN status='queued' THEN 'cancelled' ELSE 'cancel_requested' END, " +
      "finished_at=CASE WHEN status='queued' THEN now() ELSE finished_at END, " +
      "updated_at=now() WHERE id=$1 AND status IN ('queued','running') " +
      "RETURNING id,status", [id]
    );
    if (!rows.length) return res.status(409).json({ ok: false, error: "not_cancellable" });
    return res.json({ ok: true, job: rows[0] });
  }));

  app.post("/api/internal/collector/heartbeat", worker(async (req, res) => {
    const workerId = validWorkerId(req.body?.worker_id);
    if (!workerId) return res.status(400).json({ ok: false, error: "invalid_worker_id" });
    const name = String(req.body?.worker_name || "").slice(0,100);
    const version = String(req.body?.version || "").slice(0,50);
    const job = validateUuid(req.body?.current_job);
    await getPgPool()!.query(
      "INSERT INTO public.collector_workers(worker_id,worker_name,version,current_job,last_seen) " +
      "VALUES($1,$2,$3,$4,now()) ON CONFLICT(worker_id) DO UPDATE SET " +
      "worker_name=EXCLUDED.worker_name,version=EXCLUDED.version," +
      "current_job=EXCLUDED.current_job,last_seen=now()",
      [workerId, name, version, job]
    );
    return res.json({ ok: true });
  }));

  app.post("/api/internal/collector/next", worker(async (req, res) => {
    const workerId = validWorkerId(req.body?.worker_id);
    if (!workerId) return res.status(400).json({ ok: false, error: "invalid_worker_id" });
    const { rows } = await getPgPool()!.query(
      "WITH chosen AS (" +
      "SELECT id FROM public.collector_jobs WHERE status='queued' " +
      "ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1" +
      ") UPDATE public.collector_jobs j SET status='running',worker_id=$1," +
      "started_at=now(),updated_at=now(),message='수집 시작 요청 전달' " +
      "FROM chosen WHERE j.id=chosen.id RETURNING j.id,j.platform,j.status",
      [workerId]
    );
    return res.json({ ok: true, job: rows[0] || null });
  }));

  app.get("/api/internal/collector/jobs/:id/status", worker(async (req, res) => {
    const id = validateUuid(req.params.id);
    const workerId = validWorkerId(req.query.worker_id);
    if (!id || !workerId) return res.status(400).json({ ok: false, error: "invalid_request" });
    const { rows } = await getPgPool()!.query(
      "SELECT status FROM public.collector_jobs WHERE id=$1 AND worker_id=$2", [id, workerId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: "job_not_found" });
    return res.json({ ok: true, status: rows[0].status });
  }));

  app.post("/api/internal/collector/jobs/:id/report", worker(async (req, res) => {
    const id = validateUuid(req.params.id);
    const workerId = validWorkerId(req.body?.worker_id);
    const status = String(req.body?.status || "running");
    if (!id || !workerId || !["running", "completed", "cancelled", "failed"].includes(status)) {
      return res.status(400).json({ ok: false, error: "invalid_report" });
    }
    const n = Number(req.body?.progress);
    const progress = Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null;
    const message = String(req.body?.message || "").slice(0,1000);
    const pool = getPgPool()!;
    const { rows } = await pool.query(
      "UPDATE public.collector_jobs SET " +
      "status=CASE WHEN status='cancel_requested' AND $3='running' THEN status ELSE $3 END," +
      "progress=COALESCE($4,progress),message=$5,updated_at=now()," +
      "finished_at=CASE WHEN $3 IN ('completed','cancelled','failed') THEN now() ELSE finished_at END " +
      "WHERE id=$1 AND worker_id=$2 AND status IN ('running','cancel_requested') RETURNING id,status",
      [id, workerId, status, progress, message]
    );
    if (!rows.length) {
      const current = await pool.query(
        "SELECT status FROM public.collector_jobs WHERE id=$1 AND worker_id=$2", [id, workerId]
      );
      if (current.rows[0]?.status === status && ["completed","cancelled","failed"].includes(status)) {
        return res.json({ ok: true, status, duplicate: true });
      }
      return res.status(409).json({ ok: false, error: "job_not_active" });
    }
    if (message) await pool.query(
      "INSERT INTO public.collector_job_events(job_id,message) VALUES($1,$2)", [id, message]
    );
    return res.json({ ok: true, status: rows[0].status });
  }));
}
