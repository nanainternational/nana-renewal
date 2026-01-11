import type { Request, Response } from "express";
import express from "express";
import { chromium } from "playwright";

// Render/서버 환경에서 Playwright 브라우저 경로가 ~/.cache 로 잡혀 실행 파일이 없다고 뜨는 문제를 피하기 위해
// PLAYWRIGHT_BROWSERS_PATH=0(프로젝트 내부 경로)로 강제합니다. (환경변수로 이미 설정되어 있으면 그대로 사용)
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "0";

function normalizeUrl(u: string): string {
  if (!u) return "";
  u = String(u).trim().replace("\\/\\/", "//").replace("\\/", "/");
  if (u.startsWith("//")) return "https:" + u;
  return u;
}

function stripQuery(u: string): string {
  try {
    const url = new URL(u);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return u;
  }
}

function stripTransformQuery(u: string): string {
  try {
    const url = new URL(u);
    const q = (url.search || "").toLowerCase();
    if (q.includes("x-oss-process") || q.includes("image/resize") || q.includes("format=webp")) {
      url.search = "";
      url.hash = "";
      return url.toString();
    }
    return u;
  } catch {
    return u;
  }
}

function canonicalKey(u: string): string {
  u = normalizeUrl(u);
  u = stripQuery(u);
  return (u || "").toLowerCase();
}

function isPlaceholder(u: string): boolean {
  if (!u) return true;
  return u.includes("/img/none") || u.endsWith("none.png") || u.includes("none.");
}

function looksLikeUiAsset(u: string): boolean {
  u = (u || "").toLowerCase();
  if (u.includes("src.vvic.com/statics")) return true;
  if (u.includes("/statics/") || u.includes("/css/")) return true;
  if (u.includes("/vvic-common/")) return true;
  if (u.includes("main.vvic.com/img/") || u.includes("main-global.vvic.com/img/")) return true;
  if (u.includes("/img/") && !u.includes("/upload/") && !u.includes("/prod/")) return true;

  const badKw = [
    "login","online","contact","global-pay","download","main-download",
    "kakao","wechat","whatsapp","line-code","zalo","facebook","instagram",
    "youtube","vk","zoom","zoomout","close","collect","switch","shield",
    "qrcode","qr","lang","currency","personal","earth","none",
    "footer","mini","phonecode","bg-","first-order",
  ];
  return badKw.some(k => u.includes(k));
}

