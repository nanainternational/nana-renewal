// server.js (VVIC 전용 Playwright 추출 버전)
// ✅ 1688/기타 코드 건드리지 않음
// Start Command: node server.js

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
  })
);

// ------------------------------------------------------
// VVIC utils
// ------------------------------------------------------
function uniq(arr) {
  const s = new Set();
  const out = [];
  for (const x of arr || []) {
    const v = String(x || "").trim();
    if (!v) continue;
    if (s.has(v)) continue;
    s.add(v);
    out.push(v);
  }
  return out;
}
function norm(u) {
  if (!u) return "";
  const x = String(u).trim();
  return x.startsWith("//") ? "https:" + x : x;
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
function isVvicImage(u) {
  const x = String(u || "");
  return /https?:\/\/img\d*\.vvic\.com\//i.test(x);
}
function pickLikelyImages(urls) {
  return urls.filter((u) => {
    const x = String(u);
    if (!isVvicImage(x)) return false;
    if (/tps-\d{2}-\d{2}\.(png|webp)$/i.test(x)) return false;
    if (/(icon|sprite|logo|favicon)/i.test(x)) return false;
    return true;
  });
}

async function autoScroll(page, steps = 6) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.max(800, window.innerHeight)));
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

// ------------------------------------------------------
// Playwright (lazy singleton)
// ------------------------------------------------------
let _pw = null;
let _browser = null;

async function getBrowser() {
  if (_browser) return _browser;

  if (!_pw) {
    try {
      _pw = await import("playwright");
    } catch {
      _pw = await import("playwright-core");
    }
  }

  const chromium = _pw.chromium || (_pw.default && _pw.default.chromium);
  if (!chromium) throw new Error("playwright chromium not found");

  _browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  return _browser;
}

async function closeBrowser() {
  try {
    if (_browser) await _browser.close();
  } catch {}
  _browser = null;
}

process.on("SIGTERM", closeBrowser);
process.on("SIGINT", closeBrowser);

// ------------------------------------------------------
// VVIC API
// ------------------------------------------------------
app.get("/api/vvic/_debug", async (req, res) => {
  let pwOk = false;
  let err = null;
  try {
    await getBrowser();
    pwOk = true;
  } catch (e) {
    err = String(e?.message || e);
  }
  res.setHeader("Cache-Control", "no-store");
  return res.json({
    ok: true,
    where: "server.js",
    playwright: pwOk,
    error: err,
    ts: Date.now(),
  });
});

// GET /api/vvic/extract?url=https://www.vvic.com/item/...
app.get("/api/vvic/extract", async (req, res) => {
  const started = Date.now();
  try {
    const targetUrl = String(req.query.url || "").trim();
    if (!targetUrl) return res.status(400).json({ ok: false, error: "url required" });
    if (!/^https?:\/\/(www\.)?vvic\.com\/item\//i.test(targetUrl)) {
      return res.status(400).json({ ok: false, error: "vvic item url만 지원합니다." });
    }

    const mobileUrl = targetUrl.replace("www.vvic.com", "m.vvic.com");

    const browser = await getBrowser();
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      locale: "ko-KR",
      viewport: { width: 1280, height: 720 },
    });

    const page = await ctx.newPage();

    const tryOnce = async (u) => {
      await page.goto(u, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1200);
      await autoScroll(page, 6);

      const domUrls = await page.evaluate(() => {
        const out = [];
        const push = (v) => {
          if (!v) return;
          out.push(String(v));
        };

        document.querySelectorAll("img").forEach((img) => {
          push(img.getAttribute("src"));
          push(img.getAttribute("data-src"));
          push(img.getAttribute("data-original"));
          push(img.getAttribute("data-lazy"));
        });

        const all = document.querySelectorAll("*");
        all.forEach((el) => {
          const st = window.getComputedStyle(el);
          const bg = st && st.backgroundImage;
          if (bg && bg.includes("url(")) push(bg);
        });

        const extracted = [];
        for (const v of out) {
          const s = String(v);
          if (s.includes("url(")) {
            const m = s.match(/url\(["']?([^"')]+)["']?\)/i);
            if (m && m[1]) extracted.push(m[1]);
          } else {
            extracted.push(s);
          }
        }
        return extracted;
      });

      const html = await page.content();

      // ✅ 여기 정규식이 기존 배포에서 SyntaxError가 났던 부분.
      // RegExp 생성자로 바꿔서 Node 버전/이스케이프 영향 제거.
      const re = new RegExp(
        "(https?:\\/\\/img\\d*\\.vvic\\.com\\/[^\"'\\s>]+|\\/\\/img\\d*\\.vvic\\.com\\/[^\"'\\s>]+)",
        "gi"
      );

      const found = [];
      let m;
      while ((m = re.exec(html)) !== null) found.push(m[1]);

      const allUrls = uniq([...domUrls, ...found]).map(norm).map(stripQuery);
      return uniq(pickLikelyImages(allUrls));
    };

    let imgs = await tryOnce(mobileUrl);
    let usedUrl = mobileUrl;

    if (!imgs.length) {
      imgs = await tryOnce(targetUrl);
      usedUrl = targetUrl;
    }

    await page.close().catch(() => {});
    await ctx.close().catch(() => {});

    const MAIN_LIMIT = 12;
    const main = imgs.slice(0, MAIN_LIMIT).map((url) => ({ type: "image", url }));
    const detail = imgs.slice(MAIN_LIMIT).map((url) => ({ type: "image", url }));

    res.setHeader("Cache-Control", "no-store");
    return res.json({
      ok: true,
      url: usedUrl,
      main_media: main,
      detail_media: detail,
      main_images: main.map((x) => x.url),
      detail_images: detail.map((x) => x.url),
      counts: { total: imgs.length, main: main.length, detail: detail.length },
      ms: Date.now() - started,
    });
  } catch (e) {
    console.error("VVIC extract error:", e);
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
    });
  }
});

// ------------------------------------------------------
// Static + fallback
// ------------------------------------------------------
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  if (req.path && req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "api_not_found" });
  }
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
