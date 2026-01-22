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
// 🖼️ [수정 완료] 이미지 우회(Proxy) API
// 중요: 프론트엔드가 요청하는 주소(/api/proxy/image)로 맞췄습니다!
// ==================================================================
app.get("/api/proxy/image", async (req, res) => {
  try {
    const imgUrl = req.query.url;
    if (!imgUrl) return res.status(400).send("URL이 없습니다.");

    // 1688 서버인 척하고 이미지 요청
    const response = await fetch(imgUrl, {
      headers: {
        "Referer": "https://www.1688.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      // 실패 시 로그 남김
      console.error(`이미지 로드 실패 (${response.status}): ${imgUrl}`);
      return res.status(response.status).send("Failed to load image");
    }

    // 가져온 이미지 데이터 전달
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
// 🟢 1688 데이터 추출 API
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
    const regex = /https?:\/\/(?:cbu01|img|hu01|gw)\.alicdn\.com\/[^"'\s\(\)]+\.(?:jpg|png|webp)/gi;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
      let url = match[0].replace(/_\d+x\d+.*$/, ""); 
      imgSet.add(url);
    }

    const allImages = Array.from(imgSet);
    console.log(`📸 발견된 이미지: ${allImages.length}장`);

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

// ✅ SPA Fallback (맨 마지막)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  // 서버 시작 시 로그로 확인 가능
  console.log(`✅ Image Proxy Ready at /api/proxy/image`);
});
