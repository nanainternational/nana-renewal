import type { Express, Request } from "express";
import { getPgPool } from "./credits";
import { ensureSmsTablesOnce, requireAdmin } from "./sms-service";

const MAX_IMPORT = 500;
const MAX_MONTHLY_PER_DEVICE = 1500;
let ready: Promise<void> | null = null;

function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}
function textValue(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validHttpsLink(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && Boolean(u.hostname) && !u.username && !u.password;
  } catch { return false; }
}
function isWithinSixMonths(value: string, when = new Date()) {
  const cutoff = new Date(when);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
  const completed = new Date(value + "T00:00:00+09:00");
  return completed <= when && completed >= cutoff;
}
function nextSendDate(completedOn: string, delayDays: number) {
  // 02:00 UTC = 11:00 KST. The SMS is never sent immediately on import.
  const due = new Date(Date.parse(completedOn + "T02:00:00Z") + delayDays * 86400000);
  if (due.getTime() > Date.now() + 120000) return due;
  const tomorrowKst = new Date(Date.now() + 9 * 3600000 + 86400000);
  const next = new Date(Date.UTC(tomorrowKst.getUTCFullYear(), tomorrowKst.getUTCMonth(), tomorrowKst.getUTCDate(), 2));
  return next;
}
function monthBounds(date: Date) {
  const kst = new Date(date.getTime() + 9 * 3600000);
  return [
    new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1) - 9 * 3600000),
    new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() + 1, 1) - 9 * 3600000),
  ];
}
function error(res: any, status: number, code: string) {
  return res.status(status).json({ ok: false, error: code });
}
async function getAuth(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return { ok: false as const, status: auth.status, error: auth.error };
  const email = textValue((auth.admin as any).email, 254).toLowerCase();
  if (!email) return { ok: false as const, status: 403, error: "admin_email_missing" };
  return { ok: true as const, email };
}
async function ensureTables() {
  if (!ready) {
    ready = (async () => {
      await ensureSmsTablesOnce();
      const pool = getPgPool();
      if (!pool) throw new Error("db_not_configured");
      await pool.query("create table if not exists public.happycall_settings (owner_email text primary key, store_name text not null default '', consult_url text not null default '', delay_days integer not null default 2 check (delay_days between 1 and 5), updated_at timestamptz not null default now())");
      await pool.query("create table if not exists public.happycall_orders (id uuid primary key default gen_random_uuid(), owner_email text not null, market text not null, order_no text not null, customer_name text not null default '', phone text not null default '', product_name text not null default '', completed_on date, order_state text not null default '확인필요', consult_state text not null default '미상담', job_id uuid references public.sms_jobs(job_id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (owner_email, market, order_no))");
      await pool.query("create index if not exists happycall_orders_owner_updated on public.happycall_orders(owner_email, updated_at desc)");
    })().catch((err) => { ready = null; throw err; });
  }
  return ready;
}
function messageForOrder(store: string, customerName: string, productName: string, link: string) {
  const greeting = customerName ? customerName + " 고객님, " : "고객님, ";
  return [
    "안녕하세요. " + store + "입니다.",
    greeting + "주문하신 " + (productName || "상품") + "은 잘 받아보셨을까요?",
    "상품에 문제가 있거나 이용 중 불편한 점이 있다면 아래 상담 링크로 문의 부탁드립니다.",
    link,
    "감사합니다.",
  ].join("\n");
}

