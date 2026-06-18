import type { Request, Response } from "express";
import express from "express";
import Jimp from "jimp";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { cleanupExpiredAiResults, ensureInitialWallet, getWalletBalance, getCachedAiResult, chargeUsage, chargeAndSaveAiResult } from "./credits";

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


function getUserIdFromRequest(req: Request): string {
  const token =
    (req as any)?.cookies?.token ||
    String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();

  if (!token) return "";

  const secret = process.env.SESSION_SECRET || "your-secret-key-change-this";
  try {
    const payload: any = jwt.verify(token, secret);
    return payload?.cid || payload?.uid || "";
  } catch {
    return "";
  }
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function isPlaceholder(u: string): boolean {
  if (!u) return true;
  return u.includes("/img/none") || u.endsWith("none.png") || u.includes("none.");
}

function looksLikeUiAsset(u: string): boolean {
  u = (u || "").toLowerCase();
  if (u.includes("src.vvic.com/statics")) return true;
  if (u.includes("/statics/") || u.includes("/static/") || u.includes("/css/")) return true;
  if (u.includes("/vvic-common/")) return true;
  if (u.includes("main.vvic.com/img/") || u.includes("main-global.vvic.com/img/")) return true;
  if (u.includes("/img/") && !u.includes("/upload/") && !u.includes("/uploads/") && !u.includes("/prod/") && !u.includes("/goods/")) return true;

  const badKw = [
    "login","online","contact","global-pay","download","main-download",
    "kakao","wechat","whatsapp","line-code","zalo","facebook","instagram",
    "youtube","vk","zoom","zoomout","close","collect","switch","shield",
    "qrcode","qr","lang","currency","personal","earth","none",
    "footer","mini","phonecode","bg-","first-order","sprite","logo",
    "success","error","warning","warn","check","arrow","loading","loader",
    "blank","empty","captcha","verify","safe","notice","guide",
  ];
  return badKw.some(k => u.includes(k));
}

function extractMediaUrlsFromText(text: string): string[] {
  const out: string[] = [];
  const re = /(?:https?:)?\\?\/\\?\/[^"'\s<>\\]+?\.(?:jpg|jpeg|png|webp|gif|avif|mp4|webm|m3u8|mov)(?:\?[^"'\s<>]*)?/gi;
  for (const match of text.matchAll(re)) {
    out.push(match[0].replace(/\\\//g, "/"));
  }
  return out;
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

function looksLikeImageUrl(u: string): boolean {
  const ext = pathExt(u || "");
  return ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext);
}

function isProductImage(u: string): boolean {
  const u2 = (u || "").toLowerCase();
  if (isVideoUrl(u2) || isPlaceholder(u2) || looksLikeUiAsset(u2)) return false;
  if (u2.includes("/upload/") || u2.includes("/prod/")) return true;

  try {
    const host = new URL(normalizeUrl(u2)).hostname;
    const knownProductImageHost =
      host.endsWith("alicdn.com") ||
      host.endsWith("aliimg.com") ||
      host.endsWith("vvic.com") ||
      host.endsWith("vvic.net");
    return knownProductImageHost && looksLikeImageUrl(u2);
  } catch {
    return looksLikeImageUrl(u2);
  }
}

function pickClean(u: string): string {
  u = normalizeUrl(u);
  if (!u) return "";
  u = stripTransformQuery(u);
  if (!u || isPlaceholder(u) || looksLikeUiAsset(u)) return "";
  return u;
}

async function fetchDomMediaByPlaywright(url: string): Promise<{ html: string; anyUrls: string[]; mainUrls: string[]; detailUrls: string[]; fallbackDetailUrls: string[] }> {
  const { chromium } = await import("playwright");
  const networkUrls = new Set<string>();
  const responseBodyTasks: Promise<void>[] = [];
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

  page.on("request", (request) => {
    const resourceType = request.resourceType();
    if (["image", "media", "xhr", "fetch"].includes(resourceType)) {
      networkUrls.add(request.url());
    }
  });
  page.on("response", (response) => {
    const ct = (response.headers()["content-type"] || "").toLowerCase();
    if (ct.includes("image") || ct.includes("video") || ct.includes("json")) {
      networkUrls.add(response.url());
    }
    const contentLength = Number(response.headers()["content-length"] || "0");
    const shouldReadBody =
      (ct.includes("json") || ct.includes("text") || ct.includes("javascript")) &&
      (!contentLength || contentLength <= 2_000_000);
    if (shouldReadBody) {
      responseBodyTasks.push(
        response
          .text()
          .then((body) => {
            for (const mediaUrl of extractMediaUrlsFromText(body.slice(0, 2_000_000))) {
              networkUrls.add(mediaUrl);
            }
          })
          .catch(() => {})
      );
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  try {
    await page.waitForLoadState("networkidle", { timeout: 20_000 });
  } catch {}
  try {
    await page.waitForSelector(".item-detail-product-desc, #info, .detail-desc, .tb-pic-main, .tb-booth, img.jqzoom", { timeout: 15_000 });
  } catch {}
  try {
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll<HTMLElement>(".tabs *, [role='tab'], a, button"))
        .find((el) => /商品详情|상품\s*상세|상세/.test((el.textContent || "").trim()));
      tab?.click();
    });
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

  let scopedUrls: { all: string[]; main: string[]; detail: string[]; fallbackDetail: string[] } = {
    all: [],
    main: [],
    detail: [],
    fallbackDetail: [],
  };
  try {
    scopedUrls = await page.evaluate(() => {
      const all: string[] = [];
      const main: string[] = [];
      const detail: string[] = [];
      const fallbackDetail: string[] = [];
      const pushTo = (target: string[], u: any) => {
        if (u && typeof u === "string") target.push(u);
      };
      const pushAll = (u: any) => pushTo(all, u);
      const pushSrcsetTo = (target: string[], srcset: string | null) => {
        if (!srcset) return;
        srcset.split(",").forEach((part) => pushTo(target, part.trim().split(/\s+/)[0]));
      };
      const collectImageNode = (img: HTMLImageElement, target: string[]) => {
        pushTo(target, img.currentSrc);
        ["data-src", "data-original", "data-lazy", "data-url", "src", "rel"].forEach((attr) => {
          pushTo(target, img.getAttribute(attr));
        });
        pushSrcsetTo(target, img.getAttribute("srcset"));
        pushSrcsetTo(target, img.getAttribute("data-srcset"));
      };
      const collectMediaIn = (root: ParentNode, target: string[]) => {
        if (root instanceof HTMLImageElement) collectImageNode(root, target);
        if (root instanceof HTMLAnchorElement) pushTo(target, root.getAttribute("href"));
        if (root instanceof HTMLSourceElement) {
          pushTo(target, root.getAttribute("src"));
          pushSrcsetTo(target, root.getAttribute("srcset"));
        }
        if (root instanceof HTMLVideoElement) {
          pushTo(target, root.getAttribute("poster"));
          pushTo(target, root.getAttribute("src"));
        }
        root.querySelectorAll("img").forEach((img) => collectImageNode(img, target));
        root.querySelectorAll("a[href]").forEach((a) => pushTo(target, a.getAttribute("href")));
        root.querySelectorAll("source").forEach((source) => {
          pushTo(target, source.getAttribute("src"));
          pushSrcsetTo(target, source.getAttribute("srcset"));
        });
        root.querySelectorAll("video").forEach((v) => {
          pushTo(target, v.getAttribute("poster"));
          pushTo(target, v.getAttribute("src"));
        });
      };

      document.querySelectorAll("img").forEach((img) => collectImageNode(img, all));
      document.querySelectorAll("source").forEach((source) => {
        pushAll(source.getAttribute("src"));
        pushSrcsetTo(all, source.getAttribute("srcset"));
      });
      document.querySelectorAll("video").forEach((v) => {
        pushAll(v.getAttribute("poster"));
        pushAll(v.getAttribute("src"));
      });

      [
        ".detail-desc",
        ".item-detail-product-desc .detail-desc",
        "#info .detail-desc",
        ".tab-content.selected .detail-desc",
      ].forEach((selector) => {
        document.querySelectorAll(selector).forEach((root) => collectMediaIn(root, detail));
      });
      [
        ".tb-pic-main",
        ".tb-pic-main a[href]",
        ".tb-pic-main img",
        ".tb-booth",
        ".tb-booth a[href]",
        ".tb-booth img",
        ".tb-thumb img",
        ".tb-thumb a[href]",
        ".tb-pic a[href]",
        "#bigImage",
        "img.jqzoom",
      ].forEach((selector) => {
        document.querySelectorAll(selector).forEach((root) => collectMediaIn(root, main));
      });
      [
        ".item-detail-product-desc",
        ".item-detail-product-desc #info",
        ".item-detail-product-desc .tab-content.selected",
        "#info.tab-content.selected",
      ].forEach((selector) => {
        document.querySelectorAll(selector).forEach((root) => collectMediaIn(root, fallbackDetail));
      });

      performance.getEntriesByType("resource").forEach((entry) => pushAll((entry as PerformanceResourceTiming).name));
      return { all, main, detail, fallbackDetail };
    });
  } catch {
    scopedUrls = { all: [], main: [], detail: [], fallbackDetail: [] };
  }

  await Promise.race([
    Promise.allSettled(responseBodyTasks),
    page.waitForTimeout(2_500),
  ]);

  const html = await page.content();
  const anyUrls = uniqKeepOrder([...scopedUrls.all, ...extractMediaUrlsFromText(html), ...networkUrls]);

  await browser.close();
  return {
    html,
    anyUrls,
    mainUrls: uniqKeepOrder(scopedUrls.main),
    detailUrls: uniqKeepOrder(scopedUrls.detail),
    fallbackDetailUrls: uniqKeepOrder(scopedUrls.fallbackDetail),
  };
}

function parseFromHtmlDom(html: string): { mainImages: string[]; detailImages: string[] } {
  const mainImages: string[] = [];
  const detailImages: string[] = [];

  const imgTagRe = /<img\b[^>]*>/gi;
  const relRe = /\brel\s*=\s*["']([^"']+)["']/i;
  const srcRe = /\bsrc\s*=\s*["']([^"']+)["']/i;
  const jqzoomHintRe = /\bclass\s*=\s*["'][^"']*jqzoom[^"']*["']/i;

  const tags = html.match(imgTagRe) || [];
  for (const tag of tags) {
    const rel = pickClean((relRe.exec(tag)?.[1] || "").trim());
    const src = pickClean((srcRe.exec(tag)?.[1] || "").trim());

    // 정적 HTML 전체에서 이미지 URL을 전부 detail로 넣으면 VVIC 로고/체크/경고 아이콘까지 섞입니다.
    // HTML fallback은 jqzoom처럼 상품 대표 이미지 힌트가 확실한 경우만 사용합니다.
    if (jqzoomHintRe.test(tag)) {
      if (rel && isProductImage(rel)) mainImages.push(rel);
      if (src && isProductImage(src)) mainImages.push(src);
    }

    if (isJq) continue;

    // Do not treat every rendered <img> as detail media. VVIC pages include
    // recommendation/sidebar images outside the product detail area; scoped DOM
    // extraction from .detail-desc handles actual detail-page images.
    void ds;
    void src;
  }

  return { mainImages: uniqKeepOrder(mainImages), detailImages: uniqKeepOrder(detailImages) };
}

export async function apiExtract(req: Request, res: Response) {
  const url = String(req.query.url || "").trim();
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ ok: false, error: "not_logged_in" });

  // 신규 유저 1회 크레딧 지급
  try {
    await ensureInitialWallet(userId, 10000);
  } catch {}

  // URL 불러오기(=VVIC extract) 비용: 10원(=1 credit)
  const URL_COST = 10;
  try {
    const bal = await getWalletBalance(userId);
    if (typeof bal === "number" && bal < URL_COST) {
      return res.status(402).json({ ok: false, error: "insufficient_credit", balance: bal });
    }
  } catch {}

  const requestKey = sha256([userId, url, "vvic_extract"].join("|"));
  if (!url) return res.status(400).json({ ok: false, error: "url is required" });

  try {
    const { html, anyUrls, mainUrls, detailUrls, fallbackDetailUrls } = await fetchDomMediaByPlaywright(url);

    const { mainImages: mainFromHtml, detailImages: detailFromHtml } = parseFromHtmlDom(html);

    const domAny = (anyUrls || []).map((u) => normalizeUrl(u)).filter(Boolean);

    const domVideoUrls = uniqKeepOrder(
      domAny
        .map((u) => stripQuery(u))
        .filter((u) => u && isVideoUrl(u) && !looksLikeUiAsset(u))
    );

    let mainImages = uniqKeepOrder([
      ...mainUrls.map((u) => pickClean(u)).filter((u) => u && isProductImage(u)),
      ...mainFromHtml,
    ]);
    let detailImages = uniqKeepOrder([
      ...detailUrls.map((u) => pickClean(u)).filter((u) => u && isProductImage(u)),
      ...detailFromHtml,
    ]);

    if (!detailImages.length) {
      detailImages = uniqKeepOrder(
        fallbackDetailUrls.map((u) => pickClean(u)).filter((u) => u && isProductImage(u))
      );
    }

    mainImages = uniqKeepOrder(
      mainImages.filter((u) => isProductImage(u) && !looksLikeUiAsset(u) && !isPlaceholder(u))
    );
    detailImages = uniqKeepOrder(
      detailImages.filter((u) => isProductImage(u) && !looksLikeUiAsset(u) && !isPlaceholder(u))
    );

    // 마지막 안전장치: DOM selector가 바뀌어도 전체 네트워크/DOM에서 상품 경로가 확실한 이미지만 보조 사용합니다.
    const anyProductImages = uniqKeepOrder(
      domAny.map((u) => pickClean(u)).filter((u) => u && isProductImage(u) && !looksLikeUiAsset(u) && !isPlaceholder(u))
    );
    if (!mainImages.length && anyProductImages.length) {
      mainImages = anyProductImages.slice(0, 12);
    }
    if (!detailImages.length && anyProductImages.length) {
      const tmpMainKeys = new Set(mainImages.map((u) => canonicalKey(u)));
      detailImages = anyProductImages.filter((u) => !tmpMainKeys.has(canonicalKey(u))).slice(0, 120);
    }

    const mainKeys = new Set(mainImages.map((u) => canonicalKey(u)));
    detailImages = uniqKeepOrder(detailImages.filter((u) => !mainKeys.has(canonicalKey(u))));

    if (!mainImages.length && !detailImages.length && !domVideoUrls.length) {
      return res.status(422).json({
        ok: false,
        error: "VVIC 상품 이미지를 찾지 못했습니다. 서버 브라우저가 로그인/보안검증/빈 SPA 화면만 받은 가능성이 있습니다. 상품 상세 URL이 맞는지 확인하거나, 개발자도구 Network의 상품 상세 API 응답을 확인해주세요.",
      });
    }

    const mainMedia = mainImages.map((u) => ({ type: "image", url: u }));
    const detailMedia = [
      ...detailImages.map((u) => ({ type: "image", url: u })),
      ...domVideoUrls.map((u) => ({ type: "video", url: u })),
    ];

// ✅ 추출 성공 후 차감 (실패 시 차감 없음)
const charged = await chargeUsage({
  userId,
  cost: URL_COST,
  feature: "vvic_extract",
  sourceUrl: url,
  requestKey,
});
if ((charged as any)?.insufficient) {
  return res.status(402).json({ ok: false, error: "insufficient_credit" });
}

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


export async function apiAiGenerate(req: Request, res: Response) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ ok: false, error: "not_logged_in" });

  const sourceUrl = String(req.body?.source_url || "").trim();
  const promptVersion = String(req.body?.prompt_version || "").trim() || "v1";

  if (!sourceUrl) return res.status(400).json({ ok: false, error: "source_url is required" });

  // (선택) 만료 데이터 청소
  try {
    await cleanupExpiredAiResults();
  } catch {}

  // 신규 유저 1회 크레딧 지급
  try {
    await ensureInitialWallet(userId, 10000);
  } catch {}

  // 1) 캐시 우선 반환 (0크레딧)
  try {
    const cached = await getCachedAiResult(userId, sourceUrl);
    if (cached?.ai_title || cached?.ai_editor) {
      return res.json({
        ok: true,
        cached: true,
        source_url: sourceUrl,
        product_name: cached.ai_title || "",
        editor: cached.ai_editor || "",
        model: cached.model || "",
        prompt_version: cached.prompt_version || promptVersion,
      });
    }
  } catch (e: any) {
    console.error("ai cache lookup error:", e);
  }

  // 2) 캐시가 없으면 생성: 50원(=5크레딧)
  const COST = 50;

  // ✅ 먼저 잔액 체크 (AI 호출 전에 차단)
  try {
    const bal = await getWalletBalance(userId);
    if (typeof bal === "number" && bal < COST) {
      return res.status(402).json({ ok: false, error: "insufficient_credit", balance: bal });
    }
  } catch {}

  const imageUrlsRaw = req.body?.image_urls;
  const imageUrl = String(req.body?.image_url || "").trim();
  const imageUrls = (Array.isArray(imageUrlsRaw) ? imageUrlsRaw : (imageUrl ? [imageUrl] : []))
    .map((x: any) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ ok: false, error: "OPENAI_API_KEY is not set on server env" });
  }
  if (!imageUrls.length) return res.status(400).json({ ok: false, error: "image_urls (or image_url) is required" });

  // 중복 차감 방지 키(버튼 연타/다중 탭)
  const requestKey = sha256([userId, sourceUrl, promptVersion].join("|"));

  try {
    // Responses API (server-side). Do NOT expose the API key to the browser.
    const prompt = [
      "너는 한국 이커머스 상품 상세페이지용 카피라이터다.",
      "입력된 대표이미지(상품 사진)를 보고 아래를 생성해라.",
      "",
      "출력은 반드시 JSON만. 다른 텍스트 금지.",
      "",
      "스키마:",
      "{",
      '  "product_name": "20자 내외 한국어 상품명",',
      '  "editor": "약 200자 내외 한국어 에디터(과장 금지, 자연스러운 판매 문구)",',
      '  "coupang_keywords": ["키워드1","키워드2","키워드3","키워드4","키워드5"],',
      '  "ably_keywords": ["키워드1","키워드2","키워드3","키워드4","키워드5"]',
      "}",
      "",
      "규칙:",
      "- (중요) 상품명/에디터/키워드 어디에도 색상(컬러)을 절대 언급하지 말 것",
      "  예: 블랙/화이트/아이보리/베이지/네이비/핑크/레드/그레이/블루/그린/옐로우/카키 등",
      "  영어/약어 포함 금지: black, white, ivory, beige, navy, pink, red, gray/grey, blue 등",
      "  색상·톤·명도·밝기 같은 표현도 금지",
      "- 키워드는 중복 없이 5개씩",
      "- 너무 일반적인 단어만 나열하지 말고, 소재/기능/타겟/사용상황을 섞어서",
      "- 사진에서 확실히 알 수 없는 정보는 단정하지 말고 무난하게 표현",
      sourceUrl ? ("- 참고 URL: " + sourceUrl) : "",
    ].filter(Boolean).join("\n");

    const body = {
      model: "gpt-5",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...imageUrls.map((u) => ({ type: "input_image", image_url: u })),
          ],
        },
      ],
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const j: any = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = (j && (j.error?.message || j.error || j.message)) || ("HTTP " + r.status);
      return res.status(500).json({ ok: false, error: "OpenAI error: " + msg });
    }

    // Try to extract output text
    let textOut = "";
    try {
      // Responses API returns output array with content parts.
      const out = j?.output || [];
      for (const item of out) {
        const content = item?.content || [];
        for (const c of content) {
          if (c?.type === "output_text" && typeof c.text === "string") textOut += c.text;
        }
      }
      if (!textOut && typeof j?.output_text === "string") textOut = j.output_text;
    } catch {}

    textOut = String(textOut || "").trim();
    if (!textOut) return res.status(500).json({ ok: false, error: "Empty AI response" });

    let parsed: any = null;
    try {
      parsed = JSON.parse(textOut);
    } catch {
      // If model wrapped with code fences, try to recover
      const m = textOut.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch {}
      }
    }

    if (!parsed || typeof parsed !== "object") {
      return res.status(500).json({ ok: false, error: "AI JSON parse failed", raw: textOut });
    }

    // Basic sanitize
    
