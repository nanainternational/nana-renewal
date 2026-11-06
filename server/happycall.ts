import type { Express, Request } from "express";
import jwt from "jsonwebtoken";
import { getAdminUserByEmail, normalizeEmail, syncAdminUserByEmail } from "./order-system";
import { getPgPool } from "./credits";
import { HAPPY_CALL_DAILY_LIMIT, HAPPY_CALL_MONTHLY_LIMIT, kstDayStart, kstMonthStart, kstNextMonthStart, nextHappyCallSlot, sixMonthsAfter } from "./happycall-schedule";

async function requireAdmin(req: Request): Promise<any> {
  const token = req.cookies?.token;
  if (!token) return { ok: false, status: 403, error: "not_logged_in" };
  let user: any;
  try { user = jwt.verify(token, process.env.SESSION_SECRET || "your-secret-key-change-this"); }
  catch { return { ok: false, status: 403, error: "invalid_session" }; }
  const email = normalizeEmail(user.email);
  if (!email) return { ok: false, status: 403, error: "missing_email" };
  await syncAdminUserByEmail(email);
  const admin = await getAdminUserByEmail(email);
  if (!admin?.is_active) return { ok: false, status: 403, error: "not_admin" };
  return { ok: true, admin, email };
}
const clean = (x: unknown, n = 160) => String(x || "").trim().slice(0, n);
const phoneOf = (x: unknown) => clean(x, 50).replace(/\D/g, "");
const formatBody = (body: string, fields: Record<string, string>) =>
  body.replace(/\{\{(channel|productName|customerName)\}\}/g, (_, key: string) => fields[key] || "");
const DEFAULT_BODY = "안녕하세요. {{channel}}입니다.\n구매하신 {{productName}}은 잘 받아보셨나요?\n상품에 문제가 있거나 불편한 점이 있으시면 상담 링크로 문의해주세요.";

