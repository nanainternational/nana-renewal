import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { getPgPool } from "./credits";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 180;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  if (aa.length !== bb.length || aa.length === 0) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function requestIp(req: Request): string {
  const raw = String(req.headers["x-forwarded-for"] || "");
  return raw.split(",")[0]?.trim() || req.ip || "unknown";
}

function collectorAuth(req: Request, res: Response): boolean {
  const expected = String(process.env.COUPANG_COLLECTOR_TOKEN || "").trim();
  if (!expected) {
    res.status(503).json({ ok: false, error: "collector_not_configured" });
    return false;
  }

  const provided = String(req.headers["x-collector-token"] || "").trim();
  if (!safeEqual(expected, provided)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return false;
  }

  const ip = requestIp(req);
  const now = Date.now();
  const bucket = requestBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  if (bucket.count > RATE_MAX) {
    res.status(429).json({ ok: false, error: "rate_limited" });
    return false;
  }
  return true;
}

function txt(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

export function registerCoupangCollectorRoutes(app: Express) {
  app.post("/api/coupang-collector/rpc/:name", async (req, res) => {
    if (!collectorAuth(req, res)) return;

    const pool = getPgPool();
    if (!pool) return res.status(503).json({ ok: false, error: "db_not_configured" });

    const name = String(req.params.name || "").trim();
    const body = req.body && typeof req.body === "object" ? req.body : {};

    try {
      if (name === "claim_coupang_items") {
        const items = Array.isArray(body.p_items) ? body.p_items.slice(0, 500) : [];
        const cleaned = items
          .map((x: any) => ({
            product_key: txt(x?.product_key),
            canonical_url: txt(x?.canonical_url),
            product_id: txt(x?.product_id),
            item_id: txt(x?.item_id),
            vendor_item_id: txt(x?.vendor_item_id),
          }))
          .filter((x: any) => x.product_key && x.canonical_url);
        if (!cleaned.length) return res.json([]);
        const r = await pool.query(
          "select * from public.claim_coupang_items($1::jsonb)",
          [JSON.stringify(cleaned)],
        );
        return res.json(r.rows || []);
      }

      if (name === "claim_next_coupang_item") {
        const r = await pool.query(
          "select * from public.claim_next_coupang_item($1::text)",
          [txt(body.p_worker_id)],
        );
        return res.json(r.rows || []);
      }

      if (name === "finish_coupang_item_v2") {
        const r = await pool.query(
          "select public.finish_coupang_item_v2($1::text,$2::text,$3::text,$4::text) as result",
          [txt(body.p_product_key), txt(body.p_status), txt(body.p_vendor_id), txt(body.p_error)],
        );
        return res.json(Boolean(r.rows?.[0]?.result));
      }

      if (name === "claim_coupang_vendor_from_item") {
        const metadata = body.p_metadata && typeof body.p_metadata === "object" ? body.p_metadata : {};
        const r = await pool.query(
          `select * from public.claim_coupang_vendor_from_item(
             $1::text,$2::text,$3::text,$4::text,$5::text,$6::text,$7::jsonb
           )`,
          [
            txt(body.p_vendor_id),
            txt(body.p_product_id),
            txt(body.p_item_id),
            txt(body.p_vendor_item_id),
            txt(body.p_product_url),
            txt(body.p_worker_id),
            JSON.stringify(metadata),
          ],
        );
        return res.json(r.rows || []);
      }

      if (name === "finish_coupang_vendor") {
        const r = await pool.query(
          `select public.finish_coupang_vendor(
             $1::text,$2::text,$3::text,$4::text,$5::text,
             $6::text,$7::text,$8::text,$9::text,$10::text
           ) as result`,
          [
            txt(body.p_vendor_id),
            txt(body.p_status),
            txt(body.p_error),
            txt(body.p_seller_name),
            txt(body.p_representative),
            txt(body.p_phone),
            txt(body.p_email),
            txt(body.p_address),
            txt(body.p_business_number),
            txt(body.p_mail_order_number),
          ],
        );
        return res.json(Boolean(r.rows?.[0]?.result));
      }

      if (name === "coupang_item_queue_stats") {
        const r = await pool.query("select * from public.coupang_item_queue_stats()");
        return res.json(r.rows || []);
      }

      return res.status(404).json({ ok: false, error: "rpc_not_allowed" });
    } catch (e: any) {
      console.error("coupang collector rpc failed:", { name, error: e?.message || String(e) });
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });
}
