import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import authRouter from "./auth";
import { vvicRouter } from "./vvic";
import { alibaba1688Router } from "./alibaba1688";
import cookieParser from "cookie-parser";

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