export function registerHappyCallRoutes(app: Express, ensureSms: () => Promise<void>) {
  async function authorized(req: Request) {
    const a = await requireAdmin(req);
    if (!a.ok) return a;
    return { ok: true, email: String(a.email || "").toLowerCase() };
  }
  async function db() {
    const pool = getPgPool();
    if (!pool) return null;
    await ensureSms();
    await pool.query(
      "create table if not exists public.happycall_orders (" +
      "id uuid primary key default gen_random_uuid(), owner_email text not null, channel text not null," +
      "order_number text not null, customer_name text not null default '', phone text not null," +
      "product_name text not null default '', delivered_at timestamptz not null," +
      "consultation_url text not null, device_id text not null references public.sms_devices(device_id)," +
      "job_id uuid references public.sms_jobs(job_id), state text not null default 'reserved'," +
      "created_at timestamptz not null default now(), updated_at timestamptz not null default now()," +
      "unique(owner_email, channel, order_number))"
    );
    return pool;
  }
  app.get("/api/happycall/orders", async (req, res) => {
    const a = await authorized(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });
    const pool = await db();
    if (!pool) return res.status(503).json({ error: "db_not_configured" });
    const rows = await pool.query(
      "select o.channel, o.order_number as \"orderNumber\", o.customer_name as \"customerName\"," +
      "o.phone, o.product_name as \"productName\", o.state, o.delivered_at as \"deliveredAt\"," +
      "j.status as \"sendStatus\", j.scheduled_at as \"scheduledAt\", j.error " +
      "from public.happycall_orders o left join public.sms_jobs j on j.job_id=o.job_id " +
      "where o.owner_email=$1 order by o.created_at desc limit 500", [a.email]
    );
    return res.json({ orders: rows.rows });
  });
  app.post("/api/happycall/import", async (req, res) => {
    const a = await authorized(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });
    if (req.body?.confirmPolicy !== true) return res.status(400).json({ error: "판매채널 정책 및 고객정보 이용 권한을 확인해주세요." });
    const deviceId = clean(req.body?.deviceId, 120);
    const channel = clean(req.body?.channel, 80);
    const link = clean(req.body?.consultationUrl, 500);
    const days = Number(req.body?.days ?? 2);
    const defaultBody = clean(req.body?.messageTemplate || DEFAULT_BODY, 2000);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    let url: URL;
    try { url = new URL(link); } catch { return res.status(400).json({ error: "상담 링크가 올바르지 않습니다." }); }
    if (url.protocol !== "https:" || !url.hostname || !deviceId || !channel || ![1,2,3,5].includes(days) || !defaultBody || items.length < 1 || items.length > 500)
      return res.status(400).json({ error: "입력값을 확인해주세요. 주문은 최대 500건입니다." });
    const pool = await db();
    if (!pool) return res.status(503).json({ error: "db_not_configured" });
    const client = await pool.connect();
    const stat = { registered: 0, duplicate: 0, excluded: 0, cancelled: 0, quotaExcluded: 0 };
    try {
      await client.query("begin");
      const device = await client.query(
        "select device_id from public.sms_devices where device_id=$1 and deleted_at is null for update", [deviceId]);
      if (!device.rowCount) throw new Error("등록된 업무폰을 선택해주세요.");
      const dailyCache = new Map<number, number>();
      const monthlyCache = new Map<number, number>();
      const reservedDates = new Map<number, number>();
      async function reserveSlot(requested: Date, expiry: Date) {
        let at = nextHappyCallSlot(requested);
        let safety = 0;
        while (at.getTime() < expiry.getTime() && safety++ < 80000) {
          const dayStart = kstDayStart(at);
          const dayKey = dayStart.getTime();
          if (!dailyCache.has(dayKey)) {
            const dayCount = await client.query(
              "select count(*)::int n from public.sms_jobs where device_id=$1 " +
              "and status in ('queued','processing','sent','failed') " +
              "and coalesce(scheduled_at,created_at)>=$2 and coalesce(scheduled_at,created_at)<$3",
              [deviceId,dayStart.toISOString(),new Date(dayKey+86400000).toISOString()]);
            dailyCache.set(dayKey,Number(dayCount.rows[0]?.n || 0));
          }
          const monthStart = kstMonthStart(at);
          const monthKey = monthStart.getTime();
          if (!monthlyCache.has(monthKey)) {
            const monthCount = await client.query(
              "select count(*)::int n from public.sms_jobs where device_id=$1 " +
              "and status in ('queued','processing','sent','failed') " +
              "and coalesce(scheduled_at,created_at)>=$2 and coalesce(scheduled_at,created_at)<$3",
              [deviceId,monthStart.toISOString(),kstNextMonthStart(at).toISOString()]);
            monthlyCache.set(monthKey,Number(monthCount.rows[0]?.n || 0));
          }
          if ((dailyCache.get(dayKey) || 0) < HAPPY_CALL_DAILY_LIMIT &&
              (monthlyCache.get(monthKey) || 0) < HAPPY_CALL_MONTHLY_LIMIT) {
            const lastScheduled = reservedDates.get(dayKey);
            // Spread new messages instead of queuing all 50 for the same minute.
            if (lastScheduled !== undefined && at.getTime() < lastScheduled + 7*60000) {
              at = nextHappyCallSlot(new Date(lastScheduled + 7*60000));
              continue;
            }
            reservedDates.set(dayKey,at.getTime());
            dailyCache.set(dayKey,(dailyCache.get(dayKey) || 0)+1);
            monthlyCache.set(monthKey,(monthlyCache.get(monthKey) || 0)+1);
            return at;
          }
          at = nextHappyCallSlot(new Date(at.getTime()+4*60000));
        }
        return null;
      }
      const seen = new Set<string>();
      for (const item of items) {
        const order = clean(item.orderNumber, 120);
        const number = phoneOf(item.phone);
        const name = clean(item.customerName, 80);
        const product = clean(item.productName, 100);
        const state = clean(item.state, 30).toLowerCase();
        const delivered = new Date(String(item.deliveredAt || ""));
        if (!order || seen.has(order)) { stat.duplicate++; continue; }
        seen.add(order);
        const existing = await client.query(
          "select id, job_id from public.happycall_orders where owner_email=$1 and channel=$2 and order_number=$3 for update",
          [a.email, channel, order]);
        if (existing.rowCount) {
          if (["취소","반품","cancelled","returned"].includes(state)) {
            await client.query("update public.sms_jobs set status='cancelled',completed_at=now(),error='취소/반품' where job_id=$1 and status='queued'", [existing.rows[0].job_id]);
            await client.query("update public.happycall_orders set state='cancelled',updated_at=now() where id=$1", [existing.rows[0].id]);
            stat.cancelled++;
          } else stat.duplicate++;
          continue;
        }
        if (!/^01\d{8,9}$/.test(number) || !Number.isFinite(delivered.getTime()) || ["취소","반품","cancelled","returned"].includes(state)) {
          stat.excluded++; continue;
        }
        const requested = new Date(delivered.getTime() + days * 86400000);
        requested.setUTCHours(0,30,0,0);
        const expiry = sixMonthsAfter(delivered);
        if (new Date() >= expiry) { stat.excluded++; continue; }
        const suppressed = await client.query(
          "select 1 from public.sms_suppressions where phone=$1 and released_at is null " +
          "union all select 1 from public.crm_contacts where phone=$1 and status='수신거부' limit 1", [number]);
        if (suppressed.rowCount) { stat.excluded++; continue; }
        const scheduled = await reserveSlot(new Date(Math.max(requested.getTime(),Date.now()+5*60000)),expiry);
        if (!scheduled) { stat.quotaExcluded++; continue; }
        const body = clean(item.messageBody || defaultBody, 2000);
        if (!body || body.includes("http://") || body.includes("https://")) { stat.excluded++; continue; }
        const personalized = formatBody(body,{channel,productName:product||"상품",customerName:name});
        const message = personalized.trim() + "\n" + link + "\n감사합니다.";
        if (message.length > 2000) { stat.excluded++; continue; }
        const job = await client.query(
          "insert into public.sms_jobs(device_id,phone,message,company_name,channel,status,scheduled_at) " +
          "values($1,$2,$3,$4,$5,'queued',$6) returning job_id",
          [deviceId, number, message, name, channel, scheduled.toISOString()]);
        await client.query(
          "insert into public.happycall_orders(owner_email,channel,order_number,customer_name,phone,product_name,delivered_at,consultation_url,device_id,job_id)" +
          " values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
          [a.email,channel,order,name,number,product,delivered.toISOString(),link,deviceId,job.rows[0].job_id]);
        stat.registered++;
      }
      await client.query("commit");
      return res.json({ ok: true, ...stat });
    } catch (error: any) {
      await client.query("rollback");
      return res.status(400).json({ error: error.message || "등록 실패" });
    } finally { client.release(); }
  });
}