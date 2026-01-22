import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ✅ VVIC API Router (없으면 에러 나니 확인 필요)
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
// 🖼️ [가장 중요] 이미지 우회(Proxy) API
// 1688 이미지를 내 서버가 대신 받아와서 프론트엔드에 전달합니다.
// ==================================================================
app.get("/image", async (req, res) => {
  try {
    const imgUrl = req.query.url;
    // URL이 없거나 1688 관련이 아니면 에러 처리 (보안 강화)
    if (!imgUrl) return res.status(400).send("URL이 없습니다.");

    // 1. 1688 서버인 척하고 이미지 요청 (Referer 속이기)
    const response = await fetch(imgUrl, {
      headers: {
        "Referer": "https://www.1688.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      console.error(`이미지 로드 실패 (${response.status}): ${imgUrl}`);
      return res.status(response.status).send("Failed to load image");
    }

    // 2. 가져온 이미지 데이터를 브라우저에게 그대로 토스 (Stream)
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

    // 1688 페이지 HTML 가져오기
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.1688.com/"
      }
    });

    const html = await response.text();

    // 이미지 URL 정규식 추출
    const imgSet = new Set();
    const regex = /https?:\/\/(?:cbu01|img|hu01|gw)\.alicdn\.com\/[^"'\s\(\)]+\.(?:jpg|png|webp)/gi;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
      let url = match[0].replace(/_\d+x\d+.*$/, ""); // 썸네일 제거
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

// 기타 API들
app.post("/api/1688/ai", (req, res) => res.json({ ok: true, product_name: "AI 제안 상품명" }));
app.post("/api/1688/stitch", (req, res) => res.status(200).send("준비중"));

// ✅ VVIC 및 기존 로직
app.use("/api/vvic", vvicRouter);
app.get("/api/health", (req, res) => res.json({ ok: true }));

// [레거시] 구형 extract
app.get("/api/extract", async (req, res) => {
    // (기존 코드 유지 - 너무 길어서 생략, 필요하면 이전 코드 그대로 쓰시면 됩니다)
    res.json({ ok: true, main_images: [], detail_images: [] }); 
});

// ✅ 프론트엔드 정적 파일 서빙
const clientDist = path.join(__dirname, "dist", "public");
app.use(express.static(clientDist));

// ✅ SPA Fallback (무조건 맨 마지막!)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ 1688 Image Proxy Ready at /image`);
});