function uniqKeepOrder(urls: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function pathExt(u: string): string {
  try {
    const url = new URL(u);
    const p = (url.pathname || "").toLowerCase();
    const i = p.lastIndexOf(".");
    if (i < 0) return "";
    return p.slice(i + 1);
  } catch {
    const p = (u || "").toLowerCase();
    const i = p.lastIndexOf(".");
    if (i < 0) return "";
    return p.slice(i + 1);
  }
}

function isVideoUrl(u: string): boolean {
  const ext = pathExt(u || "");
  return ["mp4", "webm", "m3u8", "mov"].includes(ext);
}

function isProductImage(u: string): boolean {
  const u2 = (u || "").toLowerCase();
  if (isVideoUrl(u2)) return false;
  return u2.includes("/upload/") || u2.includes("/prod/");
}

function pickClean(u: string): string {
  u = normalizeUrl(u);
  if (!u) return "";
  u = stripTransformQuery(u);
  if (!u || isPlaceholder(u) || looksLikeUiAsset(u)) return "";
  return u;
}

async function fetchDomMediaByPlaywright(url: string): Promise<{ html: string; anyUrls: string[] }> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "ko-KR",
  });

  await page.setExtraHTTPHeaders({
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    Referer: "https://www.vvic.com/",
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  try {
    await page.waitForLoadState("networkidle", { timeout: 20_000 });
  } catch {}

  for (let i = 0; i < 18; i++) {
    try {
      await page.evaluate(() => {
        const se =
          document.scrollingElement || document.documentElement || (document.body as any);
        if (se) (se as any).scrollTop = (se as any).scrollHeight;

        const nodes = Array.from(document.querySelectorAll("*"));
        for (const el of nodes) {
          try {
            const st = window.getComputedStyle(el);
            if (!st) continue;
            const oy = st.overflowY;
            if (oy !== "auto" && oy !== "scroll") continue;
            if ((el as any).scrollHeight > (el as any).clientHeight + 200) {
              (el as any).scrollTop = (el as any).scrollHeight;
            }
          } catch {}
        }
      });
    } catch {}
    await page.waitForTimeout(500);
  }

  let anyUrls: string[] = [];
  try {
    anyUrls = await page.evaluate(() => {
      const out: string[] = [];
      const push = (u: any) => {
        if (u && typeof u === "string") out.push(u);
      };
      document.querySelectorAll("img").forEach((img) => {
        push(img.getAttribute("data-src"));
        push(img.getAttribute("src"));
        push(img.getAttribute("rel"));
      });
      document.querySelectorAll("img.jqzoom").forEach((img) => push(img.getAttribute("rel")));
      document.querySelectorAll("video").forEach((v) => {
        push(v.getAttribute("src"));
        v.querySelectorAll("source").forEach((s) => push(s.getAttribute("src")));
      });
      return out;
    });
  } catch {
    anyUrls = [];
  }

  const html = await page.content();
  await browser.close();
  return { html, anyUrls };
}

function parseFromHtmlDom(html: string): { mainImages: string[]; detailImages: string[] } {
  const mainImages: string[] = [];
  const detailImages: string[] = [];

  const imgTagRe = /<img\b[^>]*>/gi;
  const relRe = /\brel\s*=\s*["']([^"']+)["']/i;
  const srcRe = /\bsrc\s*=\s*["']([^"']+)["']/i;
  const dsrcRe = /\bdata-src\s*=\s*["']([^"']+)["']/i;
  const jqzoomHintRe = /\bclass\s*=\s*["'][^"']*jqzoom[^"']*["']/i;

  const tags = html.match(imgTagRe) || [];
  for (const tag of tags) {
    const rel = pickClean((relRe.exec(tag)?.[1] || "").trim());
    const src = pickClean((srcRe.exec(tag)?.[1] || "").trim());
    const ds = pickClean((dsrcRe.exec(tag)?.[1] || "").trim());

    const isJq = jqzoomHintRe.test(tag);

    if (isJq) {
      if (rel && isProductImage(rel)) mainImages.push(rel);
      if (src && isProductImage(src)) mainImages.push(src);
    }

    if (ds && isProductImage(ds)) detailImages.push(ds);
    else if (src && isProductImage(src)) {
      detailImages.push(src);
      if (!tag.includes("data-src")) mainImages.push(src);
    }
  }

  return { mainImages: uniqKeepOrder(mainImages), detailImages: uniqKeepOrder(detailImages) };
}

async function apiExtract(req: Request, res: Response) {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ ok: false, error: "url is required" });

  try {
    const { html, anyUrls } = await fetchDomMediaByPlaywright(url);

    const { mainImages: mainFromHtml, detailImages: detailFromHtml } = parseFromHtmlDom(html);

    const domAny = (anyUrls || []).map((u) => normalizeUrl(u)).filter(Boolean);

    const domVideoUrls = uniqKeepOrder(
      domAny
        .map((u) => stripQuery(u))
        .filter((u) => u && isVideoUrl(u) && !looksLikeUiAsset(u))
    );

    const domImageUrls = uniqKeepOrder(
      domAny
        .map((u) => pickClean(u))
        .filter((u) => u && isProductImage(u))
    );

    let mainImages = uniqKeepOrder([...mainFromHtml]);
    let detailImages = uniqKeepOrder([...detailFromHtml]);

    const detailSet = new Set(detailImages);
    for (const u of domImageUrls) {
      if (!detailSet.has(u)) {
        detailImages.push(u);
        detailSet.add(u);
      }
    }

    if (mainImages.length < 3 && detailImages.length) {
      const mainSet = new Set(mainImages);
      for (const u of detailImages.slice(0, 30)) {
        if (!mainSet.has(u)) {
          mainImages.push(u);
          mainSet.add(u);
        }
      }
    }

    mainImages = uniqKeepOrder(
      mainImages.filter((u) => isProductImage(u) && !looksLikeUiAsset(u) && !isPlaceholder(u))
    );
    detailImages = uniqKeepOrder(
      detailImages.filter((u) => isProductImage(u) && !looksLikeUiAsset(u) && !isPlaceholder(u))
    );

    const mainKeys = new Set(mainImages.map((u) => canonicalKey(u)));
    detailImages = uniqKeepOrder(detailImages.filter((u) => !mainKeys.has(canonicalKey(u))));

    const mainMedia = mainImages.map((u) => ({ type: "image", url: u }));
    const detailMedia = [
      ...detailImages.map((u) => ({ type: "image", url: u })),
      ...domVideoUrls.map((u) => ({ type: "video", url: u })),
    ];

    return res.json({
      ok: true,
      main_images: mainImages,
      detail_images: detailImages,
      detail_videos: domVideoUrls,
      main_media: mainMedia,
      detail_media: detailMedia,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

async function apiStitch(req: Request, res: Response) {
  const urls: string[] = Array.isArray(req.body?.urls) ? req.body.urls : [];
  if (!urls.length) return res.status(400).json({ ok: false, error: "urls(list) is required" });

  return res.status(501).json({
    ok: false,
    error:
      "stitch는 서버에 이미지 합성 라이브러리(sharp/canvas)가 필요합니다. 먼저 extract까지 붙이고, stitch는 sharp 기반으로 다음 단계에서 구현하겠습니다.",
  });
}

export const vvicRouter = express.Router();
vvicRouter.get("/extract", apiExtract);
vvicRouter.post("/stitch", express.json({ limit: "5mb" }), apiStitch);
