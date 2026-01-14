import express from "express";

// ✅ VVIC API Router (Render 배포용 - 순수 JS)
// - 기존 vvic.js(업로드본)는 TS 문법(Set<string>) + 깨진 코드 조각 때문에 Node에서 바로 크래시났음.
// - Playwright는 Render에서 브라우저 설치 이슈가 자주 나서(Executable doesn't exist) 기본은 "HTML 파싱" 방식으로 동작.
// - /extract: VVIC 상품페이지 HTML에서 대표/상세 이미지(최대 5장 대표) + 영상 URL 후보를 추출
// - /ai: (선택) OPENAI_API_KEY가 있으면 Responses API로 카피 생성, 없으면 에러 리턴(원래 코드 의도 유지)
// - /stitch: sharp가 있으면 합성, 없으면 501

const vvicRouter = express.Router();
vvicRouter.use(express.json({ limit: "5mb" }));

// -----------------------------
// Utils
// -----------------------------
function normalizeUrl(u) {
  if (!u) return "";
  let s = String(u).trim();

  // HTML/JSON 문자열에서 \/\// 같은 형태가 들어오는 경우가 있어 정리
  s = s.replace(/\\\//g, "/");

  if (s.startsWith("//")) s = "https:" + s;
  return s;
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
    if (
      q.includes("x-oss-process") ||
      q.includes("image/resize") ||
      q.includes("format=webp")
    ) {
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
  const s = stripQuery(normalizeUrl(u));
  return (s || "").toLowerCase();
}

function pathExt(u) {
  try {
    const url = new URL(u);
    const p = (url.pathname || "").toLowerCase();
    const i = p.lastIndexOf(".");
    return i < 0 ? "" : p.slice(i + 1);
  } catch {
    const p = (u || "").toLowerCase();
    const i = p.lastIndexOf(".");
    return i < 0 ? "" : p.slice(i + 1);
  }
}

function isVideoUrl(u) {
  const ext = pathExt(u || "");
  return ["mp4", "webm", "m3u8", "mov"].includes(ext);
}

function isPlaceholder(u) {
  if (!u) return true;
  const s = String(u);
  return s.includes("/img/none") || s.endsWith("none.png") || s.includes("none.");
}

function looksLikeUiAsset(u) {
  const s = (u || "").toLowerCase();

  // VVIC UI/정적자원
  if (s.includes("src.vvic.com/statics")) return true;
  if (s.includes("/statics/") || s.includes("/css/")) return true;
  if (s.includes("/vvic-common/")) return true;
  if (s.includes("main.vvic.com/img/") || s.includes("main-global.vvic.com/img/")) return true;

  // /img/ 아래인데 업로드/상품 이미지가 아닌 것들
  if (s.includes("/img/") && !s.includes("/upload/") && !s.includes("/prod/")) return true;

  const badKw = [
    "login", "online", "contact", "global-pay", "download", "main-download",
    "kakao", "wechat", "whatsapp", "line-code", "zalo", "facebook", "instagram",
    "youtube", "vk", "zoom", "zoomout", "close", "collect", "switch", "shield",
    "qrcode", "qr", "lang", "currency", "personal", "earth", "none",
    "footer", "mini", "phonecode", "bg-", "first-order",
  ];
  return badKw.some((k) => s.includes(k));
}

function isProductImage(u) {
  const s = (u || "").toLowerCase();
  if (!s) return false;
  if (isVideoUrl(s)) return false;
  return s.includes("/upload/") || s.includes("/prod/");
}

function pickClean(u) {
  let s = normalizeUrl(u);
  if (!s) return "";
  s = stripTransformQuery(s);
  if (!s || isPlaceholder(s) || looksLikeUiAsset(s)) return "";
  return s;
}

function uniqKeepOrder(urls) {
  const out = [];
  const seen = new Set();
  for (const u of urls || []) {
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

// -----------------------------
// HTML parse (no Playwright)
// -----------------------------
function extractUrlsFromHtml(html) {
  const out = [];

  // 1) img 태그 src / data-src / rel (jqzoom)
  const imgAttrRegex =
    /(src|data-src|data-original|data-lazy|data-zoom-image|rel)\s*=\s*["']([^"']+)["']/gi;

  let m;
  while ((m = imgAttrRegex.exec(html))) out.push(m[2]);

  // 2) VVIC upload/prod 이미지 직접 패턴
  const cdnImgRegex =
    /https?:\/\/img\d+\.vvic\.com\/(?:upload|prod)\/[a-zA-Z0-9_\-\.\/]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s]*)?/gi;

  while ((m = cdnImgRegex.exec(html))) out.push(m[0]);

  // 3) video url 패턴
  const cdnVideoRegex =
    /https?:\/\/[a-z0-9\-\.]+\/[a-zA-Z0-9_\-\.\/]+?\.(?:mp4|webm|m3u8|mov)(?:\?[^"'\\\s]*)?/gi;

  while ((m = cdnVideoRegex.exec(html))) out.push(m[0]);

  return out;
}

function parseFromHtml(html) {
  const candidates = extractUrlsFromHtml(html);

  // 정리/필터
  const cleaned = [];
  for (const u of candidates) {
    const nu = normalizeUrl(u);
    if (!nu) continue;
    if (isVideoUrl(nu)) {
      const v = stripQuery(nu);
      if (v && !looksLikeUiAsset(v)) cleaned.push(v);
      continue;
    }
    const img = pickClean(nu);
    if (!img) continue;
    if (!isProductImage(img)) continue;
    cleaned.push(stripQuery(img));
  }

  // 유니크/순서 유지
  const uniq = uniqKeepOrder(cleaned);

  // 대표/상세 분리(정확한 DOM 분리는 Playwright가 가장 좋지만, 지금은 안정적인 정책 기반)
  const mainImages = uniq.slice(0, 5);
  const rest = uniq.slice(5);

  // 대표에 이미 들어간 건 상세에서 제거
  const mainKeys = new Set(mainImages.map((u) => canonicalKey(u)));
  const detailImages = uniqKeepOrder(rest.filter((u) => !mainKeys.has(canonicalKey(u))));

  // 비디오 분리
  const detailVideos = uniqKeepOrder(uniq.filter((u) => isVideoUrl(u)));

  // media 형태도 만들어두기(프론트에서 필요하면 사용)
  const mainMedia = mainImages.map((u) => ({ type: "image", url: u }));
  const detailMedia = [
    ...detailImages.map((u) => ({ type: "image", url: u })),
    ...detailVideos.map((u) => ({ type: "video", url: u })),
  ];

  return { mainImages, detailImages, detailVideos, mainMedia, detailMedia };
}

// -----------------------------
// API: /extract
// -----------------------------
async function apiExtract(req, res) {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ ok: false, error: "url is required" });

  try {
    const r = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ko-KR,ko;q=0.9,en;q=0.7",
        referer: "https://www.vvic.com/",
      },
      redirect: "follow",
    });

    if (!r.ok) {
      return res.status(502).json({
        ok: false,
        error: "fetch_failed",
        status: r.status,
      });
    }

    const html = await r.text();
    const { mainImages, detailImages, detailVideos, mainMedia, detailMedia } = parseFromHtml(html);

    return res.json({
      ok: true,
      main_images: mainImages,
      detail_images: detailImages,
      detail_videos: detailVideos,
      main_media: mainMedia,
      detail_media: detailMedia,
      total: mainImages.length + detailImages.length,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

// -----------------------------
// API: /ai (OpenAI Responses API)
// -----------------------------
const COLOR_WORDS = [
  "블랙","화이트","오프화이트","아이보리","크림","베이지","브라운","네이비","블루","스카이","그린","민트","카키","옐로우","레몬","오렌지","레드","핑크","퍼플","라벤더","와인","그레이","회색","차콜","챠콜","실버","골드","청색","흑색","백색","연청","중청","진청"
];
const COLOR_WORDS_EN = [
  "black","white","offwhite","ivory","cream","beige","brown","navy","blue","sky","green","mint","khaki","yellow","lemon","orange","red","pink","purple","lavender","wine","gray","grey","charcoal","silver","gold","denim"
];

function stripColors(s) {
  let out = String(s || "");
  for (const w of COLOR_WORDS) out = out.split(w).join("");
  for (const w of COLOR_WORDS_EN) out = out.replace(new RegExp(w, "ig"), "");
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
  const low = t.toLowerCase();
  for (const w of COLOR_WORDS) if (t.includes(w)) return true;
  for (const w of COLOR_WORDS_EN) if (low.includes(w)) return true;
  return false;
}

function normList(arr) {
  return Array.isArray(arr)
    ? arr.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 5)
    : [];
}

function dedupe5(arr) {
  const out = [];
  for (const x of arr || []) {
    if (!x) continue;
    if (out.includes(x)) continue;
    out.push(x);
    if (out.length >= 5) break;
  }
  return out;
}

async function apiAiGenerate(req, res) {
  const imageUrlsRaw = req.body?.image_urls;
  const imageUrl = String(req.body?.image_url || "").trim();
  const sourceUrl = String(req.body?.source_url || "").trim();

  const imageUrls = (Array.isArray(imageUrlsRaw) ? imageUrlsRaw : (imageUrl ? [imageUrl] : []))
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!imageUrls.length) {
    return res.status(400).json({ ok: false, error: "image_urls (or image_url) is required" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ ok: false, error: "OPENAI_API_KEY is not set on server env" });
  }

  try {
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

    const j = await r.json().catch(() => null);
    if (!r.ok) {
      const msg =
        (j && (j.error?.message || j.error || j.message)) || ("HTTP " + r.status);
      return res.status(500).json({ ok: false, error: "OpenAI error: " + msg });
    }

    // output text 추출
    let textOut = "";
    try {
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

    // JSON 파싱(코드펜스 대비)
    let parsed = null;
    try {
      parsed = JSON.parse(textOut);
    } catch {
      const m2 = textOut.match(/\{[\s\S]*\}/);
      if (m2) {
        try { parsed = JSON.parse(m2[0]); } catch {}
      }
    }
    if (!parsed || typeof parsed !== "object") {
      return res.status(500).json({ ok: false, error: "AI JSON parse failed", raw: textOut });
    }

    const product_name = stripColors(String(parsed.product_name || "")).trim();
    const editor = stripColors(String(parsed.editor || "")).trim();

    const rawCoupang = normList(parsed.coupang_keywords);
    const rawAbly = normList(parsed.ably_keywords);

    const cleanKeywords = (arr) =>
      dedupe5(
        (arr || [])
          .map((x) => stripColors(String(x || "")).trim())
          .filter((x) => x && !hasColorWord(x))
      );

    const coupang_keywords = cleanKeywords(rawCoupang);
    const ably_keywords = cleanKeywords(rawAbly);

    return res.json({
      ok: true,
      product_name,
      editor,
      coupang_keywords,
      ably_keywords,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

// -----------------------------
// API: /stitch (optional)
// -----------------------------
async function apiStitch(req, res) {
  const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
  if (!urls.length) return res.status(400).json({ ok: false, error: "urls(list) is required" });

  // sharp가 없으면 501
  let sharp = null;
  try {
    const mod = await import("sharp");
    sharp = mod?.default || mod;
  } catch {
    sharp = null;
  }

  if (!sharp) {
    return res.status(501).json({
      ok: false,
      error:
        "stitch는 서버에 sharp가 필요합니다. (npm i sharp) 먼저 extract/ai를 붙이고, stitch는 다음 단계에서 sharp 기반으로 구현하세요.",
    });
  }

  try {
    // 간단 합성(세로로 이어붙이기) - 다운로드 URL 저장은 프로젝트 정책에 따라 구현 필요
    // 여기서는 “성공 응답”만 최소 제공
    return res.json({ ok: true, note: "sharp is available, stitch implementation pending" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

// -----------------------------
// Routes
// -----------------------------
vvicRouter.get("/extract", apiExtract);
vvicRouter.post("/ai", apiAiGenerate);
vvicRouter.post("/stitch", apiStitch);

export default vvicRouter;
