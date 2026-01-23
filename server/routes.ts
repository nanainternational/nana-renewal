import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import authRouter from "./auth";
import { vvicRouter } from "./vvic";
import cookieParser from "cookie-parser";
import { Router } from "express";


// ==================================================================
// 🟣 1688: 확장프로그램 결과를 서버 메모리에 임시 저장 후, 웹에서 다시 읽어가는 구조
// - 서버 재시작 시 메모리 데이터는 사라집니다.
// - /api/1688/extract : 서버 직접 추출(레거시 안내용)
// - /api/1688/extract_client : 확장프로그램이 POST로 데이터를 저장
// - /api/1688/latest : 웹(프론트)에서 가장 최근 저장 데이터를 가져감
// ==================================================================
type Alibaba1688Data = {
  url: string;
  product_name: string;
  main_media: string[];
  detail_media: string[];
  source: string;
  timestamp: string;
};

let latest1688: Alibaba1688Data | null = null;

const alibaba1688Router = Router();

// ✅ [Legacy] 서버 직접 추출(차단 안내용)
alibaba1688Router.get("/extract", (_req, res) => {
  return res.json({
    ok: true,
    product_name: "1688 상품 데이터",
    main_media: [],
    detail_media: [],
    source: "server_fetch",
    message: "서버 직접 추출은 차단될 수 있습니다. 확장프로그램을 사용하세요.",
  });
});

// ✅ 확장프로그램 데이터 수신 및 저장
alibaba1688Router.post("/extract_client", (req, res) => {
  try {
    const { url, product_name, main_media, detail_media } = req.body || {};

    if (!url) {
      return res.status(400).json({ ok: false, error: "url_required" });
    }

    latest1688 = {
      url: String(url),
      product_name: String(product_name || "1688 상품 데이터"),
      main_media: Array.isArray(main_media) ? main_media.filter(Boolean) : [],
      detail_media: Array.isArray(detail_media) ? detail_media.filter(Boolean) : [],
      source: "client_extension",
      timestamp: new Date().toISOString(),
    };

    console.log("✅ [1688] 데이터 저장:", latest1688.product_name);
    console.log(`   - 대표 ${latest1688.main_media.length} / 상세 ${latest1688.detail_media.length}`);

    return res.json({
      ok: true,
      message: "서버에 저장되었습니다. 웹사이트에서 불러오세요.",
      data_count: latest1688.main_media.length + latest1688.detail_media.length,
    });
  } catch (e: any) {
    console.error("❌ [1688] extract_client 에러:", e?.message || e);
    return res.status(500).json({ ok: false, error: e?.message || "server_error" });
  }
});

// ✅ 웹에서 최근 저장 데이터 가져가기
alibaba1688Router.get("/latest", (_req, res) => {
  if (!latest1688) {
    return res.json({
      ok: false,
      message: "아직 추출된 데이터가 없습니다. 확장프로그램을 먼저 실행해주세요.",
    });
  }
  return res.json({ ok: true, ...latest1688 });
});



export async function registerRoutes(app: Express): Promise<Server> {
  // 쿠키 파서 추가
  app.use(cookieParser());

  // 인증 라우트 등록
  app.use(authRouter);

  // VVIC 도구 API
  app.use("/api/vvic", vvicRouter);
  app.use("/api/1688", alibaba1688Router);

  // ---------------------------------------------------------------------------
  // Image proxy (1688/alicdn hotlink 대응)
  // 브라우저에서 alicdn 이미지가 403/차단되는 경우가 있어,
  // 서버에서 Referer/User-Agent를 붙여 프록시로 내려줍니다.
  // 사용처: client에서 <img src={apiUrl('/api/proxy/image?url=...')}
  app.get("/api/proxy/image", async (req, res) => {
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
  });
  const httpServer = createServer(app);  // HTTP 서버 생성

  return httpServer;
}
