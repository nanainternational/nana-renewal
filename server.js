import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ❌ [수정] 빌드된 파일이 없어서 에러가 나므로 잠시 끕니다.
// import vvicRouter from "./dist/vvic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// JSON 데이터 용량 제한 늘리기 (이미지 URL이 많을 수 있음)
app.use(express.json({ limit: "10mb" }));

// ✅ [수정] CORS 차단 해결을 위해 모든 주소 허용(*)으로 변경
app.use(
  cors({
    origin: "*", 
    methods: ["GET", "POST", "OPTIONS"],
    credentials: false, // origin이 * 일 때는 false여야 함
  })
);

// ==================================================================
// 💾 [전역 변수] 가장 최근 추출된 상품 데이터를 임시 저장
// ==================================================================
let latestProductData = null;


// ==================================================================
// 🖼️ 이미지 우회(Proxy) API (유지)
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
// 🟣 확장프로그램(클라이언트)에서 추출한 결과를 서버가 받는 API
// ==================================================================
app.post("/api/1688/extract_client", (req, res) => {
  try {
    const { url, product_name, main_media, detail_media } = req.body || {};

    if (!url) return res.status(400).json({ ok: false, error: "url required" });

    // ✅ 받은 데이터를 서버 메모리 변수에 저장
    latestProductData = {
      url,
      product_name: product_name || "1688 상품 데이터",
      main_media: Array.isArray(main_media) ? main_media : [],
      detail_media: Array.isArray(detail_media) ? detail_media : [],
      source: "client_extension",
      timestamp: new Date()
    };

    console.log("✅ [1688] 데이터 수신 및 저장 완료:", latestProductData.product_name);
    console.log(`   - 대표: ${latestProductData.main_media.length}, 상세: ${latestProductData.detail_media.length}`);

    return res.json({ 
      ok: true, 
      message: "서버에 저장되었습니다. 웹사이트에서 불러오세요.",
      data_count: latestProductData.main_media.length + latestProductData.detail_media.length
    });

  } catch (e) {
    console.error("extract_client 에러:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ==================================================================
// 🆕 웹사이트가 저장된 데이터를 가져가는 API (GET)
// ==================================================================
app.get("/api/1688/latest", (req, res) => {
  if (!latestProductData) {
    return res.json({ ok: false, message: "아직 추출된 데이터가 없습니다. 확장프로그램을 먼저 실행해주세요." });
  }
  
  // 저장된 데이터 반환
  res.json({ ok: true, ...latestProductData });
});


// ==================================================================
// 기타 API 및 설정
// ==================================================================
app.post("/api/1688/ai", (req, res) => res.json({ ok: true, product_name: "AI 제안 상품명" }));
app.post("/api/1688/stitch", (req, res) => res.status(200).send("준비중"));

// ❌ [수정] 에러 방지를 위해 잠시 끕니다.
// app.use("/api/vvic", vvicRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

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
