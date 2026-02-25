import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import os from "os";
import { execFileSync } from "child_process";
import { storage } from "./storage";
import authRouter from "./auth";
import { vvicRouter, apiAiGenerate, apiStitch } from "./vvic";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ensureInitialWallet, getWalletBalance, getAiHistory, getUsageHistory, chargeUsage } from "./credits";
import { Router } from "express";
import { getPgPool } from "./credits";
import { ensureOwnerInviteFromEnv, ensureOrderSystemTables, generateOrderNo, getActiveOwnerCount, getAdminUserByEmail, getNextOrderStatus, getPrevOrderStatus, normalizeEmail, syncAdminUserByEmail, upsertAdminInvite } from "./order-system";

const DEFAULT_FORMMAIL_ADMIN_RECIPIENTS = ["secsiboy1@naver.com", "secsiboy1@gmail.com"];

// ==================================================================
// 🟣 1688 확장프로그램 수신용 (서버 메모리 임시 저장)
// ==================================================================
let latestProductData: any = null;

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getUserIdFromCookie(req: any): string {
  const token = req?.cookies?.token;
  if (!token) return "";
  const secret = process.env.SESSION_SECRET || "your-secret-key-change-this";
  try {
    const payload: any = jwt.verify(token, secret);
    return payload?.sub || payload?.cid || payload?.uid || "";
  } catch {
    return "";
  }
}

