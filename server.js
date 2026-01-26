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

// ✅ /api/me 는 무조건 JSON으로 (프론트 크래시 방지)
app.get("/api/me", (req, res) => {
  return res.status(200).json({ ok: false, error: "not_logged_in" });
});

// ==================================================================
// 💾 1688 데이터 임시 저장
// ==================================================================
let latestProductData = null;

// ==================================================================
// 🖼️ 이미지 우회(Proxy) API (1688 전용)
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
    console.error("이미지 프록시 에러:", e?.message || e);
    res.status(500).send("Error");
  }
});

// ==================================================================
// 🟣 1688 데이터 수신 (POST) - 확장프로그램/클라이언트용
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
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// ==================================================================
// 🆕 1688 데이터 조회 (GET)
// ==================================================================
app.get("/api/1688/latest", (req, res) => {
  if (!latestProductData) return res.json({ ok: false, message: "데이터 없음" });
  res.json({ ok: true, ...latestProductData });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ==================================================================
// 🟡 VVIC (VVIC만) - Playwright 렌더링 기반
//   - 브라우저가 설치 안된 Render 환경에서는 에러로 떨어집니다.
//   - 브라우저 설치는 package.json의 postinstall/build 단계에서 해결합니다.
// ==================================================================
let _pw = null;
let _browser = null;

async function getPwChromium() {
  if (!_pw) {
    try {
      _pw = await import("playwright");
    } catch {
      _pw = await import("playwright-core");
    }
  }
  const chromium = _pw.chromium || (_pw.default && _pw.default.chromium);
  if (!chromium) throw new Error("playwright chromium not found");
  return chromium;
}

async function getBrowser() {
  if (_browser) return _browser;
  const chromium = await getPwChromium();
  _browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  return _browser;
}

function uniq(arr) {
  return Array.from(new Set((arr || []).map((x) => String(x || "").trim()).filter(Boolean)));
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
function pickVvicImages(urls) {
  return (urls || []).filter((u) => /https?:\/\/img\d*\.vvic\.com\//i.test(u));
}

async function autoScroll(page, steps = 6) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.max(800, window.innerHeight)));
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

app.get("/api/vvic/_debug", async (req, res) => {
  try {
    await getBrowser();
    res.setHeader("Cache-Control", "no-store");
    return res.json({ ok: true, playwright: true, ts: Date.now() });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      ok: false,
      playwright: false,
      error: String(e?.message || e),
      hint: "Render에서는 build/postinstall 단계에서 `npx playwright install chromium` 실행이 필요합니다.",
      ts: Date.now(),
    });
  }
});

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
        const push = (v) => v && out.push(String(v));

        document.querySelectorAll("img").forEach((img) => {
          push(img.getAttribute("src"));
          push(img.getAttribute("data-src"));
          push(img.getAttribute("data-original"));
          push(img.getAttribute("data-lazy"));
        });

        document.querySelectorAll("*").forEach((el) => {
          const st = window.getComputedStyle(el);
          const bg = st && st.backgroundImage;
          if (bg && bg.includes("url(")) out.push(bg);
        });

        const extracted = [];
        for (const v of out) {
          const s = String(v);
          if (s.includes("url(")) {
            const m = s.match(/url\(["']?([^"')]+)["']?\)/i);
            if (m && m[1]) extracted.push(m[1]);
          } else extracted.push(s);
        }
        return extracted;
      });

      const html = await page.content();

      // ✅ 정규식 리터럴 대신 RegExp 생성자 사용(배포 환경 이슈 방지)
      const re = new RegExp(
        "(https?:\\/\\/img\\d*\\.vvic\\.com\\/[^\\"'\\s>]+|\\/\\/img\\d*\\.vvic\\.com\\/[^\\"'\\s>]+)",
        "gi"
      );
      const found = [];
      let m;
      while ((m = re.exec(html)) !== null) found.push(m[1]);

      const all = uniq([...domUrls, ...found]).map(norm).map(stripQuery);
      return uniq(pickVvicImages(all));
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
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
    });
  }
});

// ==================================================================
// Static + fallback (중요: /api/* 는 절대 index.html로 보내지 않기)
// ==================================================================
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));

app.get("*", (req, res) => {
  if (req.path && req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "api_not_found" });
  }
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