const COLOR_WORDS = [
  "블랙","화이트","오프화이트","아이보리","크림","베이지","브라운","네이비","블루","스카이","그린","민트","카키","옐로우","레몬","오렌지","레드","핑크","퍼플","라벤더","와인","그레이","회색","차콜","챠콜","실버","골드","청색","흑색","백색","연청","중청","진청"
];
const COLOR_WORDS_EN = [
  "black","white","offwhite","ivory","cream","beige","brown","navy","blue","sky","green","mint","khaki","yellow","lemon","orange","red","pink","purple","lavender","wine","gray","grey","charcoal","silver","gold","denim"
];

function stripColors(s: string): string {
  let out = String(s || "");
  // Korean (case-sensitive)
  for (const w of COLOR_WORDS) out = out.split(w).join("");
  // English (case-insensitive, remove as standalone or within phrases)
  for (const w of COLOR_WORDS_EN) {
    const re = new RegExp(w, "ig");
    out = out.replace(re, "");
  }
  // Cleanup
  out = out
    .replace(/\s{2,}/g, " ")
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\s+,/g, ",")
    .replace(/,\s+/g, ", ")
    .trim();
  return out;
}

function hasColorWord(s: string): boolean {
  const t = String(s || "");
  if (!t) return false;
  const low = t.toLowerCase();
  for (const w of COLOR_WORDS) if (t.includes(w)) return true;
  for (const w of COLOR_WORDS_EN) if (low.includes(w)) return true;
  return false;
}

