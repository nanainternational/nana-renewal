import type { Request, Response } from "express";
import express from "express";
import { chromium } from "playwright";
import Jimp from "jimp";

// Render/서버 환경에서 Playwright 브라우저 경로가 ~/.cache 로 잡혀 실행 파일이 없다고 뜨는 문제를 피하기 위해
// PLAYWRIGHT_BROWSERS_PATH=0(프로젝트 내부 경로)로 강제합니다. (환경변수로 이미 설정되어 있으면 그대로 사용)
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "0";

function decodeHtmlEntities(s: string): string {
  if (!s) return "";
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&#60;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#62;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripWrappingQuotes(s: string): string {
  s = (s || "").trim();
  // 문자열에 따옴표가 섞여 들어오는 케이스(HTML entity 포함)를 방어
  s = decodeHtmlEntities(s).trim();
  // quote:... 형태 방어
  if (s.toLowerCase().startsWith("quote:")) s = s.slice(6).trim();
  // "..." 또는 '...' 감싸기 제거
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function cleanIncomingUrl(u: string): string {
  u = stripWrappingQuotes(String(u || ""));
  u = normalizeUrl(u);
  return u;
}


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
  if (u.includes("/prod/screenshot/")) return true;
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
  let mainUrls: string[] = [];
  let detailUrls: string[] = [];
  try {
    const got = await page.evaluate(() => {
      const any: string[] = [];
      const main: string[] = [];
      const detail: string[] = [];

      const push = (arr: string[], u: any) => {
        if (!u) return;
        const s = String(u).trim();
        if (!s) return;
        arr.push(s);
      };

      const scoreByAncestors = (el: Element) => {
        let node: Element | null = el;
        let scoreMain = 0;
        let scoreDetail = 0;
        for (let i = 0; i < 6 && node; i++) {
          const cls = (node.getAttribute("class") || "").toLowerCase();
          const id = (node.getAttribute("id") || "").toLowerCase();
          const key = cls + " " + id;

          if (key.includes("gallery") || key.includes("swiper") || key.includes("carousel") || key.includes("slider") || key.includes("od-gallery")) {
            scoreMain += 3;
          }
          if (key.includes("thumb") || key.includes("thumbnail") || key.includes("preview")) {
            scoreMain += 2;
          }
          if (key.includes("detail") || key.includes("desc") || key.includes("description") || key.includes("content") || key.includes("introduce") || key.includes("editor")) {
            scoreDetail += 3;
          }
          node = node.parentElement;
        }
        const r = (el as HTMLElement).getBoundingClientRect?.();
        if (r) {
          if (r.top < window.innerHeight * 1.2) scoreMain += 1;
          if (r.top > window.innerHeight * 1.2) scoreDetail += 1;
        }
        return { scoreMain, scoreDetail };
      };

      // img src / data-src / rel / srcset
      document.querySelectorAll("img").forEach((img) => {
        const { scoreMain, scoreDetail } = scoreByAncestors(img);
        const src = (img as HTMLImageElement).currentSrc || img.getAttribute("src");
        const dsrc = img.getAttribute("data-src");
        const rel = img.getAttribute("rel");
        const srcset = img.getAttribute("srcset");

        [src, dsrc, rel].forEach((u) => {
          if (!u) return;
          push(any, u);
          if (scoreMain >= scoreDetail) push(main, u);
          if (scoreDetail >= scoreMain) push(detail, u);
        });

        if (srcset) {
          srcset.split(",").forEach((part) => {
            const u = part.trim().split(" ")[0];
            if (!u) return;
            push(any, u);
            if (scoreMain >= scoreDetail) push(main, u);
            if (scoreDetail >= scoreMain) push(detail, u);
          });
        }
      });

      // inline style background-image
      document.querySelectorAll<HTMLElement>("*").forEach((el) => {
        const bg = getComputedStyle(el).backgroundImage;
        if (!bg || !bg.includes("url(")) return;
        const m = bg.match(/url\(["']?(.*?)["']?\)/i);
        if (!m || !m[1]) return;

        const { scoreMain, scoreDetail } = scoreByAncestors(el);
        push(any, m[1]);
        if (scoreMain >= scoreDetail) push(main, m[1]);
        if (scoreDetail >= scoreMain) push(detail, m[1]);
      });

      // video/src
      document.querySelectorAll("video").forEach((v) => {
        push(any, v.getAttribute("src"));
        v.querySelectorAll("source").forEach((s) => push(any, s.getAttribute("src")));
      });

      return { any, main, detail };
    });

    anyUrls = got?.any || [];
    mainUrls = got?.main || [];
    detailUrls = got?.detail || [];
  } catch {
    anyUrls = [];
    mainUrls = [];
    detailUrls = [];
  }

  const html = await page.content();
  await browser.close();
  return { html, anyUrls, mainUrls, detailUrls };
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

export async function apiExtract(req: Request, res: Response) {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ ok: false, error: "url is required" });

  try {
    const { html, anyUrls, mainUrls, detailUrls } = await fetchDomMediaByPlaywright(url);

    const { mainImages: mainFromHtml, detailImages: detailFromHtml } = parseFromHtmlDom(html);

    const mainFromDom = (mainUrls || [])
      .map((u: any) => pickClean(String(u || "")))
      .filter(Boolean)
      .map(normalizeUrl);

    const detailFromDom = (detailUrls || [])
      .map((u: any) => pickClean(String(u || "")))
      .filter(Boolean)
      .map(normalizeUrl);

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

    let mainImages = uniqKeepOrder([...mainFromDom, ...mainFromHtml]);
    let detailImages = uniqKeepOrder([...detailFromDom, ...detailFromHtml]);

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


export async function apiAiGenerate(req: Request, res: Response) {
  const imageUrlsRaw = req.body?.image_urls;
  const imageUrl = String(req.body?.image_url || "").trim();
  const sourceUrl = String(req.body?.source_url || "").trim();
  const imageUrls = (Array.isArray(imageUrlsRaw) ? imageUrlsRaw : (imageUrl ? [imageUrl] : []))
    .map((x: any) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ ok: false, error: "OPENAI_API_KEY is not set on server env" });
  }
    if (!imageUrls.length) return res.status(400).json({ ok: false, error: "image_urls (or image_url) is required" });

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

    return res.json({ ok: true, ...result });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

export async function apiProxyImage(req: Request, res: Response) {
  try {
    const raw = String(req.query.url || "");
    const url = cleanIncomingUrl(raw);
    if (!url) return res.status(400).json({ ok: false, error: "url이 비었습니다." });

    // 브라우저에서 CORS 때문에 fetch가 막히는 케이스를 우회하기 위해 서버에서 이미지 bytes를 그대로 반환
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Referer: "https://www.vvic.com/",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!r.ok) {
      return res.status(400).json({ ok: false, error: `이미지 다운로드 실패: ${r.status}` });
    }

    const ct = r.headers.get("content-type") || "application/octet-stream";
    const buf = Buffer.from(await r.arrayBuffer());

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buf);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

export async function apiStitch(req: Request, res: Response) {
  try {
    const body = (req.body ?? {}) as any;
    const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];
    if (!urls.length) {
      return res.status(400).json({ ok: false, error: "urls가 비었습니다." });
    }

    // 안전장치(과부하/502 방지)
    const MAX_IMAGES = 30;
    const MAX_WIDTH = 1200; // 너무 큰 원본은 서버 메모리 폭발 → 폭 제한
    const MAX_TOTAL_HEIGHT = 30000; // 세로가 너무 길면 합성 자체가 위험
    const TIMEOUT_MS = 15000;

    const picked = urls
      .map((u) => cleanIncomingUrl(String(u || "")))
      .filter(Boolean)
      .filter((u) => !isVideoUrl(u))
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

    // 이미지 다운로드 + 디코딩
    const imgs: Jimp[] = [];
    for (const url of picked) {
      const r = await fetchWithTimeout(url, TIMEOUT_MS);
      if (!r.ok) {
        return res.status(400).json({ ok: false, error: `이미지 다운로드 실패: ${r.status} ${url}` });
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

    const maxW = Math.max(...imgs.map((i) => i.bitmap.width));
    const resized = imgs.map((img) => (img.bitmap.width === maxW ? img : img.resize(maxW, Jimp.AUTO)));

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

    // zip에서 png로 저장하므로 서버도 png로 반환
    const out = await canvas.getBufferAsync(Jimp.MIME_PNG);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'attachment; filename="vvic_detail.png"');
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(out);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) || "stitch 실패" });
  }
}

export const vvicRouter = express.Router();
vvicRouter.get("/extract", apiExtract);
vvicRouter.get("/proxy-image", apiProxyImage);
vvicRouter.post("/ai", express.json({ limit: "2mb" }), apiAiGenerate);
vvicRouter.post("/stitch", express.json({ limit: "5mb" }), apiStitch);

export default vvicRouter;
