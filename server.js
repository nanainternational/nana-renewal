import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
// ✅ VVIC API Router (기존에 쓰시던 경로 확인해주세요)
import vvicRouter from "./dist/vvic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// JSON 데이터 용량 제한 늘리기 (이미지 URL이 많을 수 있음)
app.use(express.json({ limit: "10mb" }));

// ✅ CORS 설정 (확장프로그램이 1688에서 요청을 보내므로 1688 도메인 추가)
app.use(
  cors({
    origin: [
      "https://nana-renewal.onrender.com",
      "https://nana-renewal-backend.onrender.com",
      "https://detail.1688.com", // 👈 확장프로그램 동작을 위해 필수 추가
      "https://www.1688.com",    // 👈 확장프로그램 동작을 위해 필수 추가
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
// 🟢 1688 데이터 추출 API (서버 fetch 시도) - (유지하되 실패 시 사용 안 함)
// ==================================================================
app.get("/api/1688/extract", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    console.log("👉 [1688 Extract 요청]", targetUrl);

    if (!targetUrl) return res.status(400).json({ ok: false, error: "URL required" });

    const response = await fetch(targetUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.1688.com/",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    const html = await response.text();
    console.log(`📄 응답 HTML 길이: ${html.length}`);

    // ... (기존 서버 사이드 로직 유지) ...
    // 이미지가 하나도 안 잡힐 확률이 높지만, 레거시로 남겨둡니다.
    
    res.json({
      ok: true,
      product_name: "1688 상품 데이터 (서버 추출 시도됨)",
      main_media: [], // 비워둠 (확장프로그램 사용 권장)
      detail_media: [],
      source: "server_fetch",
      html_length: html.length,
      message: "서버 직접 추출은 차단될 수 있습니다. 확장프로그램을 사용하세요."
    });
  } catch (e) {
    console.error("1688 추출 에러:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ==================================================================
// 🟣 [NEW] 확장프로그램(클라이언트)에서 추출한 결과를 서버가 받는 API
// ==================================================================
app.post("/api/1688/extract_client", (req, res) => {
  try {
    // 확장프로그램이 body에 담아 보낸 데이터를 받습니다.
    const { url, product_name, main_media, detail_media } = req.body || {};

    if (!url) return res.status(400).json({ ok: false, error: "url required" });

    const safeMain = Array.isArray(main_media) ? main_media : [];
    const safeDetail = Array.isArray(detail_media) ? detail_media : [];

    console.log("✅ [1688 Client Extract 수신 성공]");
    console.log(`   - URL: ${url}`);
    console.log(`   - 상품명: ${product_name}`);
    console.log(`   - 대표이미지: ${safeMain.length}장`);
    console.log(`   - 상세이미지: ${safeDetail.length}장`);

    // 여기서 DB에 저장하거나, 받은 데이터를 그대로 돌려줘서 프론트엔드가 쓰게 할 수 있습니다.
    // 지금은 받은 데이터를 그대로 반환합니다.
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

// ==================================================================
// 기타 API 및 설정
// ==================================================================
app.post("/api/1688/ai", (req, res) => res.json({ ok: true, product_name: "AI 제안 상품명" }));
app.post("/api/1688/stitch", (req, res) => res.status(200).send("준비중"));

// ✅ VVIC 및 공통 로직
app.use("/api/vvic", vvicRouter);
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ✅ 프론트엔드 정적 파일 서빙
const clientDist = path.join(__dirname, "dist", "public"); // 경로가 맞는지 확인 필요 (dist/public이 아닐 수도 있음)
// 만약 dist 폴더 안에 바로 index.html이 있다면 아래처럼 수정:
// const clientDist = path.join(__dirname, "dist"); 

app.use(express.static(clientDist));

// ✅ SPA Fallback (새로고침 시 프론트엔드 라우팅 지원)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Image Proxy Ready at /api/proxy/image`);
});
