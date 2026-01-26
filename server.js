// server_vvic_mobile_fix.js
// 기존 server_vvic_fixed.js 기반, VVIC 이미지만 모바일 페이지로 파싱하도록 최소 수정

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.set("etag", false);
app.disable("etag");

app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: false,
  })
);

// ==============================
// VVIC 유틸
// ==============================
function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}
function norm(u) {
  if (!u) return "";
  return u.startsWith("//") ? "https:" + u : u;
}
function stripQuery(u) {
  try {
    const x = new URL(u);
    x.search = "";
    return x.toString();
  } catch {
    return String(u).split("?")[0];
  }
}
function extractVvicImages(html) {
  const re = /(https?:\/\/img\d*\.vvic\.com\/[^"'\s>]+|\/\/img\d*\.vvic\.com\/[^"'\s>]+)/gi;
  const found = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    found.push(stripQuery(norm(m[1])));
  }
  return uniq(found);
}

// ==============================
// VVIC API (모바일 페이지 사용)
// ==============================
app.get("/api/vvic/extract", async (req, res) => {
  try {
    const targetUrl = String(req.query.url || "").trim();
    if (!targetUrl) return res.status(400).json({ ok: false, error: "url required" });

    const mobileUrl = targetUrl.replace("www.vvic.com", "m.vvic.com");

    const r = await fetch(mobileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile Safari/605.1.15",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });

    const html = await r.text();
    const imgs = extractVvicImages(html);

    const MAIN_LIMIT = 12;
    const main = imgs.slice(0, MAIN_LIMIT).map((url) => ({ type: "image", url }));
    const detail = imgs.slice(MAIN_LIMIT).map((url) => ({ type: "image", url }));

    res.setHeader("Cache-Control", "no-store");
    return res.json({
      ok: true,
      url: mobileUrl,
      main_media: main,
      detail_media: detail,
      main_images: main.map((x) => x.url),
      detail_images: detail.map((x) => x.url),
      counts: { total: imgs.length, main: main.length, detail: detail.length },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// ==============================
// Static (기존 유지)
// ==============================
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "api_not_found" });
  }
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`VVIC server running on ${PORT}`);
});
