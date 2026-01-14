import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ✅ VVIC API Router ( /api/vvic/* )
// (주의) TS를 빌드해서 JS로 배포하는 구조면 ./vvic.js, TS를 직접 실행하는 구조면 ./vvic.ts 로 맞추세요.
import vvicRouter from "./vvic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(
  cors({
    origin: [
      "https://nana-renewal.onrender.com",
      "http://127.0.0.1:5000",
      "http://localhost:5000",
      "http://127.0.0.1:5173",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// ✅ VVIC API mount (핵심)
// 프론트에서 호출하는 경로: /api/vvic/extract , /api/vvic/ai , /api/vvic/stitch
app.use("/api/vvic", vvicRouter);

// API 예시
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/**
 * ✅ VVIC 이미지 추출 (Playwright 없이 HTML에서 최대한 뽑기)
 * - 프론트에서 JSON을 기대하는데, 라우트가 없으면 SPA fallback(index.html)이 내려가서 "서버 에러"로 보임.
 * - 그래서 /api/extract 를 실제 JSON API로 추가.
 *
 * 사용: GET /api/extract?url=https://www.vvic.com/item/....
 * 응답: { ok:true, main_images:[], detail_images:[] }
 */
app.get("/api/extract", async (req, res) => {
  try {
    const targetUrl = String(req.query.url || "").trim();
    if (!targetUrl) {
      return res.status(400).json({ ok: false, error: "missing_url" });
    }

    // VVIC 페이지 가져오기
    const resp = await fetch(targetUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ko-KR,ko;q=0.9,en;q=0.7",
      },
      redirect: "follow",
    });

    if (!resp.ok) {
      return res
        .status(502)
        .json({ ok: false, error: "fetch_failed", status: resp.status });
    }

    const html = await resp.text();

    // 이미지 URL 후보 수집
    const candidates = new Set();

    // 1) <img ... src="..."> / data-src 등에서 추출
    const imgAttrRegex =
      /(src|data-src|data-original|data-lazy|data-zoom-image)\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = imgAttrRegex.exec(html))) {
      const u = m[2];
      if (!u) continue;
      candidates.add(u);
    }

    // 2) JSON 문자열 안의 이미지 링크 추출 (img1.vvic.com/upload/xxxxx.jpg 등)
    const jsonImgRegex =
      /https?:\/\/img\d+\.vvic\.com\/upload\/[a-zA-Z0-9_\-\.]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s]*)?/gi;
    while ((m = jsonImgRegex.exec(html))) {
      candidates.add(m[0]);
    }

    // 3) 프로토콜 없는 //img1... 형태 보정
    const normalize = (u) => {
      let s = String(u).trim();
      if (!s) return "";
      if (s.startsWith("//")) s = "https:" + s;
      // vvic가 가끔 /upload/... 같이 올릴 때가 있어 보호적으로 처리
      if (s.startsWith("/upload/")) s = "https://img1.vvic.com" + s;
      return s;
    };

    // 4) VVIC 이미지로만 필터링 + 쿼리 제거(중복 방지용) + 정리
    const cleaned = [];
    for (const u of candidates) {
      const nu = normalize(u);
      if (!nu) continue;

      // 이미지 확장자만
      if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(nu)) continue;

      // VVIC CDN 중심
      if (!/img\d+\.vvic\.com\/upload\//i.test(nu)) continue;

      // 중복 제거용으로 쿼리 제거 버전도 보유
      const noQuery = nu.split("?")[0];
      cleaned.push({ raw: nu, noQuery });
    }

    // 순서 유지 + noQuery 기준 유니크
    const uniqNoQuery = new Set();
    const urls = [];
    for (const item of cleaned) {
      if (uniqNoQuery.has(item.noQuery)) continue;
      uniqNoQuery.add(item.noQuery);
      urls.push(item.noQuery); // 쿼리 제거한 깔끔한 URL 반환
    }

    /**
     * ✅ 대표/상세 분리
     * VVIC 내부 구조가 계속 바뀌어서 완벽 분리는 어렵고,
     * 실전에서는 "상단 대표(갤러리)"와 "본문 상세" DOM을 Playwright로 구분하는게 제일 확실함.
     * 지금은 일단:
     * - 첫 10개를 대표로 가정
     * - 나머지를 상세로 가정
     */
    const main_images = urls.slice(0, 10);
    const detail_images = urls.slice(10);

    return res.json({
      ok: true,
      main_images,
      detail_images,
      total: urls.length,
    });
  } catch (e) {
    console.error("[/api/extract] error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

// ✅ (호환) 프론트에서 /extract?url=... 로 호출하는 경우가 있어서 /api/extract로 연결
app.get("/extract", (req, res) => {
  const url = String(req.query.url || "").trim();
  const qs = url ? `?url=${encodeURIComponent(url)}` : "";
  res.redirect(307, `/api/extract${qs}`);
});

// ✅ 프론트 정적 파일 서빙
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));

// ✅ SPA fallback (React Router 대응)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
