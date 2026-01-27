import express from "express";
import { chromium } from "playwright";

const router = express.Router();

const DEFAULT_TIMEOUT = 45_000;

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function toAbs(u) {
  if (!u) return "";
  if (u.startsWith("//")) return "https:" + u;
  return u;
}

function isRealVvicImage(u) {
  if (!u) return false;
  const url = toAbs(u);
  if (!/^https?:\/\//i.test(url)) return false;
  if (/src\.vvic\.com\/statics/i.test(url)) return false;
  if (/\/statics\//i.test(url)) return false;
  if (/logo/i.test(url)) return false;
  return /https?:\/\/img\d*\.vvic\.com\/upload\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url);
}

function normalizeInputUrl(inputUrl) {
  const s = String(inputUrl || "").trim();
  return s;
}

function extractItemId(inputUrl) {
  try {
    const u = new URL(inputUrl);
    const m = u.pathname.match(/^\/item\/([^/]+)$/);
    return m?.[1] || "";
  } catch {
    const m = String(inputUrl).match(/\/item\/([^/?#]+)/);
    return m?.[1] || "";
  }
}

// GET /api/vvic/extract?url=...
router.get("/extract", async (req, res) => {
  let browser;
  try {
    const rawUrl = String(req.query.url || "").trim();
    if (!rawUrl) return res.status(400).json({ ok: false, error: "url_required" });

    const url = normalizeInputUrl(rawUrl);
    const itemId = extractItemId(url);

    // 후보 URL (www/m 둘 다 시도)
    const candidates = uniq([
      url,
      itemId ? `https://www.vvic.com/item/${itemId}` : "",
      itemId ? `https://m.vvic.com/item/${itemId}` : "",
    ]);

    const hit = {
      final_url: "",
      tried: candidates,
      blocked: false,
      reason: "",
    };

    // 이미지 수집 버킷
    const all = new Set();

    // 공통: 네트워크에서 upload 이미지 잡기
    const captureFromText = (text) => {
      if (!text) return;
      const re =
        /https?:\/\/img\d*\.vvic\.com\/upload\/[^"'\\\s>]+?\.(?:jpg|jpeg|png|webp)(\?[^"'\\\s>]*)?/gi;
      const m = text.match(re) || [];
      for (const u of m) {
        const abs = toAbs(u);
        if (isRealVvicImage(abs)) all.add(abs);
      }
    };

    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await browser.newContext({
      locale: "ko-KR",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
    });

    const page = await context.newPage();

    // response 감시: JSON/HTML 안에 이미지 URL 있으면 수집
    page.on("response", async (resp) => {
      try {
        const ct = (resp.headers()?.["content-type"] || "").toLowerCase();
        const rurl = resp.url();
        // 응답 URL 자체가 이미지면
        if (isRealVvicImage(rurl)) all.add(rurl);

        // JSON/HTML/text만 가볍게 스캔
        if (ct.includes("application/json") || ct.includes("text/plain") || ct.includes("text/html")) {
          const txt = await resp.text();
          captureFromText(txt);
        }
      } catch {
        // ignore
      }
    });

    // 실제로 페이지 진입 시도
    let navigated = false;
    for (const candidate of candidates) {
      try {
        await page.goto(candidate, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT });
        hit.final_url = page.url();
        // JS 로딩 기다리기
        await page.waitForLoadState("networkidle", { timeout: DEFAULT_TIMEOUT }).catch(() => {});
        navigated = true;
        break;
      } catch {
        // 다음 후보
      }
    }

    if (!navigated) {
      return res.status(502).json({ ok: false, error: "navigation_failed", tried: candidates });
    }

    // 차단/프로모션/로그인 페이지 감지
    const finalUrl = page.url();
    hit.final_url = finalUrl;
    if (/\/promotion\b/i.test(finalUrl) || /\/login\b/i.test(finalUrl) || /captcha|verify/i.test(finalUrl)) {
      hit.blocked = true;
      hit.reason = "blocked_or_redirected";
    }

    // DOM에서 <img> 수집
    const domImgs = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      const pick = (el) =>
        el.getAttribute("data-src") ||
        el.getAttribute("data-original") ||
        el.getAttribute("data-lazy") ||
        el.getAttribute("src") ||
        "";
      return imgs.map(pick).filter(Boolean);
    });

    for (const u of domImgs.map(toAbs)) {
      if (isRealVvicImage(u)) all.add(u);
    }

    // HTML에서도 한번 더 스캔
    const html = await page.content().catch(() => "");
    captureFromText(html);

    const allList = uniq([...all]).filter(isRealVvicImage);

    // 대표/상세 분리: 앞 10개 대표, 나머지 상세
    const main_images = allList.slice(0, 10);
    const detail_images = allList.slice(10);

    if (main_images.length + detail_images.length === 0) {
      // 프론트가 "완료"로 오인하지 않게 ok:false
      return res.status(200).json({
        ok: false,
        error: hit.blocked ? hit.reason : "no_images_found",
        url,
        debug: {
          final_url: hit.final_url,
          tried: hit.tried,
          blocked: hit.blocked,
          reason: hit.reason,
        },
      });
    }

    return res.status(200).json({
      ok: true,
      url,
      main_images,
      detail_images,
      total: main_images.length + detail_images.length,
      meta: {
        final_url: hit.final_url,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    try { await browser?.close(); } catch {}
  }
});

export default router;