function getUserFromCookie(req: Request): any | null {
  const token = req?.cookies?.token;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET || "your-secret-key-change-this";
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

function getRequestIp(req: Request): string {
  const fwd = (req.headers["x-forwarded-for"] || "") as string;
  const ip = fwd.split(",")[0]?.trim() || req.ip || "";
  return ip || "unknown";
}


function toPriceNumber(value: any): number | null {
  const n = parseFloat(String(value ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseQuantity(value: any): number {
  const n = parseInt(String(value ?? "1"), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function pickFirstText(obj: any, keys: string[]): string {
  if (!obj || typeof obj !== "object") return "";
  for (const k of keys) {
    const v = String((obj as any)?.[k] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function parseOptionValue(options: any, keys: string[]): string {
  if (!options || typeof options !== "object") return "";
  const entries = Object.entries(options);
  for (const [key, value] of entries) {
    const normalizedKey = String(key || "").toLowerCase();
    if (keys.some((k) => normalizedKey.includes(k))) {
      const parsed = String(value ?? "").trim();
      if (parsed) return parsed;
    }
  }
  return "";
}

function escapeXmlText(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildCellXml(cellRef: string, styleAttr: string, value: string | number): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r=\"${cellRef}\"${styleAttr}><v>${value}</v></c>`;
  }
  return `<c r=\"${cellRef}\"${styleAttr} t=\"inlineStr\"><is><t>${escapeXmlText(String(value ?? ""))}</t></is></c>`;
}

function setCellValueInSheetXml(sheetXml: string, cellRef: string, value: string | number): string {
  const cellPattern = new RegExp(`<c\\s+r=\"${cellRef}\"([^>]*)>([\\s\\S]*?)<\\/c>|<c\\s+r=\"${cellRef}\"([^>]*)\\/>`, "g");

  let replaced = false;
  const replacementFactory = (attrs: string): string => {
    replaced = true;
    const styleMatch = attrs.match(/\ss=\"([^\"]+)\"/);
    const styleAttr = styleMatch ? ` s=\"${styleMatch[1]}\"` : "";
    return buildCellXml(cellRef, styleAttr, value);
  };

  let updated = sheetXml.replace(cellPattern, (_full, attrs1, _inner, attrs2) => replacementFactory(String(attrs1 || attrs2 || "")));
  if (replaced) return updated;

  const rowNoMatch = cellRef.match(/\d+$/);
  if (!rowNoMatch) return updated;
  const rowNo = rowNoMatch[0];
  const rowPattern = new RegExp(`<row[^>]*\\sr=\"${rowNo}\"[^>]*>([\\s\\S]*?)<\\/row>`);
  const rowMatch = updated.match(rowPattern);
  if (!rowMatch) return updated;

  const rowBlock = rowMatch[0];
  const styleRefMatch = rowBlock.match(new RegExp(`<c\\s+r=\"[A-Z]+${rowNo}\"([^>]*)>`));
  const styleMatch = styleRefMatch?.[1]?.match(/\ss=\"([^\"]+)\"/);
  const styleAttr = styleMatch ? ` s=\"${styleMatch[1]}\"` : "";
  const cellXml = buildCellXml(cellRef, styleAttr, value);
  const injectedRow = rowBlock.replace(/<\/row>$/, `${cellXml}</row>`);
  updated = updated.replace(rowBlock, injectedRow);
  return updated;
}

function normalizeImageUrl(raw: any): string {
  const src = String(raw || "").trim();
  if (!src) return "";
  if (src.startsWith("[")) {
    try {
      const parsed = JSON.parse(src);
      if (Array.isArray(parsed) && parsed[0]) return normalizeImageUrl(parsed[0]);
    } catch {
      // noop
    }
  }

  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `https://detail.1688.com${src}`;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.includes("1688.com") || src.includes("alicdn.com")) return `https://${src.replace(/^\/+/, "")}`;
  return src;
}

async function downloadImageAsJpeg(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    return buf;
  } catch {
    return null;
  }
}

function buildDrawingXml(imageAnchors: Array<{ relId: string; pictureId: number; name: string; rowNo: number }>): string {
  const anchors = imageAnchors.map((anchor) => {
    const rowIdx = anchor.rowNo - 1;
    return `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>5</xdr:col><xdr:colOff>274320</xdr:colOff><xdr:row>${rowIdx}</xdr:row><xdr:rowOff>99609</xdr:rowOff></xdr:from><xdr:to><xdr:col>5</xdr:col><xdr:colOff>1352550</xdr:colOff><xdr:row>${rowIdx}</xdr:row><xdr:rowOff>1184991</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${anchor.pictureId}" name="${escapeXmlText(anchor.name)}" descr="${escapeXmlText(anchor.name)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${anchor.relId}" cstate="print"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="5779770" y="5489575"/><a:ext cx="1078230" cy="1085850"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors}</xdr:wsDr>`;
}

function buildDrawingRelsXml(rels: Array<{ relId: string; target: string }>): string {
  const body = rels
    .map((rel) => `<Relationship Id="${rel.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${rel.target}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`;
}


function extractOfferIdFromAny(obj: any): string {
  const id = pickFirstText(obj, ["offerId", "offer_id", "offerid", "itemId", "item_id"]);
  return /^\d{6,}$/.test(id) ? id : "";
}

function build1688DetailUrlFromOfferId(offerId: string): string {
  const id = String(offerId || "").trim();
  if (!/^\d{6,}$/.test(id)) return "";
  return `https://detail.1688.com/offer/${id}.html`;
}

function normalize1688OrderItem(raw: any) {
  const item = raw && typeof raw === "object" ? { ...raw } : {};
  const offerObj = item?.offer && typeof item.offer === "object" ? item.offer : {};

  const offerHtml = pickFirstText(item, ["offer_html", "offerHtml", "offer_info_html", "offerInfoHtml", "html"]);
  const htmlImgSrc = (offerHtml.match(/<img[^>]*src=[\"']([^\"']+)[\"']/i)?.[1] || "").trim();
  const htmlAlt = (offerHtml.match(/<img[^>]*alt=[\"']([^\"']+)[\"']/i)?.[1] || "").trim();
  const htmlHref = (offerHtml.match(/<a[^>]*href=[\"']([^\"']+)[\"']/i)?.[1] || "").trim();

  const productName = pickFirstText(item, [
    "product_name", "productName", "offer_name", "offerName", "offer_title", "offerTitle", "title", "name", "alt",
  ]) || pickFirstText(offerObj, ["name", "title", "alt"]) || htmlAlt;

  const productImage = pickFirstText(item, [
    "product_image", "productImage", "main_image", "mainImage", "item_image", "itemImage", "offer_thumb", "offerThumb", "thumb", "image", "image_url", "imageUrl", "img", "src",
  ]) || pickFirstText(offerObj, ["thumb", "image", "img", "src"]) || htmlImgSrc;

  const detailUrl = pickFirstText(item, [
    "detail_url", "detailUrl", "offer_link", "offerLink", "product_url", "productUrl", "product_link", "productLink", "item_url", "itemUrl", "link", "href", "source_url", "sourceUrl", "url",
  ]) || pickFirstText(offerObj, ["link", "href", "url"]) || htmlHref;
  const offerId = extractOfferIdFromAny(item) || extractOfferIdFromAny(offerObj);
  const offerDetailUrl = build1688DetailUrlFromOfferId(offerId);

  return {
    ...item,
    product_name: productName || item?.product_name || item?.name || item?.title || "",
    product_image: productImage || item?.product_image || item?.thumb || item?.image || "",
    detail_url: detailUrl || offerDetailUrl || item?.detail_url || item?.url || "",
    name: item?.name || productName || item?.title || "",
    title: item?.title || productName || item?.name || "",
    thumb: item?.thumb || productImage || item?.image || "",
    url: item?.url || detailUrl || offerDetailUrl || item?.detail_url || "",
    offer_thumb: item?.offer_thumb || pickFirstText(offerObj, ["thumb", "image", "img", "src"]) || htmlImgSrc,
    offer_link: item?.offer_link || pickFirstText(offerObj, ["link", "href", "url"]) || htmlHref || offerDetailUrl,
  };
}


async function getCurrentAdmin(req: Request) {
  const user: any = getUserFromCookie(req);
  if (!user) return { admin: null, reason: "not_logged_in", email: "" };
  const email = normalizeEmail(user?.email);
  if (!email) return { admin: null, reason: "missing_email", email: "" };
  await syncAdminUserByEmail(email);
  const admin = await getAdminUserByEmail(email);
  if (!admin) return { admin: null, reason: "not_invited", email };
  if (!admin?.is_active) return { admin: null, reason: "inactive", email };
  return { admin, reason: "ok", email };
}

async function ensureFormmailTables() {
  const pgPool = getPgPool();
  if (!pgPool) return;

  await pgPool.query(`
    create table if not exists public.form_submissions (
      id uuid primary key default gen_random_uuid(),
      type text not null,
      name text not null,
      age int,
      phone text not null,
      phone_confirm text not null,
      region text not null,
      expected_sales text not null,
      question text,
      email text,
      agree_privacy boolean not null,
      created_at timestamptz not null default now(),
      ip text,
      user_agent text
    );

    create index if not exists idx_form_submissions_created_at on public.form_submissions(created_at desc);
    create index if not exists idx_form_submissions_ip_created_at on public.form_submissions(ip, created_at desc);

    create table if not exists public.form_settings (
      id int primary key,
      admin_emails text not null,
      enable_user_receipt boolean not null default false,
      rate_limit_per_hour int not null default 30,
      updated_at timestamptz not null default now()
    );
  `);

  await pgPool.query(
    "insert into public.form_settings(id, admin_emails, enable_user_receipt, rate_limit_per_hour) values (1, $1, false, 30) on conflict (id) do nothing",
    [DEFAULT_FORMMAIL_ADMIN_RECIPIENTS.join(",")],
  );
}

async function getFormSettings() {
  const pgPool = getPgPool();
  if (!pgPool) throw new Error("db_not_configured");
  await ensureFormmailTables();

  const { rows } = await pgPool.query(
    "select id, admin_emails, enable_user_receipt, rate_limit_per_hour, updated_at from public.form_settings where id = 1 limit 1",
  );

  return rows[0] || {
    id: 1,
    admin_emails: DEFAULT_FORMMAIL_ADMIN_RECIPIENTS.join(","),
    enable_user_receipt: false,
    rate_limit_per_hour: 30,
    updated_at: new Date().toISOString(),
  };
}

function requireFormmailAdmin(req: Request): { ok: true; user: any } | { ok: false; status: number; error: string } {
  const user: any = getUserFromCookie(req);
  if (!user) return { ok: false, status: 401, error: "not_logged_in" };

  const envAdmins = String(process.env.FORMMAIL_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (envAdmins.length === 0) return { ok: false, status: 403, error: "admin_not_configured" };

  const email = String(user?.email || "").trim().toLowerCase();
  if (!email || !envAdmins.includes(email)) return { ok: false, status: 403, error: "forbidden" };

  return { ok: true, user };
}

function mergeAdminRecipients(rawRecipients: string): string[] {
  const configured = String(rawRecipients || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set([...configured, ...REQUIRED_FORMMAIL_ADMIN_RECIPIENTS]));
}

async function sendResendEmail(args: {
  to: string[];
  subject: string;
  text: string;
}) {

  const apiKey = process.env.RESEND_API_KEY;
  if (!args.to.length) return;
  if (!apiKey) {
    throw new Error("formmail_email_not_configured: RESEND_API_KEY is missing");
  }

  const from = String(process.env.FORMMAIL_FROM_EMAIL || "onboarding@resend.dev").trim();

  // Resend 테스트 모드 제한: 도메인 인증 전에는 계정 이메일(본인)로만 발송 가능합니다.
  // FORMMAIL_FROM_EMAIL이 resend.dev를 사용 중이면, 수신자(to)를 테스트 이메일로 강제합니다.
  const resendTestTo = String(process.env.RESEND_TEST_EMAIL || "secsiboy1@gmail.com").trim();
  if (from.toLowerCase().endsWith("@resend.dev")) {
    args.to = [resendTestTo];
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`formmail_email_send_failed: ${response.status} ${errorBody}`);
  }
}

const alibaba1688Router = Router();

// [Legacy] 서버 직접 추출 (차단 안내)
alibaba1688Router.get("/extract", async (req, res) => {
  return res.json({
    ok: true,
    product_name: "1688 상품 데이터",
    main_media: [],
    detail_media: [],
    source: "server_fetch",
    message: "서버 직접 추출은 차단될 수 있습니다. 확장프로그램을 사용하세요.",
  });
});

// [확장프로그램] 데이터 수신 및 저장
alibaba1688Router.post("/extract_client", (req, res) => {
  try {
    const body = req.body || {};
    const { url } = body;
    if (!url) return res.status(400).json({ ok: false, error: "url required" });

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const normalizedItems = rawItems.map((it: any) => normalize1688OrderItem(it));

    const page_type = body.page_type || body.page || (normalizedItems.length ? "order" : "detail");

    // ✅ detail / order 모두 호환되도록 "원문 유지 + 필수 필드 보정" 형태로 저장
    latestProductData = {
      ...body,

      page_type,

      // 상품명/가격 계열(detail일 때만 의미 있음)
      product_name: body.product_name || "1688 상품 데이터",
      price: body.price ?? body.unit_price ?? body.unitPrice ?? "",
      unit_price: body.unit_price ?? body.price ?? body.unitPrice ?? "",
      unitPrice: body.unitPrice ?? body.unit_price ?? body.price ?? "",

      // 옵션/이미지(detail)
      sku_html: body.sku_html || "",
      sku_groups: Array.isArray(body.sku_groups) ? body.sku_groups : [],
      sku_props: Array.isArray(body.sku_props) ? body.sku_props : [],
      option_thumbs: Array.isArray(body.option_thumbs) ? body.option_thumbs : [],
      main_media: Array.isArray(body.main_media) ? body.main_media : [],
      detail_media: Array.isArray(body.detail_media) ? body.detail_media : [],

      // 주문아이템(order)
      items: normalizedItems,

      source: body.source || "client_extension",
      timestamp: new Date().toISOString(),
    };

    return res.json({
      ok: true,
      message: "서버에 저장되었습니다. 웹사이트에서 불러오세요.",
      page_type: latestProductData.page_type,
      items_count: latestProductData.items.length,
      media_count: latestProductData.main_media.length + latestProductData.detail_media.length,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// [웹] 최신 저장 데이터 조회 (프론트 호환: 그대로 반환)
alibaba1688Router.get("/extract_client", (req, res) => {
  if (!latestProductData) {
    return res.status(404).json({ ok: false, error: "NO_DATA_YET" });
  }
  return res.json(latestProductData);
});

// [웹] 최신 저장 데이터 초기화 (프론트 "초기화" 버튼용)
alibaba1688Router.delete("/extract_client", (req, res) => {
  latestProductData = null;
  return res.json({ ok: true });
});

// [웹] 최신 저장 데이터 조회
alibaba1688Router.get("/latest", async (req, res) => {
  if (!latestProductData) {
    return res.json({
      ok: false,
      message: "아직 추출된 데이터가 없습니다. 확장프로그램을 먼저 실행해주세요.",
    });
  }

  const uid = getUserIdFromCookie(req);
  if (!uid) return res.status(401).json({ ok: false, error: "not_logged_in" });

  const URL_COST = 10;

  try {
    await ensureInitialWallet(uid, 10000);

    const balance = await getWalletBalance(uid);
    if (typeof balance === "number" && balance < URL_COST) {
      return res.status(402).json({ ok: false, error: "insufficient_credit", balance });
    }

    const sourceUrl = String(latestProductData?.url || "").trim();
    const latestTs = String(latestProductData?.timestamp || "").trim();
    const requestKey = sha256([uid, sourceUrl, latestTs || "no_ts", "1688_extract"].join("|"));

    const charged = await chargeUsage({
      userId: uid,
      cost: URL_COST,
      feature: "1688_extract",
      sourceUrl: sourceUrl || null,
      requestKey,
    });
    if ((charged as any)?.insufficient) {
      return res.status(402).json({ ok: false, error: "insufficient_credit" });
    }
    if ((charged as any)?.duplicate) {
      // 동일한 추출 데이터 재요청은 중복 차감하지 않고 그대로 반환
      const balanceNow = await getWalletBalance(uid);
      return res.json({
        ok: true,
        duplicate_charge_skipped: true,
        ...latestProductData,
        balance: typeof balanceNow === "number" ? balanceNow : undefined,
      });
    }

    return res.json({ ok: true, ...latestProductData, balance: (charged as any)?.balance ?? undefined });
  } catch (e: any) {
    console.error("1688 latest charge error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

export function registerRoutes(app: Express): Promise<Server> {
  // 쿠키 파서 추가
  app.use(cookieParser());

  // 인증 라우트 등록
  app.use(authRouter);
  ensureOrderSystemTables().catch((e) => console.error("order system table init failed:", e));
  ensureOwnerInviteFromEnv().catch((e) => console.error("owner invite init failed:", e));

  // ---------------------------------------------------------------------------
  // 🟡 Wallet (Credits) - 잔액 조회
  // - balance(원) -> 프론트에서는 10:1로 표시(예: 10000 -> 1,000 credit)
  // ---------------------------------------------------------------------------
  app.get("/api/wallet", async (req, res) => {
    try {
      const uid = getUserIdFromCookie(req);
      if (!uid) return res.status(401).json({ ok: false, error: "not_logged_in" });

      // 신규 유저 1회 지급(중복 방지)
      await ensureInitialWallet(uid, 10000);

      const balance = await getWalletBalance(uid);
      return res.json({
        ok: true,
        user_id: uid, // ✅ 추가
        balance: typeof balance === "number" ? balance : 0,
      });
    } catch (e: any) {
      console.error("wallet error:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // ---------------------------------------------------------------------------
  // 🟡 Me - 로그인된 내 계정 식별자(user_id) 내려주기
  // ---------------------------------------------------------------------------
  app.get("/api/me", async (req, res) => {
    try {
      const uid = getUserIdFromCookie(req);
      if (!uid) return res.status(401).json({ ok: false, error: "not_logged_in" });
      return res.json({ ok: true, user_id: uid });
    } catch (e: any) {
      console.error("me error:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });


  app.post("/api/orders", async (req, res) => {
    const pool = getPgPool();
    if (!pool) return res.status(500).json({ ok: false, error: "db_not_configured" });

    const user: any = getUserFromCookie(req);
    const userId = getUserIdFromCookie(req);
    if (!user || !userId) return res.status(401).json({ ok: false, error: "not_logged_in" });

    const source = req.body?.source || latestProductData || {};
    const items = Array.isArray(source?.items) ? source.items : [];
    if (!items.length) return res.status(400).json({ ok: false, error: "empty_items" });

    try {
      await ensureOrderSystemTables();
      await ensureOwnerInviteFromEnv();

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const orderNo = await generateOrderNo(client);

        const insertedOrder = await client.query(
          `insert into public.orders(order_no, user_id, user_email, status, source_payload)
           values ($1, $2, $3, 'PENDING_PAYMENT', $4::jsonb)
           returning id, order_no, status, created_at`,
          [orderNo, userId, normalizeEmail(user?.email), JSON.stringify(source)],
        );

        const order = insertedOrder.rows[0];
        for (const item of items) {
          const itemOfferId = extractOfferIdFromAny(item);
          const itemProductUrl = String(
            item?.detail_url ||
              item?.detailUrl ||
              item?.detail_link ||
              item?.detailLink ||
              item?.offer_link ||
              item?.offerLink ||
              item?.product_url ||
              item?.productUrl ||
              item?.product_link ||
              item?.productLink ||
              item?.item_url ||
              item?.itemUrl ||
              item?.link ||
              item?.href ||
              item?.source_url ||
              item?.sourceUrl ||
              item?.url ||
              build1688DetailUrlFromOfferId(itemOfferId) ||
              source?.url ||
              source?.source_url ||
              "",
          );

          await client.query(
            `insert into public.order_items(order_id, product_url, title, options, quantity, price, raw_item)
             values ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb)`,
            [
              order.id,
              itemProductUrl,
              String(item?.product_name || item?.productName || item?.offer_name || item?.offerTitle || item?.title || item?.name || source?.product_name || "1688 item"),
              JSON.stringify(item?.options || item?.sku || {}),
              parseQuantity(item?.quantity),
              toPriceNumber(item?.price ?? item?.amount),
              JSON.stringify(item || {}),
            ],
          );
        }

        await client.query(
          `insert into public.order_status_logs(order_id, from_status, to_status, changed_by, changed_by_role)
           values ($1, null, 'PENDING_PAYMENT', $2, 'USER')`,
          [order.id, userId],
        );

        await client.query("COMMIT");
        return res.json({ ok: true, order });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    } catch (e: any) {
      console.error("create order failed:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  app.get("/api/orders/my", async (req, res) => {
    const pool = getPgPool();
    const userId = getUserIdFromCookie(req);
    if (!pool) return res.status(500).json({ ok: false, error: "db_not_configured" });
    if (!userId) return res.status(401).json({ ok: false, error: "not_logged_in" });

    try {
      await ensureOrderSystemTables();
      const orders = await pool.query(
        `select o.id,
                o.order_no,
                o.status,
                o.created_at,
                coalesce(
                  nullif(o.source_payload->>'total_payable', ''),
                  nullif(o.source_payload->>'totalPayable', ''),
                  nullif(o.source_payload->>'final_amount', ''),
                  nullif(o.source_payload->>'finalAmount', '')
                ) as total_payable,
                coalesce(items.items, '[]'::json) as items,
                coalesce(items.item_count, 0)::int as item_count,
                coalesce(items.total_quantity, 0)::int as total_quantity
         from public.orders o
         left join lateral (
            select json_agg(
                    json_build_object(
                      'id', oi.id,
                      'title', oi.title,
                      'name', coalesce(nullif(oi.raw_item->>'product_name', ''), nullif(oi.raw_item->>'productName', ''), nullif(oi.raw_item->>'offer_name', ''), nullif(oi.raw_item->>'offerTitle', ''), nullif(oi.raw_item->>'title', ''), nullif(oi.raw_item->>'name', ''), oi.title),
                      'seller', nullif(oi.raw_item->>'seller', ''),
                      'thumb', coalesce(
                        nullif(oi.raw_item->>'product_image', ''),
                        nullif(oi.raw_item->>'productImage', ''),
                        nullif(oi.raw_item->>'main_image', ''),
                        nullif(oi.raw_item->>'mainImage', ''),
                        nullif(oi.raw_item->>'item_image', ''),
                        nullif(oi.raw_item->>'itemImage', ''),
                        nullif(oi.raw_item->>'offer_thumb', ''),
                        nullif(oi.raw_item->>'offerThumb', ''),
                        nullif(oi.raw_item->>'image', ''),
                        nullif(oi.raw_item->>'img', ''),
                        nullif(oi.raw_item->>'imageUrl', ''),
                        nullif(oi.raw_item->>'image_url', ''),
                        nullif(oi.raw_item->>'thumb', ''),
                        nullif(oi.raw_item->>'option_image', ''),
                        nullif(oi.raw_item->>'optionImage', ''),
                        nullif(oi.raw_item->>'sku_image', ''),
                        nullif(oi.raw_item->>'skuImage', '')
                      ),
                      'option', coalesce(nullif(oi.raw_item->>'option', ''), nullif(oi.raw_item->>'optionRaw', '')),
                      'amount', coalesce(nullif(oi.raw_item->>'amount', ''), oi.price::text),
                      'source_url', coalesce(nullif(oi.raw_item->>'detail_url', ''), nullif(oi.raw_item->>'detailUrl', ''), nullif(oi.raw_item->>'detail_link', ''), nullif(oi.raw_item->>'detailLink', ''), nullif(oi.raw_item->>'offer_link', ''), nullif(oi.raw_item->>'offerLink', ''), nullif(oi.raw_item->>'product_url', ''), nullif(oi.raw_item->>'productUrl', ''), nullif(oi.raw_item->>'product_link', ''), nullif(oi.raw_item->>'productLink', ''), nullif(oi.raw_item->>'item_url', ''), nullif(oi.raw_item->>'itemUrl', ''), nullif(oi.raw_item->>'link', ''), nullif(oi.raw_item->>'href', ''), nullif(oi.raw_item->>'source_url', ''), nullif(oi.raw_item->>'sourceUrl', ''), nullif(oi.raw_item->>'url', ''), oi.product_url, nullif(o.source_payload->>'url', '')),
                      'order_source_url', nullif(o.source_payload->>'url', ''),
                      'product_url', oi.product_url,
                      'quantity', oi.quantity,
                      'price', oi.price,
                      'options', oi.options
                    )
                    order by oi.created_at asc
                  ) as items,
                  count(*) as item_count,
                  coalesce(sum(oi.quantity), 0) as total_quantity
            from public.order_items oi
            where oi.order_id = o.id
         ) items on true
         where o.user_id = $1
         order by o.created_at desc`,
        [userId],
      );
      return res.json({ ok: true, rows: orders.rows });
    } catch (e: any) {
      console.error("my orders failed:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  app.get("/api/admin/orders", async (req, res) => {
    const pool = getPgPool();
    if (!pool) return res.status(500).json({ ok: false, error: "db_not_configured" });

    const current = await getCurrentAdmin(req);
    if (!current.admin) {
      return res.status(403).json({ ok: false, error: current.reason, email: current.email || undefined });
    }
    const admin = current.admin;

    try {
      await ensureOrderSystemTables();
      const result = await pool.query(
        `select o.id,
                o.order_no,
                o.user_email,
                o.status,
                o.created_at,
                coalesce(
                  nullif(o.source_payload->>'total_payable', ''),
                  nullif(o.source_payload->>'totalPayable', ''),
                  nullif(o.source_payload->>'final_amount', ''),
                  nullif(o.source_payload->>'finalAmount', '')
                ) as total_payable,
                coalesce(items.items, '[]'::json) as items,
                coalesce(items.item_count, 0)::int as item_count,
                coalesce(items.total_quantity, 0)::int as total_quantity
         from public.orders o
         left join lateral (
            select json_agg(
                    json_build_object(
                      'id', oi.id,
                      'title', oi.title,
                      'name', coalesce(nullif(oi.raw_item->>'product_name', ''), nullif(oi.raw_item->>'productName', ''), nullif(oi.raw_item->>'offer_name', ''), nullif(oi.raw_item->>'offerTitle', ''), nullif(oi.raw_item->>'title', ''), nullif(oi.raw_item->>'name', ''), oi.title),
                      'seller', nullif(oi.raw_item->>'seller', ''),
                      'thumb', coalesce(
                        nullif(oi.raw_item->>'product_image', ''),
                        nullif(oi.raw_item->>'productImage', ''),
                        nullif(oi.raw_item->>'main_image', ''),
                        nullif(oi.raw_item->>'mainImage', ''),
                        nullif(oi.raw_item->>'item_image', ''),
                        nullif(oi.raw_item->>'itemImage', ''),
                        nullif(oi.raw_item->>'offer_thumb', ''),
                        nullif(oi.raw_item->>'offerThumb', ''),
                        nullif(oi.raw_item->>'image', ''),
                        nullif(oi.raw_item->>'img', ''),
                        nullif(oi.raw_item->>'imageUrl', ''),
                        nullif(oi.raw_item->>'image_url', ''),
                        nullif(oi.raw_item->>'thumb', ''),
                        nullif(oi.raw_item->>'option_image', ''),
                        nullif(oi.raw_item->>'optionImage', ''),
                        nullif(oi.raw_item->>'sku_image', ''),
                        nullif(oi.raw_item->>'skuImage', '')
                      ),
                      'option', coalesce(nullif(oi.raw_item->>'option', ''), nullif(oi.raw_item->>'optionRaw', '')),
                      'amount', coalesce(nullif(oi.raw_item->>'amount', ''), oi.price::text),
                      'source_url', coalesce(nullif(oi.raw_item->>'detail_url', ''), nullif(oi.raw_item->>'detailUrl', ''), nullif(oi.raw_item->>'detail_link', ''), nullif(oi.raw_item->>'detailLink', ''), nullif(oi.raw_item->>'offer_link', ''), nullif(oi.raw_item->>'offerLink', ''), nullif(oi.raw_item->>'product_url', ''), nullif(oi.raw_item->>'productUrl', ''), nullif(oi.raw_item->>'product_link', ''), nullif(oi.raw_item->>'productLink', ''), nullif(oi.raw_item->>'item_url', ''), nullif(oi.raw_item->>'itemUrl', ''), nullif(oi.raw_item->>'link', ''), nullif(oi.raw_item->>'href', ''), nullif(oi.raw_item->>'source_url', ''), nullif(oi.raw_item->>'sourceUrl', ''), nullif(oi.raw_item->>'url', ''), oi.product_url, nullif(o.source_payload->>'url', '')),
                      'order_source_url', nullif(o.source_payload->>'url', ''),
                      'product_url', oi.product_url,
                      'quantity', oi.quantity,
                      'price', oi.price,
                      'options', oi.options
                    )
                    order by oi.created_at asc
                  ) as items,
                  count(*) as item_count,
                  coalesce(sum(oi.quantity), 0) as total_quantity
            from public.order_items oi
            where oi.order_id = o.id
         ) items on true
         order by o.created_at desc
         limit 200`,
      );
      return res.json({ ok: true, role: admin.role, rows: result.rows });
    } catch (e: any) {
      console.error("admin orders failed:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  app.post("/api/admin/orders/:id/advance", async (req, res) => {
    const pool = getPgPool();
    if (!pool) return res.status(500).json({ ok: false, error: "db_not_configured" });

    const current = await getCurrentAdmin(req);
    if (!current.admin) {
      return res.status(403).json({ ok: false, error: current.reason, email: current.email || undefined });
    }
    const admin = current.admin;
    if (!["OWNER", "ADMIN"].includes(String(admin.role))) {
      return res.status(403).json({ ok: false, error: "forbidden_role" });
    }

    try {
      await ensureOrderSystemTables();
      const orderId = String(req.params.id || "");
      const found = await pool.query(`select id, status from public.orders where id=$1 limit 1`, [orderId]);
      if (!found.rows[0]) return res.status(404).json({ ok: false, error: "not_found" });

      const current = found.rows[0].status;
      const next = getNextOrderStatus(current);
      if (!next) return res.status(409).json({ ok: false, error: "already_final_status" });

      await pool.query(`update public.orders set status=$2, updated_at=now() where id=$1`, [orderId, next]);
      await pool.query(
        `insert into public.order_status_logs(order_id, from_status, to_status, changed_by, changed_by_role)
         values ($1, $2, $3, $4, $5)`,
        [orderId, current, next, admin.user_uuid, admin.role],
      );

      return res.json({ ok: true, id: orderId, from: current, to: next });
    } catch (e: any) {
      console.error("advance order failed:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });


  app.post("/api/admin/orders/:id/revert", async (req, res) => {
    const pool = getPgPool();
    if (!pool) return res.status(500).json({ ok: false, error: "db_not_configured" });

    const current = await getCurrentAdmin(req);
    if (!current.admin) {
      return res.status(403).json({ ok: false, error: current.reason, email: current.email || undefined });
    }
    const admin = current.admin;
    if (!["OWNER", "ADMIN"].includes(String(admin.role))) {
      return res.status(403).json({ ok: false, error: "forbidden_role" });
    }

    try {
      await ensureOrderSystemTables();
      const orderId = String(req.params.id || "");
      const found = await pool.query(`select id, status from public.orders where id=$1 limit 1`, [orderId]);
      if (!found.rows[0]) return res.status(404).json({ ok: false, error: "not_found" });

      const currentStatus = found.rows[0].status;
      const prev = getPrevOrderStatus(currentStatus);
      if (!prev) return res.status(409).json({ ok: false, error: "already_first_status" });

      await pool.query(`update public.orders set status=$2, updated_at=now() where id=$1`, [orderId, prev]);
      await pool.query(
        `insert into public.order_status_logs(order_id, from_status, to_status, changed_by, changed_by_role)
         values ($1, $2, $3, $4, $5)`,
        [orderId, currentStatus, prev, admin.user_uuid, admin.role],
      );

      return res.json({ ok: true, id: orderId, from: currentStatus, to: prev });
    } catch (e: any) {
      console.error("revert order failed:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  app.delete("/api/admin/orders/:id", async (req, res) => {
    const pool = getPgPool();
    if (!pool) return res.status(500).json({ ok: false, error: "db_not_configured" });

    const current = await getCurrentAdmin(req);
    if (!current.admin) {
      return res.status(403).json({ ok: false, error: current.reason, email: current.email || undefined });
    }
    const admin = current.admin;
    if (String(admin.role) !== "OWNER") {
      return res.status(403).json({ ok: false, error: "forbidden_role" });
    }

    try {
      await ensureOrderSystemTables();
      const orderId = String(req.params.id || "");
      const found = await pool.query(`select id from public.orders where id=$1 limit 1`, [orderId]);
      if (!found.rows[0]) return res.status(404).json({ ok: false, error: "not_found" });

      await pool.query(`delete from public.orders where id=$1`, [orderId]);
      return res.json({ ok: true, id: orderId, deleted: true });
    } catch (e: any) {
      console.error("delete order failed:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  app.get("/api/admin/orders/:id/excel", async (req, res) => {
    const pool = getPgPool();
    if (!pool) return res.status(500).json({ ok: false, error: "db_not_configured" });

    const current = await getCurrentAdmin(req);
    if (!current.admin) {
      return res.status(403).json({ ok: false, error: current.reason, email: current.email || undefined });
    }

    try {
      await ensureOrderSystemTables();
      const orderId = String(req.params.id || "").trim();
      if (!orderId) return res.status(400).json({ ok: false, error: "invalid_order_id" });

      const orderResult = await pool.query(
        `select o.id, o.order_no,
                coalesce(items.items, '[]'::json) as items
           from public.orders o
           left join lateral (
              select json_agg(
                      json_build_object(
                        'id', oi.id,
                        'name', coalesce(nullif(oi.raw_item->>'product_name', ''), nullif(oi.raw_item->>'productName', ''), nullif(oi.raw_item->>'offer_name', ''), nullif(oi.raw_item->>'offerTitle', ''), nullif(oi.raw_item->>'title', ''), nullif(oi.raw_item->>'name', ''), oi.title),
                        'thumb', coalesce(
                          nullif(oi.raw_item->>'product_image', ''),
                          nullif(oi.raw_item->>'productImage', ''),
                          nullif(oi.raw_item->>'main_image', ''),
                          nullif(oi.raw_item->>'mainImage', ''),
                          nullif(oi.raw_item->>'item_image', ''),
                          nullif(oi.raw_item->>'itemImage', ''),
                          nullif(oi.raw_item->>'offer_thumb', ''),
                          nullif(oi.raw_item->>'offerThumb', ''),
                          nullif(oi.raw_item->>'image', ''),
                          nullif(oi.raw_item->>'img', ''),
                          nullif(oi.raw_item->>'imageUrl', ''),
                          nullif(oi.raw_item->>'image_url', ''),
                          nullif(oi.raw_item->>'thumb', '')
                        ),
                        'source_url', coalesce(nullif(oi.raw_item->>'detail_url', ''), nullif(oi.raw_item->>'detailUrl', ''), nullif(oi.raw_item->>'detail_link', ''), nullif(oi.raw_item->>'detailLink', ''), nullif(oi.raw_item->>'offer_link', ''), nullif(oi.raw_item->>'offerLink', ''), nullif(oi.raw_item->>'product_url', ''), nullif(oi.raw_item->>'productUrl', ''), nullif(oi.raw_item->>'product_link', ''), nullif(oi.raw_item->>'productLink', ''), nullif(oi.raw_item->>'item_url', ''), nullif(oi.raw_item->>'itemUrl', ''), nullif(oi.raw_item->>'link', ''), nullif(oi.raw_item->>'href', ''), nullif(oi.raw_item->>'source_url', ''), nullif(oi.raw_item->>'sourceUrl', ''), nullif(oi.raw_item->>'url', ''), oi.product_url),
                        'product_url', oi.product_url,
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'option', coalesce(nullif(oi.raw_item->>'option', ''), nullif(oi.raw_item->>'optionRaw', '')),
                        'options', oi.options
                      )
                      order by oi.created_at asc
                    ) as items
              from public.order_items oi
              where oi.order_id = o.id
           ) items on true
          where o.id = $1
          limit 1`,
        [orderId],
      );

      const order = orderResult.rows?.[0];
      if (!order) return res.status(404).json({ ok: false, error: "not_found" });

      const templatePath = path.resolve(process.cwd(), "sample", "00월00일_주문_업체명.xlsx");
      if (!fs.existsSync(templatePath)) {
        return res.status(500).json({ ok: false, error: "template_not_found" });
      }

      const items = Array.isArray(order.items) ? order.items : [];
      const startRow = 8;

      const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "order-excel-"));
      const extractDir = path.join(tempRoot, "extract");
      fs.mkdirSync(extractDir, { recursive: true });
      execFileSync("unzip", ["-q", templatePath, "-d", extractDir]);
      const sheetPath = path.join(extractDir, "xl", "worksheets", "sheet1.xml");
      if (!fs.existsSync(sheetPath)) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        return res.status(500).json({ ok: false, error: "worksheet_not_found" });
      }
      let sheetXml = fs.readFileSync(sheetPath, "utf8");

      const maxTemplateRows = 50;
      for (let offset = 0; offset < maxTemplateRows; offset += 1) {
        const rowNo = startRow + offset;
        sheetXml = setCellValueInSheetXml(sheetXml, `F${rowNo}`, "");
        sheetXml = setCellValueInSheetXml(sheetXml, `H${rowNo}`, "");
        sheetXml = setCellValueInSheetXml(sheetXml, `I${rowNo}`, "");
        sheetXml = setCellValueInSheetXml(sheetXml, `J${rowNo}`, "");
        sheetXml = setCellValueInSheetXml(sheetXml, `K${rowNo}`, "");
        sheetXml = setCellValueInSheetXml(sheetXml, `L${rowNo}`, "");
        sheetXml = setCellValueInSheetXml(sheetXml, `M${rowNo}`, "");
      }

      const imageAnchors: Array<{ relId: string; pictureId: number; name: string; rowNo: number }> = [];
      const imageRels: Array<{ relId: string; target: string }> = [];
      let nextRelId = 1;
      let nextPictureId = 4;

      for (let index = 0; index < items.length; index += 1) {
        const rowNo = startRow + index;
        const item = items[index] || {};
        const options = item?.options && typeof item.options === "object" ? item.options : {};
        const optionRaw = String(item?.option || "").trim();
        const optionTokens = optionRaw.split(/[,/|]\s*|\s{2,}/).map((t: string) => t.trim()).filter(Boolean);
        const color =
          parseOptionValue(options, ["color", "색상", "颜色", "색"]) ||
          optionTokens[0] ||
          "";
        const height =
          parseOptionValue(options, ["height", "높이", "高度", "기장", "size", "사이즈"]) ||
          optionTokens[1] ||
          "";

        const productUrlValue = String(item?.source_url || item?.product_url || "").trim();
        const nameValue = String(item?.name || "").trim();
        const quantityValue = Number(item?.quantity || 0) || 0;
        const priceValue = Number(item?.price || 0) || 0;

        sheetXml = setCellValueInSheetXml(sheetXml, `F${rowNo}`, "");
        sheetXml = setCellValueInSheetXml(sheetXml, `H${rowNo}`, productUrlValue);
        sheetXml = setCellValueInSheetXml(sheetXml, `I${rowNo}`, nameValue);
        sheetXml = setCellValueInSheetXml(sheetXml, `J${rowNo}`, quantityValue);
        sheetXml = setCellValueInSheetXml(sheetXml, `K${rowNo}`, color);
        sheetXml = setCellValueInSheetXml(sheetXml, `L${rowNo}`, height);
        sheetXml = setCellValueInSheetXml(sheetXml, `M${rowNo}`, priceValue);

        const imageUrl = normalizeImageUrl(item?.thumb);
        const imageBuffer = await downloadImageAsJpeg(imageUrl);
        if (imageBuffer) {
          const mediaFileName = `image_order_${rowNo}.jpeg`;
          const mediaFilePath = path.join(extractDir, "xl", "media", mediaFileName);
          fs.writeFileSync(mediaFilePath, imageBuffer);

          const relId = `rId${nextRelId}`;
          nextRelId += 1;
          imageRels.push({ relId, target: `../media/${mediaFileName}` });
          imageAnchors.push({
            relId,
            pictureId: nextPictureId,
            name: `상품이미지_${rowNo}`,
            rowNo,
          });
          nextPictureId += 1;
        }
      }

      fs.writeFileSync(sheetPath, sheetXml, "utf8");

      const drawingPath = path.join(extractDir, "xl", "drawings", "drawing1.xml");
      const drawingRelsPath = path.join(extractDir, "xl", "drawings", "_rels", "drawing1.xml.rels");
      fs.writeFileSync(drawingPath, buildDrawingXml(imageAnchors), "utf8");
      fs.writeFileSync(drawingRelsPath, buildDrawingRelsXml(imageRels), "utf8");

      // Rebuild calculation chain references to avoid Excel recovery warning.
      const calcChainPath = path.join(extractDir, "xl", "calcChain.xml");
      if (fs.existsSync(calcChainPath)) fs.rmSync(calcChainPath, { force: true });

      const workbookRelsPath = path.join(extractDir, "xl", "_rels", "workbook.xml.rels");
      if (fs.existsSync(workbookRelsPath)) {
        let workbookRelsXml = fs.readFileSync(workbookRelsPath, "utf8");
        workbookRelsXml = workbookRelsXml.replace(/<Relationship[^>]*Type=\"http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/calcChain\"[^>]*\/>/g, "");
        fs.writeFileSync(workbookRelsPath, workbookRelsXml, "utf8");
      }

      const workbookPath = path.join(extractDir, "xl", "workbook.xml");
      if (fs.existsSync(workbookPath)) {
        let workbookXml = fs.readFileSync(workbookPath, "utf8");
        workbookXml = workbookXml.replace(/<calcPr[^>]*\/>/g, "");
        fs.writeFileSync(workbookPath, workbookXml, "utf8");
      }

      const contentTypesPath = path.join(extractDir, "[Content_Types].xml");
      if (fs.existsSync(contentTypesPath)) {
        let contentTypesXml = fs.readFileSync(contentTypesPath, "utf8");
        contentTypesXml = contentTypesXml.replace(/<Override PartName=\"\/xl\/calcChain\.xml\"[^>]*\/>/g, "");
        fs.writeFileSync(contentTypesPath, contentTypesXml, "utf8");
      }

      const outPath = path.join(tempRoot, "order.xlsx");
      execFileSync("zip", ["-qr", outPath, "."], { cwd: extractDir });

      if (!fs.existsSync(outPath)) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        return res.status(500).json({ ok: false, error: "excel_write_failed" });
      }

      const filename = `${String(order.order_no || "order").replace(/[^a-zA-Z0-9가-힣_-]/g, "_")}_발주내역.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      const excelBuffer = fs.readFileSync(outPath);
      fs.rmSync(tempRoot, { recursive: true, force: true });
      res.send(excelBuffer);
      return res.end();
    } catch (e: any) {
      console.error("order excel download failed:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  app.get("/api/admin/bootstrap/status", async (req, res) => {
    try {
      const owners = await getActiveOwnerCount();
      return res.json({ ok: true, active_owner_count: owners, bootstrap_allowed: owners === 0 });
    } catch (e: any) {
      console.error("admin bootstrap status failed:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  app.post("/api/admin/bootstrap/owner", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ ok: false, error: "email_required" });

    try {
      const owners = await getActiveOwnerCount();
      const bootstrapKey = String(process.env.ADMIN_BOOTSTRAP_KEY || "").trim();
      const providedKey = String(req.headers["x-admin-bootstrap-key"] || req.body?.bootstrap_key || "").trim();

      if (owners === 0) {
        if (bootstrapKey && providedKey !== bootstrapKey) {
          return res.status(403).json({ ok: false, error: "invalid_bootstrap_key" });
        }
      } else {
        const current = await getCurrentAdmin(req);
        const ownerAuthed = current.admin?.role === "OWNER";
        const keyAuthed = bootstrapKey && providedKey === bootstrapKey;
        if (!ownerAuthed && !keyAuthed) {
          return res.status(403).json({ ok: false, error: "owner_or_bootstrap_key_required" });
        }
      }

      const row = await upsertAdminInvite(email, "OWNER", true);
      return res.json({ ok: true, row, forced: true });
    } catch (e: any) {
      console.error("admin bootstrap owner failed:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  app.get("/api/admin/invites", async (req, res) => {
    const pool = getPgPool();
    if (!pool) return res.status(500).json({ ok: false, error: "db_not_configured" });

    const current = await getCurrentAdmin(req);
    if (!current.admin) {
      return res.status(403).json({ ok: false, error: current.reason, email: current.email || undefined });
    }
    const admin = current.admin;

    await ensureOrderSystemTables();
    const result = await pool.query(
      `select id, email, role, is_active, created_at, updated_at
       from public.admin_invites
       order by created_at desc`,
    );
    return res.json({ ok: true, role: admin.role, rows: result.rows });
  });

  app.post("/api/admin/invites", async (req, res) => {
    const pool = getPgPool();
    if (!pool) return res.status(500).json({ ok: false, error: "db_not_configured" });

    const current = await getCurrentAdmin(req);
    if (!current.admin || current.admin.role !== "OWNER") {
      return res.status(403).json({ ok: false, error: current.reason === "ok" ? "forbidden" : current.reason, email: current.email || undefined });
    }
    const admin = current.admin;

    const email = normalizeEmail(req.body?.email);
    const role = String(req.body?.role || "VIEWER").toUpperCase();
    const isActive = req.body?.is_active !== false;

    if (!email) return res.status(400).json({ ok: false, error: "email_required" });
    if (!["OWNER", "ADMIN", "VIEWER"].includes(role)) return res.status(400).json({ ok: false, error: "invalid_role" });

    const row = await upsertAdminInvite(email, role as any, isActive);
    return res.json({ ok: true, row });
  });

  // VVIC 도구 API
  app.post("/api/vvic/ai", async (req, res) => {
    return apiAiGenerate(req as any, res as any);
  });

  // ---------------------------------------------------------------------------
  // 🟡 Wallet (Credits) - 작업내역(ai_results)
  // ---------------------------------------------------------------------------
  app.get("/api/wallet/history", async (req, res) => {
    try {
      const uid = getUserIdFromCookie(req);
      if (!uid) return res.status(401).json({ ok: false, error: "not_logged_in" });

      const limit = Number(req.query.limit || 30);
      const rows = await getAiHistory(uid, limit);

      return res.json({ ok: true, rows });
    } catch (e: any) {
      console.error("wallet history error:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // ---------------------------------------------------------------------------
  // 🟡 Wallet (Credits) - 차감내역(credit_usage_log)
  // ---------------------------------------------------------------------------
  app.get("/api/wallet/usage", async (req, res) => {
    try {
      const uid = getUserIdFromCookie(req);
      if (!uid) return res.status(401).json({ ok: false, error: "not_logged_in" });

      const limit = Number(req.query.limit || 50);
      const rows = await getUsageHistory(uid, limit);

      return res.json({ ok: true, rows });
    } catch (e: any) {
      console.error("wallet usage error:", e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  app.post("/api/vvic/stitch", async (req, res) => {
    return apiStitch(req as any, res as any);
  });

  app.use("/api/vvic", vvicRouter);
  app.use("/api/1688", alibaba1688Router);

  // ---------------------------------------------------------------------------
  // Image proxy (1688/alicdn hotlink 대응)
  // ---------------------------------------------------------------------------
  const proxyImageHandler = async (req: any, res: any) => {
    try {
      const rawUrl = String(req.query.url || "").trim();
      if (!rawUrl) {
        return res.status(400).json({ ok: false, error: "url_required" });
      }

      let u: URL;
      try {
        u = new URL(rawUrl);
      } catch {
        return res.status(400).json({ ok: false, error: "invalid_url" });
      }

      if (u.protocol !== "https:" && u.protocol !== "http:") {
        return res.status(400).json({ ok: false, error: "invalid_protocol" });
      }

      const host = u.hostname.toLowerCase();
      const allowed =
        host.endsWith(".alicdn.com") ||
        host === "alicdn.com" ||
        host.endsWith(".vvic.com") ||
        host === "vvic.com";

      if (!allowed) {
        return res.status(403).json({ ok: false, error: "host_not_allowed" });
      }

      const r = await fetch(u.toString(), {
        headers: {
          Referer: "https://detail.1688.com/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      });

      if (!r.ok) {
        return res.status(r.status).json({ ok: false, error: `upstream_${r.status}` });
      }

      const contentType = r.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");

      const ab = await r.arrayBuffer();
      return res.status(200).send(Buffer.from(ab));
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || "proxy_failed" });
    }
  };

  app.get("/api/proxy/image", proxyImageHandler);
  app.get("/api/1688/proxy/image", proxyImageHandler);
  app.get("/image", proxyImageHandler);
  app.get("/1688/image", proxyImageHandler);

  app.post("/api/formmail", async (req, res) => {
    try {
      const pgPool = getPgPool();
      if (!pgPool) return res.status(500).json({ ok: false, message: "db_not_configured" });
      await ensureFormmailTables();

      const hp = String(req.body?.hp || "").trim();
      if (hp) return res.json({ ok: true });

      const type = String(req.body?.type || "education").trim() || "education";
      const user = getUserFromCookie(req);
      if ((type === "education" || type === "startup_trial") && !user) {
        return res.status(401).json({ ok: false, message: "로그인 후 신청 가능합니다." });
      }

      const name = String(req.body?.name || "").trim();
      const age = req.body?.age === "" || req.body?.age == null ? null : Number(req.body?.age);
      const phone = String(req.body?.phone || "").trim();
      const phoneConfirm = String(req.body?.phoneConfirm || phone).trim();
      const region = String(req.body?.region || "").trim();
      const expectedSales = String(req.body?.expectedSales || "").trim();
      const question = String(req.body?.question || "").trim();
      const email = String(req.body?.email || "").trim();
      const agreePrivacy = Boolean(req.body?.agreePrivacy);

      const isSimpleInquiryType = type === "contact" || type === "startup_trial";
      const normalizedRegion = isSimpleInquiryType ? region || "문의" : region;
      const normalizedExpectedSales = isSimpleInquiryType ? expectedSales || "문의" : expectedSales;

      if (!name || !phone || !phoneConfirm || !email) {
        return res.status(400).json({ ok: false, message: "필수 입력값을 확인해주세요." });
      }
      if (!isSimpleInquiryType && (!normalizedRegion || !normalizedExpectedSales)) {
        return res.status(400).json({ ok: false, message: "필수 입력값을 확인해주세요." });
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ ok: false, message: "이메일 형식을 확인해주세요." });
      }
      if (phone !== phoneConfirm) {
        return res.status(400).json({ ok: false, message: "연락처 확인 값이 일치하지 않습니다." });
      }
      if (!agreePrivacy) {
        return res.status(400).json({ ok: false, message: "개인정보 동의가 필요합니다." });
      }
      if (age !== null && (!Number.isFinite(age) || age < 0)) {
        return res.status(400).json({ ok: false, message: "나이 입력값을 확인해주세요." });
      }

      const settings = await getFormSettings();
      const limitPerHour = Math.max(1, Number(settings.rate_limit_per_hour || 30));
      const reqIp = getRequestIp(req);
      const ua = String(req.headers["user-agent"] || "");

      const rate = await pgPool.query(
        `select count(*)::int as cnt
         from public.form_submissions
         where ip = $1 and created_at >= (now() - interval '1 hour')`,
        [reqIp],
      );
      const cnt = Number(rate.rows?.[0]?.cnt || 0);
      if (cnt >= limitPerHour) {
        return res.status(429).json({ ok: false, message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
      }

      await pgPool.query(
        `insert into public.form_submissions
        (type, name, age, phone, phone_confirm, region, expected_sales, question, email, agree_privacy, ip, user_agent)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          type,
          name,
          age,
          phone,
          phoneConfirm,
          normalizedRegion,
          normalizedExpectedSales,
          question || null,
          email || null,
          agreePrivacy,
          reqIp,
          ua || null,
        ],
      );



      const bodyText = [
        `[${type}] 신규 신청이 접수되었습니다.`,
        "",
        `이름: ${name}`,
        `나이: ${age ?? "-"}`,
        `연락처: ${phone}`,
        `연락처 확인: ${phoneConfirm}`,
        `거주지역: ${normalizedRegion}`,
        `희망매출: ${normalizedExpectedSales}`,
        `질문: ${question || "-"}`,
        `개인정보 동의: ${agreePrivacy ? "동의" : "미동의"}`,
        `이메일: ${email}`,
        `IP: ${reqIp}`,
        `User-Agent: ${ua || "-"}`,
      ].join("\n");

      const adminRecipients = String(settings.admin_emails || DEFAULT_FORMMAIL_ADMIN_RECIPIENTS.join(","))
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      let adminEmailError = "";
      if (adminRecipients.length) {
        try {
          await sendResendEmail({
            to: adminRecipients,
            subject: `[${type}] ${name}님 신청 접수`,
            text: bodyText,
          });
        } catch (e: any) {
          adminEmailError = e?.message || String(e);
          console.error("formmail admin email send failed:", {
            error: adminEmailError,
            to: adminRecipients,
          });
        }
      }

      // 신청 데이터 저장은 메일 발송과 분리한다.
      // 메일 전송 실패가 있더라도 신청 자체는 성공으로 처리해 사용자 경험을 보호한다.

      let userReceiptError = "";
      if (settings.enable_user_receipt && email) {
        try {
          await sendResendEmail({
            to: [email],
            subject: `[나나인터내셔널] ${name}님 신청이 접수되었습니다.`,
            text: [
              `${name}님, 교육 신청이 정상 접수되었습니다.`,
              "",
              `신청유형: ${type}`,
              `연락처: ${phone}`,
              `거주지역: ${normalizedRegion}`,
              `희망매출: ${normalizedExpectedSales}`,
              "",
              "감사합니다.",
            ].join("\n"),
          });
        } catch (e: any) {
          userReceiptError = e?.message || String(e);
          console.error("formmail receipt email send failed:", {
            error: userReceiptError,
            to: email,
          });
        }
      }

      return res.json({
        ok: true,
        mail: {
          adminSent: adminRecipients.length > 0 && !adminEmailError,
          userReceiptSent: Boolean(settings.enable_user_receipt && email && !userReceiptError),
          adminError: adminEmailError || undefined,
          userReceiptError: userReceiptError || undefined,
        },
      });
    } catch (e: any) {
      console.error("formmail error:", e);
      return res.status(500).json({ ok: false, message: "server_error" });
    }
  });

  app.get("/api/formmail/settings", async (req, res) => {
    try {
      const admin = requireFormmailAdmin(req);
      if (!admin.ok) return res.status(admin.status).json({ ok: false, message: admin.error });

      const settings = await getFormSettings();
      return res.json({ ok: true, settings });
    } catch (e) {
      console.error("formmail settings get error:", e);
      return res.status(500).json({ ok: false, message: "server_error" });
    }
  });

  app.post("/api/formmail/settings", async (req, res) => {
    try {
      const admin = requireFormmailAdmin(req);
      if (!admin.ok) return res.status(admin.status).json({ ok: false, message: admin.error });

      const pgPool = getPgPool();
      if (!pgPool) return res.status(500).json({ ok: false, message: "db_not_configured" });
      await ensureFormmailTables();

      const adminEmails = String(req.body?.adminEmails || "").trim();
      const enableUserReceipt = Boolean(req.body?.enableUserReceipt);
      const rateLimitPerHour = Math.max(1, Number(req.body?.rateLimitPerHour || 30));

      await pgPool.query(
        `update public.form_settings
         set admin_emails = $1,
             enable_user_receipt = $2,
             rate_limit_per_hour = $3,
             updated_at = now()
         where id = 1`,
        [adminEmails, enableUserReceipt, rateLimitPerHour],
      );

      const settings = await getFormSettings();
      return res.json({ ok: true, settings });
    } catch (e) {
      console.error("formmail settings save error:", e);
      return res.status(500).json({ ok: false, message: "server_error" });
    }
  });

  app.get("/api/formmail/submissions", async (req, res) => {
    try {
      const admin = requireFormmailAdmin(req);
      if (!admin.ok) return res.status(admin.status).json({ ok: false, message: admin.error });

      const pgPool = getPgPool();
      if (!pgPool) return res.status(500).json({ ok: false, message: "db_not_configured" });
      await ensureFormmailTables();

      const limit = Math.max(1, Math.min(Number(req.query.limit || 50), 200));
      const { rows } = await pgPool.query(
        `select id, type, name, age, phone, region, expected_sales, question, email, created_at
         from public.form_submissions
         order by created_at desc
         limit $1`,
        [limit],
      );

      return res.json({ ok: true, submissions: rows || [] });
    } catch (e) {
      console.error("formmail submissions error:", e);
      return res.status(500).json({ ok: false, message: "server_error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
