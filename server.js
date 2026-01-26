import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: false,
  })
);

// ✅ 추가: /api/me 는 무조건 JSON으로 (프론트 크래시 방지)
app.get("/api/me", (req, res) => {
  // 프론트에서 fetch wrapper가 non-2xx를 null 처리하는 경우가 있어 200으로 내려줍니다.
  return res.status(200).json({ ok: false, error: "not_logged_in" });
});

// ==================================================================
// 🟡 VVIC 이미지 추출 (GET)
// ==================================================================
function uniq(arr) { return Array.from(new Set(arr.filter(Boolean))); }
function norm(u) { if (!u) return ""; return u.startsWith("//") ? "https:" + u : u; }
function stripQuery(u) { try { const x = new URL(u); x.search = ""; return x.toString(); } catch { return String(u).split("?")[0]; } }
function extractVvicImages(html) {
  const text = String(html || "");
  const re = /(https?:\/\/img\d*\.vvic\.com\/[^"'\\s>]+|\/\/img\d*\.vvic\.com\/[^"'\\s>]+)/gi;
  const found = [];
  let m;
  while ((m = re.exec(text)) !== null) { found.push(stripQuery(norm(m[1]))); }
  return uniq(found);
}

app.get("/api/vvic/_debug", (req, res) => {
  return res.json({ ok: true, where: "server.js", ts: Date.now() });
});

app.get("/api/vvic/extract", async (req, res) => {
  try {
    const targetUrl = String(req.query.url || "").trim();
    if (!targetUrl) return res.status(400).json({ ok: false, error: "url required" });
    if (!/^https?:\/\/(www\.)?vvic\.com\/item\//i.test(targetUrl)) {
      return res.status(400).json({ ok: false, error: "vvic item url만 지원합니다." });
    }

    const r = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
    });

    const html = await r.text();
    const imgs = extractVvicImages(html);

    const MAIN_LIMIT = 12;
    const main = imgs.slice(0, MAIN_LIMIT).map((url) => ({ type: "image", url }));
    const detail = imgs.slice(MAIN_LIMIT).map((url) => ({ type: "image", url }));

    res.setHeader("Cache-Control", "no-store");
    return res.json({
      ok: true,
      url: targetUrl,
      main_media: main,
      detail_media: detail,
      main_images: main.map((x) => x.url),
      detail_images: detail.map((x) => x.url),
      counts: { total: imgs.length, main: main.length, detail: detail.length },
    });
  } catch (e) {
    console.error("VVIC extract error:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

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
      timestamp: new Date(),
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

app.get("/api/health", (req, res) => res.json({ ok: true }));

const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));

app.get("*", (req, res) => {
  // ✅ API는 SPA fallback으로 보내지 않기 (JSON 대신 HTML 내려오는 문제 방지)
  if (req.path && req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "api_not_found" });
  }
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