const normList = (arr: any) =>
      Array.isArray(arr) ? arr.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 5) : [];
    const rawCoupang = normList(parsed.coupang_keywords);
    const rawAbly = normList(parsed.ably_keywords);

    const cleanKeywords = (arr: string[]) =>
      (arr || [])
        .map((x) => stripColors(String(x || "")).trim())
        .filter((x) => x && !hasColorWord(x))
        .filter((x, i, a) => a.indexOf(x) === i)
        .slice(0, 5);

    const result = {
      product_name: stripColors(String(parsed.product_name || "")).trim(),
      editor: stripColors(String(parsed.editor || "")).trim(),
      coupang_keywords: cleanKeywords(rawCoupang),
      ably_keywords: cleanKeywords(rawAbly),
    };

// ✅ AI 성공 후에만 차감 + 저장 (원자적)
const charged = await chargeAndSaveAiResult({
  userId,
  cost: COST,
  feature: "ai_generate",
  sourceUrl,
  requestKey,
  aiTitle: String(result.product_name || ""),
  aiEditor: String(result.editor || ""),
  model: "openai",
  promptVersion,
});

if ((charged as any)?.insufficient) {
  return res.status(402).json({ ok: false, error: "insufficient_credit" });
}
if ((charged as any)?.duplicate) {
  // 중복 결제 방지에 걸린 경우: 캐시를 다시 조회해서 반환
  const cached2 = await getCachedAiResult(userId, sourceUrl);
  if (cached2?.ai_title || cached2?.ai_editor) {
    return res.json({
      ok: true,
      cached: true,
      source_url: sourceUrl,
      product_name: cached2.ai_title || "",
      editor: cached2.ai_editor || "",
      model: cached2.model || "openai",
      prompt_version: cached2.prompt_version || promptVersion,
    });
  }
  // 캐시가 없다면 그냥 성공 응답(차감은 중복으로 처리됨)
}

