// server_vvic_playwright.js
// ✅ VVIC 전용(1688/기타 건드리지 않음)
// - /api/vvic/extract : Playwright로 JS 렌더링 후 이미지 추출
// - /api/vvic/_debug  : 서버/Playwright 상태 확인
// - /api/* 는 SPA fallback으로 보내지 않음(HTML 대신 JSON 404)

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
  // 너무 작은 아이콘/버튼 후보(필요하면 더 추가 가능)
  return urls.filter((u) => {
    const x = String(u);
    if (!isVvicImage(x)) return false;
    // 작은 UI 아이콘류 자주 포함되는 패턴
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
    // playwright / playwright-core 둘 중 하나 설치되어 있을 수 있음
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
    where: "server_vvic_playwright.js",
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

    // ✅ 모바일 페이지도 같이 시도(렌더링이 더 단순한 경우가 있음)
    const mobileUrl = targetUrl.replace("www.vvic.com", "m.vvic.com");

    const browser = await getBrowser();
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      locale: "ko-KR",
      viewport: { width: 1280, height: 720 },
    });

    const page = await ctx.newPage();

    // 1) 먼저 모바일 JS 렌더링 시도 → 실패/0개면 PC도 시도
    const tryOnce = async (u) => {
      await page.goto(u, { waitUntil: "domcontentloaded", timeout: 60000 });
      // 일부 페이지는 로딩이 길어서 networkidle이 불안정할 수 있음
      await page.waitForTimeout(1200);
      await autoScroll(page, 6);

      // DOM의 img src/data-src
      const domUrls = await page.evaluate(() => {
        const out = [];
        const push = (v) => {
          if (!v) return;
          out.push(String(v));
        };

        // img 태그
        document.querySelectorAll("img").forEach((img) => {
          push(img.getAttribute("src"));
          push(img.getAttribute("data-src"));
          push(img.getAttribute("data-original"));
          push(img.getAttribute("data-lazy"));
        });

        // background-image
        const all = document.querySelectorAll("*");
        all.forEach((el) => {
          const st = window.getComputedStyle(el);
          const bg = st && st.backgroundImage;
          if (bg && bg.includes("url(")) push(bg);
        });

        // style url(...) 문자열에서 추출
        const extracted = [];
        for (const v of out) {
          const s = String(v);
          if (s.includes("url(")) {
            const m = s.match(/url\\(["']?([^"')]+)["']?\\)/i);
            if (m && m[1]) extracted.push(m[1]);
          } else {
            extracted.push(s);
          }
        }
        return extracted;
      });

      // page HTML script 안에서 img*.vvic.com 찾기(SSR/초기 state가 박히는 케이스)
      const html = await page.content();
      const re = /(https?:\/\/img\\d*\\.vvic\\.com\\/[^"'\\s>]+|\\/\\/img\\d*\\.vvic\\.com\\/[^"'\\s>]+)/gi;
      const found = [];
      let m;
      while ((m = re.exec(html)) !== null) found.push(m[1]);

      const allUrls = uniq([...domUrls, ...found]).map(norm).map(stripQuery);
      const filtered = uniq(pickLikelyImages(allUrls));
      return filtered;
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
// Static + fallback (기존 유지)
// ------------------------------------------------------
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  // ✅ API는 SPA fallback으로 보내지 않기
  if (req.path && req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "api_not_found" });
  }
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
