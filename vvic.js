import express from "express";
import { chromium } from "playwright";

// Render/서버 환경에서 Playwright 브라우저 경로가 ~/.cache 로 잡혀 실행 파일이 없다고 뜨는 문제를 피하기 위해
// PLAYWRIGHT_BROWSERS_PATH=0(프로젝트 내부 경로)로 강제합니다. (환경변수로 이미 설정되어 있으면 그대로 사용)
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "0";

function normalizeUrl(u) {
  if (!u) return "";
  u = String(u).trim().replace("\\/\\/", "//").replace("\\/", "/");
  if (u.startsWith("//")) return "https:" + u;
  return u;
}

function stripQuery(u) {
  try {
    const url = new URL(u);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return u;
  }
}

function stripTransformQuery(u) {
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

function canonicalKey(u) {
  u = normalizeUrl(u);
  u = stripQuery(u);
  return (u || "").toLowerCase();
}

function isPlaceholder(u) {
  if (!u) return true;
  return u.includes("/img/none") || u.endsWith("none.png") || u.includes("none.");
}

function looksLikeUiAsset(u) {
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

function uniqKeepOrder(urls) {
  const out= [];
  const seen = new Set<string>();
  for (const u of urls) {
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function pathExt(u) {
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

function isVideoUrl(u) {
  const ext = pathExt(u || "");
  return ["mp4", "webm", "m3u8", "mov"].includes(ext);
}

function isProductImage(u) {
  const u2 = (u || "").toLowerCase();
  if (isVideoUrl(u2)) return false;
  return u2.includes("/upload/") || u2.includes("/prod/");
}

function pickClean(u) {
  u = normalizeUrl(u);
  if (!u) return "";
  u = stripTransformQuery(u);
  if (!u || isPlaceholder(u) || looksLikeUiAsset(u)) return "";
  return u;
}

async function fetchDomMediaByPlaywright(url) { html; anyUrls}> {
  const browser = await chromium.launch({
    headless,
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
          document.scrollingElement || document.documentElement || (document.body);
        if (se) (se).scrollTop = (se).scrollHeight;

        const nodes = Array.from(document.querySelectorAll("*"));
        for (const el of nodes) {
          try {
            const st = window.getComputedStyle(el);
            if (!st) continue;
            const oy = st.overflowY;
            if (oy !== "auto" && oy !== "scroll") continue;
            if ((el).scrollHeight > (el).clientHeight + 200) {
              (el).scrollTop = (el).scrollHeight;
            }
          } catch {}
        }
      });
    } catch {}
    await page.waitForTimeout(500);
  }

  let anyUrls= [];
  try {
    anyUrls = await page.evaluate(() => {
      const out= [];
      const push = (u) => {
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

function parseFromHtmlDom(html): { mainImages; detailImages} {
  const mainImages= [];
  const detailImages= [];

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

  return { mainImages(mainImages), detailImages(detailImages) };
}

async function apiExtract(req, res) {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ ok, error: "url is required" });

  try {
    const { html, anyUrls } = await fetchDomMediaByPlaywright(url);

    const { mainImages, detailImages} = parseFromHtmlDom(html);

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

    const mainMedia = mainImages.map((u) => ({ type: "image", url}));
    const detailMedia = [
      ...detailImages.map((u) => ({ type: "image", url})),
      ...domVideoUrls.map((u) => ({ type: "video", url})),
    ];

    return res.json({
      ok,
      main_images,
      detail_images,
      detail_videos,
      main_media,
      detail_media,
    });
  } catch (e) {
    return res.status(500).json({ ok, error(e?.message || e) });
  }
}


async function apiAiGenerate(req, res) {
  const imageUrlsRaw = req.body?.image_urls;
  const imageUrl = String(req.body?.image_url || "").trim();
  const sourceUrl = String(req.body?.source_url || "").trim();
  const imageUrls = (Array.isArray(imageUrlsRaw) ? imageUrlsRaw : (imageUrl ? [imageUrl] : []))
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ ok, error: "OPENAI_API_KEY is not set on server env" });
  }
    if (!imageUrls.length) return res.status(400).json({ ok, error: "image_urls (or image_url) is required" });

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
            { type: "input_text", text},
            ...imageUrls.map((u) => ({ type: "input_image", image_url})),
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
      body.stringify(body),
    });

    const j= await r.json().catch(() => null);
    if (!r.ok) {
      const msg = (j && (j.error?.message || j.error || j.message)) || ("HTTP " + r.status);
      return res.status(500).json({ ok, error: "OpenAI error: " + msg });
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
    if (!textOut) return res.status(500).json({ ok, error: "Empty AI response" });

    let parsed= null;
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
      return res.status(500).json({ ok, error: "AI JSON parse failed", raw});
    }

    // Basic sanitize
    
const COLOR_WORDS = [
  "블랙","화이트","오프화이트","아이보리","크림","베이지","브라운","네이비","블루","스카이","그린","민트","카키","옐로우","레몬","오렌지","레드","핑크","퍼플","라벤더","와인","그레이","회색","차콜","챠콜","실버","골드","청색","흑색","백색","연청","중청","진청"
];
const COLOR_WORDS_EN = [
  "black","white","offwhite","ivory","cream","beige","brown","navy","blue","sky","green","mint","khaki","yellow","lemon","orange","red","pink","purple","lavender","wine","gray","grey","charcoal","silver","gold","denim"
];

function stripColors(s) {
  let out = String(s || "");
  // Korean (case-sensitive)
  for (const w of COLOR_WORDS) out = out.split(w).join("");
  // English (case-insensitive, remove)
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

function hasColorWord(s) {
  const t = String(s || "");
  if (!t) return false;
  const low = t.toLowerCase();
  for (const w of COLOR_WORDS) if (t.includes(w)) return true;
  for (const w of COLOR_WORDS_EN) if (low.includes(w)) return true;
  return false;
}

const normList = (arr) =>
      Array.isArray(arr) ? arr.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 5) : [];
    const rawCoupang = normList(parsed.coupang_keywords);
    const rawAbly = normList(parsed.ably_keywords);

    const cleanKeywords = (arr) =>
      (arr || [])
        .map((x) => stripColors(String(x || "")).trim())
        .filter((x) => x && !hasColorWord(x))
        .filter((x, i, a) => a.indexOf(x) === i)
        .slice(0, 5);

    const result = {
      product_name(String(parsed.product_name || "")).trim(),
      editor(String(parsed.editor || "")).trim(),
      coupang_keywords(rawCoupang),
      ably_keywords(rawAbly),
    };

    return res.json({ ok, ...result });
  } catch (e) {
    return res.status(500).json({ ok, error(e?.message || e) });
  }
}

async function apiStitch(req, res) {
  const urls= Array.isArray(req.body?.urls) ? req.body.urls : [];
  if (!urls.length) return res.status(400).json({ ok, error: "urls(list) is required" });

  return res.status(501).json({
    ok,
    error:
      "stitch는 서버에 이미지 합성 라이브러리(sharp/canvas)가 필요합니다. 먼저 extract까지 붙이고, stitch는 sharp 기반으로 다음 단계에서 구현하겠습니다.",
  });
}

export const vvicRouter = express.Router();
vvicRouter.get("/extract", apiExtract);
vvicRouter.post("/ai", express.json({ limit: "2mb" }), apiAiGenerate);
vvicRouter.post("/stitch", express.json({ limit: "5mb" }), apiStitch);

export default vvicRouter;
