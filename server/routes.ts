import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import authRouter from "./auth";
import { vvicRouter, apiAiGenerate, apiStitch } from "./vvic";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { ensureInitialWallet, getWalletBalance } from "./credits";
import { Router } from "express";

// ==================================================================
// 🟣 1688 확장프로그램 수신용 (서버 메모리 임시 저장)
// ==================================================================
let latestProductData: any = null;


function getUserIdFromCookie(req: any): string {
  const token = req?.cookies?.token;
  if (!token) return "";
  const secret = process.env.SESSION_SECRET || "your-secret-key-change-this";
  try {
    const payload: any = jwt.verify(token, secret);
    return payload?.cid || payload?.uid || "";
  } catch {
    return "";
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
alibaba1688Router.get("/latest", (req, res) => {
  if (!latestProductData) {
    return res.json({
      ok: false,
      message: "아직 추출된 데이터가 없습니다. 확장프로그램을 먼저 실행해주세요.",
    });
  }
  return res.json({ ok: true, ...latestProductData });
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
    return res.json({ ok: true, balance: typeof balance === "number" ? balance : 0 });
  } catch (e: any) {
    console.error("wallet error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});



  // VVIC 도구 API

  // ---------------------------------------------------------------------------
  // 🟡 VVIC Extract (GET) - JSON 응답 고정 (SPA index.html 내려오는 문제 방지)
  // ---------------------------------------------------------------------------

  // vvic 라우터에 /extract 포함 (Playwright 기반)
  app.post("/api/vvic/ai", async (req, res) => {
    return apiAiGenerate(req as any, res as any);
  });

  app.post("/api/vvic/stitch", async (req, res) => {
    return apiStitch(req as any, res as any);
  });

  app.use("/api/vvic", vvicRouter);
  app.use("/api/1688", alibaba1688Router);

  // ---------------------------------------------------------------------------
  // Image proxy (1688/alicdn hotlink 대응)
  // 브라우저에서 alicdn 이미지가 403/차단되는 경우가 있어,
  // 서버에서 Referer/User-Agent를 붙여 프록시로 내려줍니다.
  // 사용처: client에서 <img src={apiUrl('/api/proxy/image?url=...')}
  // (주의) 프론트에서 상대경로로 'image?url=...'를 쓰면 /1688/image 로 붙는 경우가 있어
  // /image, /1688/image 도 같이 열어둡니다.
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

      // 최소한의 allowlist (원치 않는 서버측 요청(SSRF) 방지)
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
          // 1688 쪽에서 referer 체크하는 케이스 대응
          Referer: "https://detail.1688.com/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      });

      if (!r.ok) {
        return res
          .status(r.status)
          .json({ ok: false, error: `upstream_${r.status}` });
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
  app.get("/api/1688/proxy/image", proxyImageHandler); // ✅ 추가: 프론트에서 쓰는 경로 살리기
  app.get("/image", proxyImageHandler);
  app.get("/1688/image", proxyImageHandler);

  const httpServer = createServer(app); // HTTP 서버 생성
  return httpServer;
}
