import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import authRouter from "./auth";
import { vvicRouter } from "./vvic";
import cookieParser from "cookie-parser";
import { Router } from "express";

// ==================================================================
// 🟣 1688 확장프로그램 수신용 (서버 메모리 임시 저장)
// ==================================================================
let latestProductData: any = null;

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
    const { url, product_name, main_media, detail_media } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: "url required" });

    latestProductData = {
      url,
      product_name: product_name || "1688 상품 데이터",
      main_media: Array.isArray(main_media) ? main_media : [],
      detail_media: Array.isArray(detail_media) ? detail_media : [],
      source: "client_extension",
      timestamp: new Date().toISOString(),
    };

    return res.json({
      ok: true,
      message: "서버에 저장되었습니다. 웹사이트에서 불러오세요.",
      data_count:
        latestProductData.main_media.length + latestProductData.detail_media.length,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
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

export async function registerRoutes(app: Express): Promise<Server> {
  // 쿠키 파서 추가
  app.use(cookieParser());

  // 인증 라우트 등록
  app.use(authRouter);

  // VVIC 도구 API

  // ---------------------------------------------------------------------------
  // 🟡 VVIC Extract (GET) - JSON 응답 고정 (SPA index.html 내려오는 문제 방지)
  // ---------------------------------------------------------------------------
  function vvicUniq(arr: string[]) {
    const s = new Set<string>();
    const out: string[] = [];
    for (const x of arr) {
      const v = String(x || "").trim();
      if (!v) continue;
      if (s.has(v)) continue;
      s.add(v);
      out.push(v);
    }
    return out;
  }

  function vvicNormalizeUrl(u: string) {
    let x = String(u || "").trim();
    if (!x) return "";
    if (x.startsWith("//")) x = "https:" + x;
    return x;
  }

  function vvicStripQuery(u: string) {
    try {
      const o = new URL(u);
      o.search = "";
      return o.toString();
    } catch {
      const k = u.indexOf("?");
      return k >= 0 ? u.slice(0, k) : u;
    }
  }

  function extractVvicImages(html: string) {
    const text = String(html || "");
    const re = /(https?:\/\/img\d*\.vvic\.com\/[^"'\\\s>]+|\/\/img\d*\.vvic\.com\/[^"'\\\s>]+)/gi;
    const found: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      found.push(vvicNormalizeUrl(m[1]));
    }
    const cleaned = found.map(vvicStripQuery);
    return vvicUniq(cleaned);
  }

  app.get("/api/vvic/extract", async (req, res) => {
    try {
      // ✅ 이 라우트가 타면 HTML(index.html) 대신 JSON으로 반드시 내려감
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const targetUrl = String(req.query.url || "").trim();
      if (!targetUrl) return res.status(400).json({ ok: false, error: "url required" });

      if (!/^https?:\/\/(www\.)?vvic\.com\/item\//i.test(targetUrl)) {
        return res.status(400).json({ ok: false, error: "vvic item url만 지원합니다." });
      }

      const r = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        redirect: "follow",
      });

      const html = await r.text();
      const imgs = extractVvicImages(html);

      const MAIN_LIMIT = 12;
      const main = imgs.slice(0, MAIN_LIMIT).map((u) => ({ type: "image", url: u }));
      const detail = imgs.slice(MAIN_LIMIT).map((u) => ({ type: "image", url: u }));

      return res.json({
        ok: true,
        url: targetUrl,
        main_media: main,
        detail_media: detail,
        main_images: main.map((x) => x.url),
        detail_images: detail.map((x) => x.url),
        counts: { total: imgs.length, main: main.length, detail: detail.length },
      });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
  });

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