return res.json({ ok: true, cached: false, ...result, balance: (charged as any)?.balance ?? undefined });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

export async function apiStitch(req: Request, res: Response) {
  try {
    const body = (req.body ?? {}) as any;
    const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];
    if (!urls.length) {
      return res.status(400).json({ ok: false, error: "urls가 비었습니다." });
    }

    // ✅ Render(저메모리) 환경에서 502/재시작(OOM) 방지용 안전장치
    const MAX_IMAGES = 20;        // 너무 많이 합치면 메모리 폭발
    const MAX_WIDTH = 900;        // 원본 폭이 크면 리사이즈로 메모리 안정화
    const MAX_TOTAL_HEIGHT = 20000; // 총 높이가 과하면 합성 자체가 위험
    const TIMEOUT_MS = 15000;

    const picked = urls
      .map((u) => String(u || "").trim())
      .filter(Boolean)
      // mp4/webm 같은 영상 URL은 합성 불가이므로 제외
      .filter((u) => !/\.(mp4|webm|m3u8|mov)(\?|#|$)/i.test(u))
      .slice(0, MAX_IMAGES);

    if (!picked.length) {
      return res.status(400).json({ ok: false, error: "유효한 이미지가 없습니다." });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");

    async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        return await fetch(url, {
          signal: ctrl.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            Referer: "https://www.vvic.com/",
            Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          },
        });
      } finally {
        clearTimeout(t);
      }
    }

    // 이미지 다운로드 + 디코딩 (순차 처리로 메모리 피크 최소화)
    const imgs: Jimp[] = [];
    for (const url of picked) {
      const r = await fetchWithTimeout(url, TIMEOUT_MS);
      if (!r.ok) {
        return res
          .status(400)
          .json({ ok: false, error: `이미지 다운로드 실패: ${r.status} ${url}` });
      }

      const buf = Buffer.from(await r.arrayBuffer());

      let img: Jimp;
      try {
        img = await Jimp.read(buf);
      } catch (e: any) {
        return res.status(400).json({
          ok: false,
          error: `이미지 디코딩 실패(형식/손상 가능): ${url} :: ${e?.message || String(e)}`,
        });
      }

      if (img.bitmap.width > MAX_WIDTH) {
        img = img.resize(MAX_WIDTH, Jimp.AUTO);
      }

      imgs.push(img);
    }

    if (!imgs.length) {
      return res.status(400).json({ ok: false, error: "유효한 이미지가 없습니다." });
    }

    // 세로로 이어붙이기: 최대 폭에 맞춰 리사이즈 후 합성
    const maxW = Math.max(...imgs.map((i) => i.bitmap.width));
    const resized = imgs.map((img) => {
      if (img.bitmap.width === maxW) return img;
      return img.resize(maxW, Jimp.AUTO);
    });

    const totalH = resized.reduce((acc, img) => acc + img.bitmap.height, 0);
    if (totalH > MAX_TOTAL_HEIGHT) {
      return res.status(400).json({
        ok: false,
        error: `이미지가 너무 길어 합성할 수 없습니다. (총 높이 ${totalH}px) 선택 수를 줄이거나 이미지를 줄여주세요.`,
      });
    }

    const canvas = new Jimp(maxW, totalH, 0xffffffff);

    let y = 0;
    for (const img of resized) {
      canvas.composite(img, 0, y);
      y += img.bitmap.height;
    }

    canvas.quality(85);

    const out = await canvas.getBufferAsync(Jimp.MIME_JPEG);

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", 'attachment; filename="vvic_selected.jpg"');
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(out);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) || "stitch 실패" });
  }
}


export const vvicRouter = express.Router();
vvicRouter.get("/extract", apiExtract);
vvicRouter.post("/ai", express.json({ limit: "2mb" }), apiAiGenerate);
vvicRouter.post("/stitch", express.json({ limit: "5mb" }), apiStitch);

export default vvicRouter;
