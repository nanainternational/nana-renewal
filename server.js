import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ✅ VVIC API Router
import vvicRouter from "./dist/vvic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
// 🖼️ 이미지 우회(Proxy) API (유지)
// ==================================================================
app.get("/api/proxy/image", async (req, res) => {
  try {
    const imgUrl = req.query.url;
    if (!imgUrl) return res.status(400).send("URL이 없습니다.");

    const response = await fetch(imgUrl, {
      headers: {
        "Referer": "https://www.1688.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to load image");
    }

    const contentType = response.headers.get("content-type");
    res.setHeader("Content-Type", contentType || "image/jpeg");

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));

  } catch (e) {
    console.error("이미지 프록시 에러:", e.message);
    res.status(500).send("Error fetching image");
  }
});

// ==================================================================
// 🟢 [수정됨] 1688 데이터 추출 API (필터링 강화!)
// ==================================================================
app.get("/api/1688/extract", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    console.log("👉 [1688 Extract 요청]", targetUrl);

    if (!targetUrl) return res.status(400).json({ ok: false, error: "URL required" });

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.1688.com/"
      }
    });

    const html = await response.text();

    const imgSet = new Set();
    const regex = /(https?:)?\/\/[^"'\s]+\.alicdn\.com\/[^"'\s]+\.(?:jpg|png|webp)/gi;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
      let url = match[0];
      // ✅ 1688은 //img.alicdn.com 처럼 프로토콜 없는 URL이 많아서 https:를 보정
      if (url.startsWith("//")) url = "https:" + url;
      
      // 1. 썸네일/리사이징 접미사 제거 (_50x50.jpg 등)
      url = url.replace(/_\d+x\d+.*$/, ""); 
      
      // 2. 🧹 [강력 필터링 추가] 쓸데없는 아이콘, 배너 제거
      // 'tps': 1688의 UI 아이콘이나 배너에 주로 쓰임 (방금 보신 16x16 같은 것들)
      // 'icon', 'avatar': 아이콘, 프로필 사진 등 제외
      if (url.includes("tps") || url.includes("icon") || url.includes("avatar") || url.includes("mock")) {
        continue; 
      }
      
      imgSet.add(url);
    }

    const allImages = Array.from(imgSet);
    console.log(`📸 발견된 이미지(필터링 후): ${allImages.length}장`);

    const main_media = allImages.slice(0, 5).map(url => ({ type: "image", url }));
    const detail_media = allImages.slice(5).map(url => ({ type: "image", url }));

    res.json({
      ok: true,
      product_name: "1688 상품 데이터",
      main_media,
      detail_media
    });

  } catch (e) {
    console.error("1688 추출 에러:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ==================================================================
// 🟣 [추가] 확장프로그램(클라이언트)에서 추출한 결과를 서버가 받는 API
// ==================================================================
app.post("/api/1688/extract_client", (req, res) => {
  try {
    const { url, product_name, main_media, detail_media } = req.body || {};

    if (!url) return res.status(400).json({ ok: false, error: "url required" });

    const safeMain = Array.isArray(main_media) ? main_media : [];
    const safeDetail = Array.isArray(detail_media) ? detail_media : [];

    console.log("✅ [1688 Client Extract 수신]", url);
    console.log(`   - main: ${safeMain.length}, detail: ${safeDetail.length}`);

    return res.json({
      ok: true,
      url,
      product_name: product_name || "1688 상품 데이터",
      main_media: safeMain,
      detail_media: safeDetail,
      source: "client_extension",
    });
  } catch (e) {
    console.error("extract_client 에러:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});


// 기타 API
app.post("/api/1688/ai", (req, res) => res.json({ ok: true, product_name: "AI 제안 상품명" }));
app.post("/api/1688/stitch", (req, res) => res.status(200).send("준비중"));

// ✅ VVIC 및 공통 로직
app.use("/api/vvic", vvicRouter);
app.get("/api/health", (req, res) => res.json({ ok: true }));

// [레거시] 구형 extract
app.get("/api/extract", async (req, res) => {
    res.json({ ok: true, main_images: [], detail_images: [] }); 
});

// ✅ 프론트엔드 정적 파일 서빙
const clientDist = path.join(__dirname, "dist", "public");
app.use(express.static(clientDist));

// ✅ SPA Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Image Proxy Ready at /api/proxy/image`);
});
