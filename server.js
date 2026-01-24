import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ❌ 빌드 파일 의존성 주석 처리
// import vvicRouter from "./dist/vvic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

// ✅ CORS 모두 허용
app.use(
  cors({
    origin: "*", 
    methods: ["GET", "POST", "OPTIONS"],
    credentials: false, 
  })
);

// ==================================================================
// 💾 데이터 임시 저장
// ==================================================================
let latestProductData = null;

// ==================================================================
// 🖼️ 이미지 우회(Proxy) API
// ==================================================================
app.get("/api/proxy/image", async (req, res) => {
  try {
    const imgUrl = req.query.url;
    if (!imgUrl) return res.status(400).send("URL이 없습니다.");

    const response = await fetch(imgUrl, {
      headers: {
        Referer: "https://www.1688.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) return res.status(response.status).send("Failed to load");

    const contentType = response.headers.get("content-type");
    res.setHeader("Content-Type", contentType || "image/jpeg");

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (e) {
    console.error("이미지 프록시 에러:", e.message);
    res.status(500).send("Error");
  }
});

// ==================================================================
// 🟣 데이터 수신 (POST)
// ==================================================================
app.post("/api/1688/extract_client", (req, res) => {
  try {
    const { url, product_name, main_media, detail_media } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: "url required" });

    latestProductData = {
      url,
      product_name: product_name || "1688 상품 데이터",
      main_media: Array.isArray(main_media) ? main_media : [],
      detail_media: Array.isArray(detail_media) ? detail_media : [],
      source: "client_extension",
      timestamp: new Date()
    };

    console.log("✅ [1688] 데이터 수신:", latestProductData.product_name);
    return res.json({ ok: true, message: "저장 완료" });
  } catch (e) {
    console.error("extract_client 에러:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ==================================================================
// 🆕 데이터 조회 (GET)
// ==================================================================
app.get("/api/1688/latest", (req, res) => {
  if (!latestProductData) return res.json({ ok: false, message: "데이터 없음" });
  res.json({ ok: true, ...latestProductData });
});

// app.use("/api/vvic", vvicRouter);
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ✅ [수정] 프론트엔드 경로 수정 (dist/public -> dist)
// Vite 기본 빌드 경로는 dist 입니다.
const clientDist = path.join(__dirname, "dist"); 
app.use(express.static(clientDist));

app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
