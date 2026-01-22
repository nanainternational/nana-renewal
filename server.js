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
// 프론트엔드에서 POST 요청으로 데이터를 보낼 때 필요합니다.
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
// (가짜 데이터 대신 실제 이미지를 가져오도록 업그레이드했습니다)
// ==================================================================

// 1. 데이터 추출 API (GET /api/1688/extract)
app.get("/api/1688/extract", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    console.log("👉 [1688 Extract 요청]", targetUrl);

    if (!targetUrl) {
      return res.status(400).json({ ok: false, error: "URL이 없습니다." });
    }

    // 1) 1688 페이지 접속 (헤더 위장)
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

    // 2) 이미지 URL 추출 (정규식 강화)
    const imgSet = new Set();
    // cbu01, img, hu01 등 alicdn 서브도메인 모두 포함
    const regex = /https?:\/\/(?:cbu01|img|hu01|gw)\.alicdn\.com\/[^"'\s\(\)]+\.(?:jpg|png|webp)/gi;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
        let url = match[0];
        // 썸네일 사이즈(_50x50.jpg 등) 제거하여 고화질 원본 확보
        url = url.replace(/_\d+x\d+.*$/, ""); 
        imgSet.add(url);
    }

    const allImages = Array.from(imgSet);
    console.log(`📸 [1688] 이미지 총 ${allImages.length}개 발견`);

    // 3) 데이터가 없을 경우 (1688이 봇을 막았을 때) 대비
    if (allImages.length === 0) {
        console.log("⚠️ 이미지를 못 찾았습니다. (로그인 페이지 리다이렉트 추정)");
        // 빈 배열을 보내면 프론트에서 "이미지 없음" 처리
        return res.json({
            ok: true,
            product_name: "이미지 추출 실패 (로그인 제한)",
            main_media: [],
            detail_media: []
        });
    }

    // 4) 대표/상세 분류 (앞쪽 5개는 대표, 나머지는 상세)
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

// 2. AI 생성 API (POST /api/1688/ai)
app.post("/api/1688/ai", async (req, res) => {
  console.log("👉 [1688 AI 요청]", req.body);
  
  // 임시 응답 (OpenAI 연동 전 테스트용)
  res.json({
    ok: true,
    product_name: "AI가 제안하는 대박 상품명",
    editor: "이 상품은 트렌디한 디자인과 편안한 착용감을 자랑합니다.",
    coupang_keywords: ["여성의류", "도매", "데일리룩"],
    ably_keywords: ["러블리", "하객룩"]
  });
});

// 3. 이미지 합치기 API (POST /api/1688/stitch)
app.post("/api/1688/stitch", async (req, res) => {
    // 실제로는 sharp 라이브러리 등을 이용해 이미지를 합쳐야 합니다.
    res.status(200).send("이미지 처리 기능 준비중");
});

// ==================================================================
// ✅ 기존 VVIC 및 공통 로직 (여기서부터는 원본 유지)
// ==================================================================

// VVIC API 마운트
app.use("/api/vvic", vvicRouter);

// 헬스 체크
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/**
 * [기존] VVIC 이미지 추출 (레거시 지원)
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
    const candidates = new Set();
    
    // 이미지 URL 정규식 추출
    const imgAttrRegex = /(src|data-src|data-original|data-lazy|data-zoom-image)\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = imgAttrRegex.exec(html))) {
      const u = m[2];
      if (!u) continue;
      candidates.add(u);
    }
    const jsonImgRegex = /https?:\/\/img\d+\.vvic\.com\/upload\/[a-zA-Z0-9_\-\.]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s]*)?/gi;
    while ((m = jsonImgRegex.exec(html))) {
      candidates.add(m[0]);
    }

    const normalize = (u) => {
      let s = String(u).trim();
      if (!s) return "";
      if (s.startsWith("//")) s = "https:" + s;
      if (s.startsWith("/upload/")) s = "https://img1.vvic.com" + s;
      return s;
    };

    const cleaned = [];
    for (const u of candidates) {
      const nu = normalize(u);
      if (!nu) continue;
      if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(nu)) continue;
      if (!/img\d+\.vvic\.com\/upload\//i.test(nu)) continue;
      const noQuery = nu.split("?")[0];
      cleaned.push({ raw: nu, noQuery });
    }

    const uniqNoQuery = new Set();
    const urls = [];
    for (const item of cleaned) {
      if (uniqNoQuery.has(item.noQuery)) continue;
      uniqNoQuery.add(item.noQuery);
      urls.push(item.noQuery); 
    }

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

// 호환성 유지 (redirect)
app.get("/extract", (req, res) => {
  const url = String(req.query.url || "").trim();
  const qs = url ? `?url=${encodeURIComponent(url)}` : "";
  res.redirect(307, `/api/extract${qs}`);
});

// ✅ 프론트엔드 정적 파일 서빙
// vite.config.ts의 outDir 설정(dist/public)에 맞춥니다.
const clientDist = path.join(__dirname, "dist", "public");
app.use(express.static(clientDist));

// ✅ SPA Fallback (모든 API 라우트보다 맨 밑에 있어야 함)
// API 요청이 아닌 모든 요청은 index.html을 돌려주어 리액트 라우터가 작동하게 합니다.
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Ready to handle 1688 requests at /api/1688/extract`);
});
