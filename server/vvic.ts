import express from "express";
import { chromium } from "playwright";

const router = express.Router();

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return "https:" + u;
  return u;
}

function stripQuery(u: string) {
  return u.split("?")[0];
}

// 1729523603988_379697.jpg  / 1729523603988_379697_400x400.jpg -> same key
function baseKey(u: string) {
  const clean = stripQuery(u);
  // remove _{W}x{H} right before extension
  return clean.replace(/_\d+x\d+(?=\.(jpg|jpeg|png|webp)$)/i, "");
}

function extractUploadImagesFromHtml(html: string) {
  const urls: string[] = [];

  const re = /https?:\/\/img\d+\.vvic\.com\/upload\/[^"' <>\n\r\t]+/g;
  const re2 = /\/\/img\d+\.vvic\.com\/upload\/[^"' <>\n\r\t]+/g;

  const m1 = html.match(re) || [];
  const m2 = (html.match(re2) || []).map(normalizeUrl);

  urls.push(...m1, ...m2);

  const attrRe = /(src|data-src|data-original|data-lazy)\s*=\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(html))) {
    const v = normalizeUrl(m[2]);
    if (v.includes(".vvic.com/upload/")) urls.push(v);
  }

  // keep appearance order, but de-dupe exact urls
  const ordered = [];
  const seen = new Set<string>();
  for (const u of urls) {
    const c = stripQuery(u);
    if (!c) continue;
    if (seen.has(c)) continue;
    seen.add(c);
    ordered.push(c);
  }
  return ordered;
}

function splitMainDetail(all: string[], mainLimit = 8) {
  // Prefer "base/original" over "_400x400" etc when both exist
  const bestByKey = new Map<string, string>();
  const orderByKey: string[] = [];

  for (const u of all) {
    const key = baseKey(u);
    if (!bestByKey.has(key)) {
      bestByKey.set(key, u);
      orderByKey.push(key);
      continue;
    }
    const cur = bestByKey.get(key)!;

    // choose the one WITHOUT _WxH suffix as better
    const curIsSized = /_\d+x\d+\.(jpg|jpeg|png|webp)$/i.test(cur);
    const uIsSized = /_\d+x\d+\.(jpg|jpeg|png|webp)$/i.test(u);
    if (curIsSized && !uIsSized) bestByKey.set(key, u);
  }

  const merged = orderByKey.map((k) => bestByKey.get(k)!).filter(Boolean);

  const main_images = merged.slice(0, mainLimit);
  const detail_images = merged.slice(mainLimit);

  return { main_images, detail_images };
}

router.get("/extract", async (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ ok: false, error: "url_required" });

  let browser: any;
  const debug: any = { final_url: "", status: 0 };

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    });

    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    debug.status = resp?.status() || 0;

    await page.waitForTimeout(1200);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 1800);
      await page.waitForTimeout(600);
    }

    debug.final_url = page.url();

    const html = await page.content();
    const all = extractUploadImagesFromHtml(html);

    // 예전 UI처럼 "대표/상세"를 나눠서 내려줌
    const { main_images, detail_images } = splitMainDetail(all, 8);

    return res.json({
      ok: true,
      url,
      main_images,
      detail_images,
      counts: {
        total: main_images.length + detail_images.length,
        main: main_images.length,
        detail: detail_images.length,
      },
      debug,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e?.message || String(e),
      debug,
    });
  } finally {
    try {
      await browser?.close();
    } catch {}
  }
});

export default router;
