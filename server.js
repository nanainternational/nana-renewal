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
// 🖼️ 이미지 우회(Proxy) API
// ==================================================================
app.get("/api/proxy/image", async (req, res) => {
  try {
    const imgUrl = req.query.url;
    if (!imgUrl) return res.status(400).send("URL이 없습니다.");

    // 이미지 요청할 때는 PC인 척 하는게 더 잘 될 때가 있음 (Referer 유지)
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
// 🟢 [핵심 수정] 1688 데이터 추출 API (모바일 위장술 🥷)
// ==================================================================
app.get("/api/1688/extract", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    console.log("👉 [1688 Extract 요청]", targetUrl);

    if (!targetUrl) return res.status(400).json({ ok: false, error: "URL required" });

    // 1️⃣ [중요] 아이폰(Mobile)인 척 헤더 조작
    // 모바일로 접속하면 로그인 차단을 덜 당하고, 페이지 구조가 단순해져서 긁기 좋습니다.
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://m.1688.com/" // 모바일 Referer
      },
      redirect: 'follow' // 리다이렉트 되면 끝까지 쫓아감
    });

    const html = await response.text();
    console.log(`📄 응답 HTML 길이: ${html.length}`); // 길이가 너무 짧으면(예: 3000 이하) 차단된 것임

    // 2️⃣ 이미지 URL 추출 (정규식 유지)
    const imgSet = new Set();
    const regex = /https?:\/\/(?:cbu01|img|hu01|gw)\.alicdn\.com\/[^"'\s\(\)]+\.(?:jpg|png|webp)/gi;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
      let url = match[0];
      
      // 썸네일/리사이징 제거
      url = url.replace(/_\d+x\d+.*$/, ""); 
      url = url.replace(/\.summ\.jpg$/, ""); // 모바일 썸네일 패턴 제거 추가
      
      // 3️⃣ 필터링 (아이콘, 배너 제거)
      if (url.includes("tps") || url.includes("icon") || url.includes("avatar") || url.includes("mock") || url.includes("TB1")) {
        // TB1 패턴도 장식용 이미지가 많아서 필터에 추가해봤습니다.
        continue; 
      }
      
      imgSet.add(url);
    }

    const allImages = Array.from(imgSet);
    console.log(`📸 발견된 이미지(필터링 후): ${allImages.length}장`);

    // 4️⃣ 차단 감지 (여전히 0장이면)
    if (allImages.length === 0) {
        console.warn("⚠️ 이미지가 없습니다. (로그인 페이지로 리다이렉트 되었을 확률 높음)");
        // 혹시 모르니 빈 배열이라도 내려보내서 프론트 에러 방지
    }

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

// ✅ SPA Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Mobile Mode Ready 📱`);
});
