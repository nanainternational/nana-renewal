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


async function apiAiGenerate(req: Request, res: Response) {
  const imageUrlsRaw = req.body?.image_urls;
  const imageUrl = String(req.body?.image_url || "").trim();
  const imageUrls = Array.isArray(imageUrlsRaw) ? imageUrlsRaw.map((x: any) => String(x || "").trim()).filter(Boolean).slice(0, 5) : [];
  const sourceUrl = String(req.body?.source_url || "").trim();

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ ok: false, error: "OPENAI_API_KEY is not set on server env" });
  }
  if (!imageUrl && !imageUrls.length) return res.status(400).json({ ok: false, error: "image_urls (or image_url) is required" });

  try {
    // Responses API (server-side). Do NOT expose the API key to the browser.
    const prompt = [
      "너는 한국 이커머스 상품 상세페이지용 카피라이터다.",
      "입력된 대표이미지(상품 사진) 여러 장(최대 5장)을 종합해서 아래를 생성해라.",
      "",
      "출력은 반드시 JSON만. 다른 텍스트 금지.",
      "",
      "스키마:",
      "{",
      '  "product_name": "20자 내외(최대 22자) 한국어 상품명",',
      '  "editor": "약 200자 내외 한국어 에디터(과장 금지, 자연스러운 판매 문구)",',
      '  "coupang_keywords": ["키워드1","키워드2","키워드3","키워드4","키워드5"],',
      '  "ably_keywords": ["키워드1","키워드2","키워드3","키워드4","키워드5"]',
      "}",
      "",
      "규칙:",
      "- 상품명은 20자 내외(가능하면 18~22자 사이)
      - 에디터는 200자 내외(가능하면 170~220자 사이)
      - 키워드는 중복 없이 각 5개씩",
      "- 너무 일반적인 단어만 나열하지 말고, 소재/기능/타겟/사용상황을 섞어서",
      "- 색상(컬러) 언급 금지 (옵션/변형 때문에 색상은 상품명/키워드/에디터에 쓰지 말 것)
      - 사이즈/브랜드/구성품 등도 확실치 않으면 단정 금지
      - 사진에서 확실히 알 수 없는 정보는 단정하지 말고 무난하게 표현",
      sourceUrl ? ("- 참고 URL: " + sourceUrl) : "",
    ].filter(Boolean).join("\n");

    const body = {
      model: "gpt-5",
      input: [
        {
          role: "user",
          content: (() => {
            const parts: any[] = [{ type: "input_text", text: prompt }];
            const imgs = imageUrls.length ? imageUrls : (imageUrl ? [imageUrl] : []);
            for (const u of imgs.slice(0, 5)) parts.push({ type: "input_image", image_url: u });
            return parts;
          })(),
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

    const stripColorWords = (s: string) => {
      // 색상 단어 제거 (옵션/변형 대응)
      const colors = [
        "블랙","검정","화이트","하얀","아이보리","베이지","브라운","갈색","그레이","회색",
        "네이비","남색","블루","파랑","레드","빨강","핑크","로즈","옐로우","노랑",
        "그린","초록","카키","올리브","퍼플","보라","오렌지","주황","민트","와인","버건디",
        "실버","은색","골드","금색"
      ];
      let out = String(s || "");
      for (const c of colors) {
        // 단어 경계가 애매해서 단순 치환 + 공백 정리
        out = out.replace(new RegExp(c, "gi"), "");
      }
      out = out.replace(/\s{2,}/g, " ").trim();
      // 기호만 남는 경우 정리
      out = out.replace(/^[\-_,.\s]+|[\-_,.\s]+$/g, "").trim();
      return out;
    };

    const normList = (arr: any) =>
      Array.isArray(arr) ? arr.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 5) : [];
    const result = (() => {
      const pn0 = String(parsed.product_name || "").trim();
      const ed0 = String(parsed.editor || "").trim();
      const pn = stripColorWords(pn0) || pn0;
      const ed = stripColorWords(ed0) || ed0;
      // fallbackIfEmpty

      const uniq5 = (arr: any) => {
        const out: string[] = [];
        const seen = new Set<string>();
        for (const raw of Array.isArray(arr) ? arr : []) {
          const s = stripColorWords(String(raw || "").trim());
          if (!s) continue;
          const key = s.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(s);
          if (out.length >= 5) break;
        }
        return out;
      };

      // Hard limits: 상품명 22자, 에디터 220자 (200자 내외 목표)
      const product_name = pn.slice(0, 22);
      const editor = ed.slice(0, 220);

      return {
        product_name,
        editor,
        coupang_keywords: uniq5(parsed.coupang_keywords),
        ably_keywords: uniq5(parsed.ably_keywords),
      };
    })();

    return res.json({ ok: true, ...result });
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
vvicRouter.post("/ai", express.json({ limit: "2mb" }), apiAiGenerate);
vvicRouter.post("/stitch", express.json({ limit: "5mb" }), apiStitch);
