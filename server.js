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

// JSON 데이터 용량 제한 늘리기 (이미지 URL이 많을 수 있음)
app.use(express.json({ limit: "10mb" }));

// ✅ CORS 설정
app.use(
  cors({
    origin: [
      "https://nana-renewal.onrender.com",
      "https://nana-renewal-backend.onrender.com",
      "https://detail.1688.com", // 👈 확장프로그램
      "https://www.1688.com",    // 👈 확장프로그램
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
// 💾 [전역 변수] 가장 최근 추출된 상품 데이터를 임시 저장
// (서버가 재시작되면 사라지는 메모리 저장 방식입니다)
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
// 🟢 [Legacy] 1688 서버 직접 추출 (사용 안 함, 안내 메시지용)
// ==================================================================
app.get("/api/1688/extract", async (req, res) => {
  res.json({
    ok: true,
    product_name: "1688 상품 데이터",
    main_media: [],
    detail_media: [],
    source: "server_fetch",
    message: "서버 직접 추출은 차단될 수 있습니다. 확장프로그램을 사용하세요."
  });
});

// ==================================================================
// 🟣 [수정됨] 확장프로그램 데이터 수신 및 저장 (POST)
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
      timestamp: new Date() // 언제 저장됐는지 시간 기록
    };

    console.log("✅ [1688] 데이터 수신 및 저장 완료:", latestProductData.product_name);
    console.log(`   - 대표: ${latestProductData.main_media.length}, 상세: ${latestProductData.detail_media.length}`);

    // 확장프로그램에는 "잘 저장했다"고 응답
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
// 🆕 [신규] 웹사이트가 저장된 데이터를 가져가는 API (GET)
// ==================================================================
app.get("/api/1688/latest", (req, res) => {
  if (!latestProductData) {
    // 아직 확장프로그램이 데이터를 안 보냈을 때
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

// ✅ VVIC 및 공통 로직
app.use("/api/vvic", vvicRouter);
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
