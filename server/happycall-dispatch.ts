import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getPgPool } from "./credits";
import { HAPPY_CALL_DAILY_LIMIT, kstDayStart, permittedHappyCallTime } from "./happycall-schedule";

const dispatchLocks = new Set<string>();
export function registerHappyCallDispatchGuard(app: Express) {
  // Runs before the existing authenticated SMS device polling route.
  app.use("/api/sms-device/:deviceId/next", async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") return next();
    const secret = process.env.SMS_DEVICE_API_KEY || "";
    const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!secret || bearer.length !== secret.length ||
        !crypto.timingSafeEqual(Buffer.from(bearer), Buffer.from(secret))) return next();
    const pool = getPgPool();
    if (!pool) return next();
    const deviceId = String(req.params.deviceId || "");
    // Serialize device polls on the single Render server to prevent concurrent limit checks.
    if (dispatchLocks.has(deviceId)) return res.json({ job: null });
    dispatchLocks.add(deviceId);
    const release = () => dispatchLocks.delete(deviceId);
    res.once("finish", release);
    res.once("close", release);
    try {
      const exists = await pool.query("select to_regclass('public.happycall_orders') as tbl");
      if (!exists.rows[0]?.tbl) return next();
      // Cancel aged happy calls before polling; ordinary CRM jobs are unaffected.
      await pool.query(
        "update public.sms_jobs j set status='cancelled', completed_at=now(), error='해피콜 6개월 만료' " +
        "from public.happycall_orders o where o.job_id=j.job_id and o.device_id=$1 " +
        "and j.status='queued' and now() >= o.delivered_at + interval '6 months'",
        [deviceId]
      );
      const enabled = await pool.query(
        "select 1 from public.happycall_orders where device_id=$1 limit 1", [deviceId]
      );
      // Once a device is used for HappyCall, count its manual and automatic sends together.
      if (!enabled.rowCount) return next();
      const now = new Date();
      if (!permittedHappyCallTime(now)) return res.json({ job: null });
      const day = kstDayStart(now);
      const count = await pool.query(
        "select count(*)::int n from public.sms_jobs " +
        "where device_id=$1 and processing_at >= $2 and processing_at < $3",
        [deviceId, day.toISOString(), new Date(day.getTime() + 86400000).toISOString()]
      );
      if (Number(count.rows[0]?.n || 0) >= HAPPY_CALL_DAILY_LIMIT) return res.json({ job: null });
      return next();
    } catch (err) {
      console.error("Happycall dispatch guard error",err);
      // Fail closed for active aftercare when guard checks cannot be completed.
      return res.status(503).json({ ok: false, error: "happycall_guard_unavailable" });
    }
  });
}
