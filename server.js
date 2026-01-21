import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ✅ VVIC API Router (기존 코드 유지)
import vvicRouter from "./dist/vvic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ [필수 추가] JSON 데이터 받기 (이게 없으면 AI 요청 등이 실패합니다)
app.use(express.json());

// CORS 설정
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
// 🟢 [여기부터 추가됨] 1688 API 라우트
// (반드시 app.get("*") 보다 위에 있어야 작동합니다)
// ==================================================================

// 1. 데이터 추출 API (GET /api/1688/extract)
app.get("/api/1688/extract", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    console.log("👉 [1688 Extract 요청]", targetUrl);

    if (!targetUrl) {
      return res.status(400).json({ ok: false, error: "URL이 없습니다." });
    }

    // ⚠️ 임시 데이터 (실제 크롤러 연결 전 테스트용)
    const mockData = {
      ok: true,
      product_name: "1688 샘플 상품 (서버 연결 성공)",
      main_media: [
        { type: "image", url: "https://img.alicdn.com/imgextra/i4/2216611463139/O1CN01Zk1t2u1Kmq5Rj6y0P_!!2216611463139.jpg" },
        { type: "image", url: "https://img.alicdn.com/imgextra/i2/2216611463139/O1CN01s1b2c34Kmq5S12345_!!2216611463139.jpg" }
      ],
      detail_media: [
        { type: "image", url: "https://img.alicdn.com/imgextra/i1/2216611463139/O1CN01abCdEf1Kmq5Detail_!!2216611463139.jpg" },
        { type: "image", url: "https://img.alicdn.com/imgextra/i3/2216611463139/O1CN01GhIjKl1Kmq5Detail_!!2216611463139.jpg" }
      ]
    };

    // 1초 뒤 응답 (로딩 바 확인용)
    setTimeout(() => {
        res.json(mockData);
    }, 1000);

  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "서버 에러: " + e.message });
  }
});

// 2. AI 생성 API (POST /api/1688/ai)
app.post("/api/1688/ai", async (req, res) => {
  console.log("👉 [1688 AI 요청]", req.body);
  res.json({
    ok: true,
    product_name: "AI가 만든 상품명 예시",
    editor: "AI가 작성한 상세 설명입니다.",
    coupang_keywords: ["테스트", "키워드"],
    ably_keywords: ["테스트", "에이블리"]
  });
});

// 3. 이미지 합치기 API (POST /api/1688/stitch)
app.post("/api/1688/stitch", async (req, res) => {
    res.status(200).send("이미지 처리 기능 준비중");
});
// ==================================================================


// ✅ [기존] VVIC API 연결
app.use("/api/vvic", vvicRouter);

// 헬스 체크
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ✅ [기존] VVIC Legacy 추출 코드
app.get("/api/extract", async (req, res) => {
  // ... (기존 코드 생략 - 그대로 두시면 됩니다) ...
  try {
    const targetUrl = String(req.query.url || "").trim();
    if (!targetUrl) return res.status(400).json({ ok: false, error: "missing_url" });

    // 간단한 fetch 로직 (기존 유지)
    res.json({ ok: true, message: "기존 VVIC 로직" }); 
  } catch (e) {
    res.status(500).json({ ok: false, error: "error" });
  }
});

// 호환성 리다이렉트
app.get("/extract", (req, res) => {
  const url = String(req.query.url || "").trim();
  const qs = url ? `?url=${encodeURIComponent(url)}` : "";
  res.redirect(307, `/api/extract${qs}`);
});

// ✅ 프론트엔드 파일 서빙
const clientDist = path.join(__dirname, "dist", "public");
app.use(express.static(clientDist));

// 🚨 [중요] SPA Fallback (이게 맨 아래에 있어야 합니다)
// 위에서 처리 못한 요청만 여기서 HTML을 보냅니다.
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
