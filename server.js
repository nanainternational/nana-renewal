import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ✅ VVIC API Router
// (주의: dist/vvic.js 파일이 빌드되어 있어야 합니다. 없으면 에러가 날 수 있으니 확인 필요)
import vvicRouter from "./dist/vvic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ [필수 추가] JSON Body Parsing
app.use(express.json());

// ✅ CORS 설정
app.use(
  cors({
    origin: [
      "https://nana-renewal.onrender.com",
      "https://nana-renewal-backend.onrender.com",
      "http://127.0.0.1:5000",
      "http://localhost:5000",
      "http://127.0.0.1:5173",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

// ==================================================================
// 🟢 [수정됨] 1688 API 라우트
// ==================================================================

// 1. 데이터 추출 API (GET /api/1688/extract)
app.get("/api/1688/extract", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    console.log("👉 [1688 Extract 요청]", targetUrl);

    if (!targetUrl) {
      return res.status(400).json({ ok: false, error: "URL이 없습니다." });
    }

    // 1) 1688 페이지 접속
    const response = await fetch(targetUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.1688.com/", 
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8"
        }
    });

    if (!response.ok) {
        throw new Error(`1688 접속 실패 (Status: ${response.status})`);
    }

    const html = await response.text();

    // 2) 이미지 URL 추출
    const imgSet = new Set();
    const regex = /https?:\/\/(?:cbu01|img|hu01|gw)\.alicdn\.com\/[^"'\s\(\)]+\.(?:jpg|png|webp)/gi;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
        let url = match[0];
        url = url.replace(/_\d+x\d+.*$/, ""); 
        imgSet.add(url);
    }

    const allImages = Array.from(imgSet);
    console.log(`📸 [1688] 이미지 총 ${allImages.length}개 발견`);

    // 3) 데이터가 없을 경우
    if (allImages.length === 0) {
        console.log("⚠️ 이미지를 못 찾았습니다.");
        return res.json({
            ok: true,
            product_name: "이미지 추출 실패 (로그인 제한)",
            main_media: [],
            detail_media: []
        });
    }

    // 4) 대표/상세 분류
    const main_media = allImages.slice(0, 5).map(url => ({ type: "image", url }));
    const detail_media = allImages.slice(5).map(url => ({ type: "image", url }));

    res.json({
      ok: true,
      product_name: "1688 상품 데이터 (추출 성공)",
      main_media: main_media,
      detail_media: detail_media
    });

  } catch (e) {
    console.error("1688 크롤링 에러:", e);
    res.status(500).json({ ok: false, error: "데이터 추출 실패: " + e.message });
  }
});

// 2. AI 생성 API
app.post("/api/1688/ai", async (req, res) => {
  console.log("👉 [1688 AI 요청]", req.body);
  res.json({
    ok: true,
    product_name: "AI가 제안하는 대박 상품명",
    editor: "이 상품은 트렌디한 디자인과 편안한 착용감을 자랑합니다.",
    coupang_keywords: ["여성의류", "도매", "데일리룩"],
    ably_keywords: ["러블리", "하객룩"]
  });
});

// 3. 이미지 합치기 API
app.post("/api/1688/stitch", async (req, res) => {
    res.status(200).send("이미지 처리 기능 준비중");
});

// ==================================================================
// 🖼️ [새로 추가됨] 이미지 프록시 API (이게 없어서 이미지가 안 떴던 것!)
// ==================================================================
app.get("/image", async (req, res) => {
  try {
    const imgUrl = req.query.url;
    if (!imgUrl) return res.status(400).send("URL required");

    // 1688 서버인 척 하고 이미지 요청 (Referer 필수)
    const response = await fetch(imgUrl, {
      headers: {
        "Referer": "https://www.1688.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);

    // 이미지 데이터 스트리밍 (Binary)
    const contentType = response.headers.get("content-type");
    res.setHeader("Content-Type", contentType || "image/jpeg");
    
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));

  } catch (e) {
    console.error("Image proxy error:", e.message);
    res.status(500).send("Error fetching image");
  }
});

// ==================================================================
// ✅ 기존 VVIC 및 공통 로직
// ==================================================================

app.use("/api/vvic", vvicRouter);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// [레거시] VVIC 추출
app.get("/api/extract", async (req, res) => {
  try {
    const targetUrl = String(req.query.url || "").trim();
    if (!targetUrl) return res.status(400).json({ ok: false, error: "missing_url" });

    const resp = await fetch(targetUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!resp.ok) return res.status(502).json({ ok: false, error: "fetch_failed" });

    const html = await resp.text();
    const candidates = new Set();
    
    const imgAttrRegex = /(src|data-src|data-original|data-lazy|data-zoom-image)\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = imgAttrRegex.exec(html))) {
      if(m[2]) candidates.add(m[2]);
    }

    const normalize = (u) => {
      let s = String(u).trim();
      if (!s) return "";
      if (s.startsWith("//")) s = "https:" + s;
      if (s.startsWith("/upload/")) s = "https://img1.vvic.com" + s;
      return s;
    };

    const urls = [];
    for (const u of candidates) {
      const nu = normalize(u);
      if (nu && /\.(jpg|png|webp)/i.test(nu) && /vvic\.com/i.test(nu)) {
         urls.push(nu.split("?")[0]);
      }
    }
    const uniqueUrls = [...new Set(urls)];

    return res.json({
      ok: true,
      main_images: uniqueUrls.slice(0, 10),
      detail_images: uniqueUrls.slice(10),
      total: uniqueUrls.length,
    });
  } catch (e) {
    console.error("[/api/extract] error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

// 호환성 유지
app.get("/extract", (req, res) => {
  const url = String(req.query.url || "").trim();
  const qs = url ? `?url=${encodeURIComponent(url)}` : "";
  res.redirect(307, `/api/extract${qs}`);
});

// ✅ 프론트엔드 정적 파일 서빙
const clientDist = path.join(__dirname, "dist", "public");
app.use(express.static(clientDist));

// ✅ SPA Fallback (가장 마지막에 위치)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Ready to handle 1688 requests at /api/1688/extract`);
});