export function registerHappyCallRoutes(app: Express) {
  app.get("/api/happycall/dashboard", async (req, res) => {
    const auth = await getAuth(req);
    if (!auth.ok) return error(res, auth.status, auth.error);
    try {
      await ensureTables();
      const pool = getPgPool()!;
      const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
      const [settings, summary, rows] = await Promise.all([
        pool.query("select store_name as \"storeName\", consult_url as \"consultUrl\", delay_days as \"delayDays\" from public.happycall_settings where owner_email=$1", [auth.email]),
        pool.query("select count(*)::int as total, count(*) filter (where job_id is null and order_state='배송완료')::int as pending, count(*) filter (where order_state in ('취소','반품','환불'))::int as excluded, count(*) filter (where job_id is not null)::int as booked from public.happycall_orders where owner_email=$1", [auth.email]),
        pool.query("select o.id, o.market, o.order_no as \"orderNo\", o.customer_name as \"customerName\", o.phone, o.product_name as \"productName\", o.completed_on as \"completedOn\", o.order_state as \"orderState\", o.consult_state as \"consultState\", o.job_id as \"jobId\", j.status as \"smsStatus\", j.scheduled_at as \"scheduledAt\" from public.happycall_orders o left join public.sms_jobs j on j.job_id=o.job_id where o.owner_email=$1 order by o.updated_at desc, o.id desc limit 100 offset $2", [auth.email, (page - 1) * 100]),
      ]);
      return res.json({ ok: true, settings: settings.rows[0] || { storeName: "", consultUrl: "", delayDays: 2 }, summary: summary.rows[0], orders: rows.rows, page });
    } catch (e) { console.error("happycall dashboard:", e); return error(res, 500, "happycall_dashboard_failed"); }
  });

  app.put("/api/happycall/settings", async (req, res) => {
    const auth = await getAuth(req);
    if (!auth.ok) return error(res, auth.status, auth.error);
    const storeName = textValue(req.body?.storeName, 80);
    const consultUrl = textValue(req.body?.consultUrl, 1000);
    const delayDays = Number(req.body?.delayDays);
    if (!storeName || !validHttpsLink(consultUrl) || !Number.isInteger(delayDays) || delayDays < 1 || delayDays > 5)
      return error(res, 400, "invalid_settings");
    try {
      await ensureTables();
      await getPgPool()!.query("insert into public.happycall_settings(owner_email,store_name,consult_url,delay_days) values($1,$2,$3,$4) on conflict(owner_email) do update set store_name=excluded.store_name, consult_url=excluded.consult_url, delay_days=excluded.delay_days, updated_at=now()", [auth.email, storeName, consultUrl, delayDays]);
      return res.json({ ok: true });
    } catch (e) { console.error("happycall settings:", e); return error(res, 500, "happycall_settings_failed"); }
  });

  app.post("/api/happycall/orders/import", async (req, res) => {
    const auth = await getAuth(req);
    if (!auth.ok) return error(res, auth.status, auth.error);
    const market = textValue(req.body?.market, 60);
    const items = req.body?.orders;
    if (!market || !Array.isArray(items) || !items.length || items.length > MAX_IMPORT)
      return error(res, 400, "invalid_import");
    const pool = getPgPool();
    if (!pool) return error(res, 503, "db_not_configured");
    const client = await pool.connect();
    try {
      await ensureTables();
      await client.query("begin");
      let created = 0, updated = 0, invalid = 0, cancelled = 0;
      for (const raw of items) {
        const orderNo = textValue(raw?.orderNo, 150);
        const phone = normalizePhone(raw?.phone);
        const completedOn = textValue(raw?.completedOn, 10);
        const state = textValue(raw?.orderState, 20);
        if (!orderNo || !/^01\d{8,9}$/.test(phone) || (completedOn && !validDate(completedOn))) { invalid++; continue; }
        const orderState = /취소/.test(state) ? "취소" : /반품/.test(state) ? "반품" : /환불/.test(state) ? "환불" : /배송완료|수령완료|구매확정/.test(state) ? "배송완료" : "확인필요";
        const existing = await client.query("select id, job_id from public.happycall_orders where owner_email=$1 and market=$2 and order_no=$3 for update", [auth.email, market, orderNo]);
        const values = [auth.email, market, orderNo, textValue(raw?.customerName, 100), phone, textValue(raw?.productName, 250), completedOn || null, orderState];
        await client.query("insert into public.happycall_orders(owner_email,market,order_no,customer_name,phone,product_name,completed_on,order_state) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(owner_email,market,order_no) do update set customer_name=excluded.customer_name, phone=excluded.phone, product_name=excluded.product_name, completed_on=coalesce(excluded.completed_on,happycall_orders.completed_on), order_state=excluded.order_state, updated_at=now()", values);
        if (existing.rowCount) updated++; else created++;
        if (existing.rows[0]?.job_id && orderState !== "배송완료") {
          const result = await client.query("update public.sms_jobs set status='cancelled',error='주문 취소·반품·상태 변경',completed_at=now() where job_id=$1 and status='queued'", [existing.rows[0].job_id]);
          cancelled += result.rowCount || 0;
        }
      }
      await client.query("commit");
      return res.json({ ok: true, created, updated, invalid, cancelled });
    } catch (e) {
      await client.query("rollback");
      console.error("happycall import:", e);
      return error(res, 500, "happycall_import_failed");
    } finally { client.release(); }
  });

  app.patch("/api/happycall/orders/:id/consult", async (req, res) => {
    const auth = await getAuth(req);
    if (!auth.ok) return error(res, auth.status, auth.error);
    const state = textValue(req.body?.consultState, 20);
    if (!["미상담","상담필요","상담중","상담완료"].includes(state) || !/^[a-f0-9-]{36}$/i.test(req.params.id)) return error(res, 400, "invalid_consult_state");
    try {
      await ensureTables();
      const result = await getPgPool()!.query("update public.happycall_orders set consult_state=$1,updated_at=now() where id=$2 and owner_email=$3 returning id", [state, req.params.id, auth.email]);
      return result.rowCount ? res.json({ ok: true }) : error(res, 404, "order_not_found");
    } catch (e) { console.error("happycall consult:", e); return error(res, 500, "happycall_consult_failed"); }
  });

  app.post("/api/happycall/orders/queue", async (req, res) => {
    const auth = await getAuth(req);
    if (!auth.ok) return error(res, auth.status, auth.error);
    const deviceId = textValue(req.body?.deviceId, 200);
    const ids = Array.isArray(req.body?.orderIds) ? [...new Set(req.body.orderIds.map((x: unknown) => textValue(x, 50)))] : [];
    if (!deviceId || !ids.length || ids.length > 200 || ids.some((x) => !/^[a-f0-9-]{36}$/i.test(x)) || req.body?.confirmPolicy !== true)
      return error(res, 400, "invalid_queue_request");
    const pool = getPgPool();
    if (!pool) return error(res, 503, "db_not_configured");
    const client = await pool.connect();
    try {
      await ensureTables();
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext('nana_happycall_queue'))");
      const device = await client.query("select 1 from public.sms_devices where device_id=$1 and deleted_at is null", [deviceId]);
      if (!device.rowCount) { await client.query("rollback"); return error(res, 404, "device_not_found"); }
      const settings = await client.query("select store_name,consult_url,delay_days from public.happycall_settings where owner_email=$1", [auth.email]);
      const s = settings.rows[0];
      if (!s?.store_name || !validHttpsLink(s?.consult_url || "")) { await client.query("rollback"); return error(res, 400, "settings_required"); }
      const orders = await client.query("select * from public.happycall_orders where owner_email=$1 and id=any($2::uuid[]) for update", [auth.email, ids]);
      let queued = 0, excluded = 0;
      const monthly = new Map<string, number>();
      const bookedPhones = new Set<string>();
      for (const order of orders.rows) {
        const date = order.completed_on instanceof Date ? order.completed_on.toISOString().slice(0,10) : String(order.completed_on || "").slice(0,10);
        if (order.job_id || order.order_state !== "배송완료" || !validDate(date) || !isWithinSixMonths(date) || !/^01\d{8,9}$/.test(order.phone)) { excluded++; continue; }
        const suppressed = await client.query("select 1 from public.sms_suppressions where phone=$1 and released_at is null limit 1", [order.phone]);
        if (suppressed.rowCount) { excluded++; continue; }
        const scheduledAt = nextSendDate(date, s.delay_days);
        if (!isWithinSixMonths(date, scheduledAt)) { excluded++; continue; }
        const bounds = monthBounds(scheduledAt), key = bounds[0].toISOString();
        if (!monthly.has(key)) {
          const q = await client.query("select count(*)::int as n from public.sms_jobs where device_id=$1 and status in ('queued','processing','sent','failed') and coalesce(scheduled_at,completed_at,created_at)>=$2 and coalesce(scheduled_at,completed_at,created_at)<$3", [deviceId, ...bounds]);
          monthly.set(key, Number(q.rows[0].n));
        }
        if ((monthly.get(key) || 0) >= MAX_MONTHLY_PER_DEVICE) { excluded++; continue; }
        const dayStart = new Date(scheduledAt.getTime() - 9*3600000);
        dayStart.setUTCHours(0,0,0,0);
        const startKst = new Date(dayStart.getTime() + 9*3600000);
        const duplicateKey = order.phone + ":" + startKst.toISOString();
        if (bookedPhones.has(duplicateKey)) { excluded++; continue; }
        const dup = await client.query("select 1 from public.sms_jobs where device_id=$1 and phone=$2 and status in ('queued','processing','sent') and coalesce(scheduled_at,completed_at,created_at)>=$3 and coalesce(scheduled_at,completed_at,created_at)<$4 limit 1", [deviceId, order.phone, startKst, new Date(startKst.getTime()+86400000)]);
        if (dup.rowCount) { excluded++; continue; }
        const message = messageForOrder(s.store_name, order.customer_name, order.product_name, s.consult_url);
        const job = await client.query("insert into public.sms_jobs(device_id,phone,message,company_name,channel,scheduled_at) values($1,$2,$3,$4,$5,$6) returning job_id", [deviceId, order.phone, message, order.customer_name, order.market, scheduledAt]);
        await client.query("update public.happycall_orders set job_id=$1,updated_at=now() where id=$2", [job.rows[0].job_id, order.id]);
        monthly.set(key, (monthly.get(key) || 0) + 1);
        bookedPhones.add(duplicateKey);
        queued++;
      }
      excluded += Math.max(0, ids.length - orders.rowCount);
      await client.query("commit");
      return res.json({ ok: true, queued, excluded });
    } catch (e) {
      await client.query("rollback");
      console.error("happycall queue:", e);
      return error(res, 500, "happycall_queue_failed");
    } finally { client.release(); }
  });
}
