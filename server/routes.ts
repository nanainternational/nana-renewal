import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import authRouter from "./auth";
import { vvicRouter, apiAiGenerate, apiStitch } from "./vvic";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ensureInitialWallet, getWalletBalance, getAiHistory, getUsageHistory, chargeUsage } from "./credits";
import { Router } from "express";
import { getPgPool } from "./credits";

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

    insert into public.form_settings(id, admin_emails, enable_user_receipt, rate_limit_per_hour)
    values (1, '', false, 30)
    on conflict (id) do nothing;
  `);
}

async function getFormSettings() {
  const pgPool = getPgPool();
  if (!pgPool) throw new Error("db_not_configured");
  await ensureFormmailTables();

  const { rows } = await pgPool.query(
    `select id, admin_emails, enable_user_receipt, rate_limit_per_hour, updated_at
     from public.form_settings where id = 1 limit 1`,
  );
  return rows[0] || {
    id: 1,
    admin_emails: "",
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

async function sendResendEmail(args: {
  to: string[];
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !args.to.length) return;

  const from = process.env.FORMMAIL_FROM_EMAIL || "onboarding@resend.dev";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
    }),
  });
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

    const page_type = body.page_type || body.page || (Array.isArray(body.items) ? "order" : "detail");

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
      items: Array.isArray(body.items) ? body.items : [],

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
      const name = String(req.body?.name || "").trim();
      const age = req.body?.age === "" || req.body?.age == null ? null : Number(req.body?.age);
      const phone = String(req.body?.phone || "").trim();
      const phoneConfirm = String(req.body?.phoneConfirm || "").trim();
      const region = String(req.body?.region || "").trim();
      const expectedSales = String(req.body?.expectedSales || "").trim();
      const question = String(req.body?.question || "").trim();
      const email = String(req.body?.email || "").trim();
      const agreePrivacy = Boolean(req.body?.agreePrivacy);

      if (!name || !phone || !phoneConfirm || !region || !expectedSales) {
        return res.status(400).json({ ok: false, message: "필수 입력값을 확인해주세요." });
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
          region,
          expectedSales,
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
        `거주지역: ${region}`,
        `희망매출: ${expectedSales}`,
        `질문: ${question || "-"}`,
        `개인정보 동의: ${agreePrivacy ? "동의" : "미동의"}`,
        `이메일(선택): ${email || "-"}`,
        `IP: ${reqIp}`,
        `User-Agent: ${ua || "-"}`,
      ].join("\n");


        subject: `[${type}] ${name}님 신청 접수`,
        text: bodyText,
      });

      if (settings.enable_user_receipt && email) {
        await sendResendEmail({
          to: [email],
          subject: `[나나인터내셔널] ${name}님 신청이 접수되었습니다.`,
          text: [
            `${name}님, 교육 신청이 정상 접수되었습니다.`,
            "",
            `신청유형: ${type}`,
            `연락처: ${phone}`,
            `거주지역: ${region}`,
            `희망매출: ${expectedSales}`,
            "",
            "감사합니다.",
          ].join("\n"),
        });
      }

      return res.json({ ok: true });
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
