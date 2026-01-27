import express from "express";

const router = express.Router();

// -------------------------
// Utils
// -------------------------
function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function toAbs(url) {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  return url;
}

// VVIC “진짜 상품 이미지”만 허용 (upload 경로)
// - img1.vvic.com/upload/... (대표/상세 실제 이미지)
// - 그 외 src.vvic.com/statics/... (로고/정적) -> 제외
function isRealVvicImage(u) {
  if (!u) return false;
  const url = toAbs(u);
  if (url.includes("src.vvic.com/statics")) return false;
  if (url.includes("/statics/")) return false;
  if (url.includes("logo")) return false;
  return /https?:\/\/img\d*\.vvic\.com\/upload\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url);
}

function extractItemId(inputUrl) {
  if (!inputUrl) return "";
  try {
    const parsed = new URL(inputUrl.trim());
    const m = parsed.pathname.match(/^\/item\/([^/]+)$/);
    return m?.[1] || "";
  } catch {
    const m = String(inputUrl).match(/\/item\/([^/?#]+)/);
    return m?.[1] || "";
  }
}

// ✅ 예전처럼 m.vvic로 “강제 변환”하지 않고, item path만 깔끔히 정리
function normalizeVvicUrl(inputUrl) {
  if (!inputUrl) return "";
  try {
    const parsed = new URL(inputUrl.trim());
    if (/^\/item\/.+/.test(parsed.pathname)) {
      return `${parsed.origin}${parsed.pathname}`; // query 제거
    }
    return inputUrl.trim();
  } catch {
    return inputUrl.trim();
  }
}

function buildHeaders(extra = {}) {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    ...extra,
  };
}

async function fetchText(url, extraHeaders = {}) {
  const resp = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: buildHeaders(extraHeaders),
  });

  const text = await resp.text();
  return {
    status: resp.status,
    text,
    final_url: resp.url,
    content_type: resp.headers.get("content-type") || "",
  };
}

// ✅ 상품 페이지를 받은 게 맞는지 간단 판별(리다이렉트/검증 페이지 방지)
function isLikelyItemPage(html, finalUrl, itemId) {
  const u = String(finalUrl || "");
  if (!html || html.length < 200) return false;

  // promotion/verify 류로 튕기면 실패로 간주
  if (u.includes("/promotion")) return false;
  if (u.includes("/login")) return false;
  if (u.includes("/verify")) return false;
  if (u.includes("/captcha")) return false;

  // 최선: final_url이 /item/ 을 유지
  if (u.includes("/item/")) return true;

  // 차선: HTML 안에 itemId가 흔적이라도 있으면 통과
  if (itemId && String(html).includes(itemId)) return true;

  return false;
}

// DOM 파싱 (A안). cheerio 설치 시 사용.
// cheerio가 없으면 절대 에러로 죽지 않고, regex 백업으로 진행.
let cheerio;
async function getCheerio() {
  if (cheerio) return cheerio;
  try {
    const mod = await import("cheerio");
    cheerio = mod.default || mod;
    return cheerio;
  } catch {
    return null;
  }
}

// -------------------------
// A안: “상세 이미지 영역” DOM 기반 추출
// -------------------------
function extractByDom(html) {
  const DETAIL_SELECTORS = [
    ".detail-img img",
    ".detail img",
    "#detail img",
    ".goods-detail img",
    ".goodsDetail img",
    ".product-detail img",
    ".productDetail img",
    "[class*='detail'] img",
  ];

  const MAIN_SELECTORS = [
    ".swiper-wrapper img",
    ".swiper-slide img",
    ".gallery img",
    ".product-swiper img",
    ".productSwiper img",
    "[class*='swiper'] img",
    "[class*='gallery'] img",
  ];

  const $ = cheerio.load(html);

  const pickUrlsFromSelectors = (selectors) => {
    const out = [];
    for (const sel of selectors) {
      $(sel).each((_, el) => {
        const src =
          $(el).attr("data-src") ||
          $(el).attr("data-original") ||
          $(el).attr("data-lazy") ||
          $(el).attr("src");
        const abs = toAbs(src);
        if (isRealVvicImage(abs)) out.push(abs);
      });
      if (out.length > 0) break;
    }
    return uniq(out);
  };

  const main = pickUrlsFromSelectors(MAIN_SELECTORS);
  const detail = pickUrlsFromSelectors(DETAIL_SELECTORS);
  return { main, detail };
}

// HTML/JSON 어디든 upload URL 백업(최후 fallback)
function extractByRegexFallback(text) {
  const re =
    /https?:\/\/img\d*\.vvic\.com\/upload\/[^"'\\\s>]+?\.(?:jpg|jpeg|png|webp)(\?[^"'\\\s>]*)?/gi;
  const found = text.match(re) || [];
  return uniq(found.map(toAbs).filter(isRealVvicImage));
}

// -------------------------
// B안: itemId 기반 “API 후보” 찌르기 (HTML에 이미지가 없을 때)
// -------------------------
async function tryFetchApiImages(itemId, refererUrl) {
  if (!itemId) return { main: [], detail: [], hit: "" };

  const candidates = [
    `https://m.vvic.com/api/item/detail?itemId=${encodeURIComponent(itemId)}`,
    `https://m.vvic.com/api/item/getDetail?itemId=${encodeURIComponent(itemId)}`,
    `https://m.vvic.com/api/goods/detail?itemId=${encodeURIComponent(itemId)}`,
    `https://m.vvic.com/api/item/info?itemId=${encodeURIComponent(itemId)}`,
    `https://www.vvic.com/api/item/detail?itemId=${encodeURIComponent(itemId)}`,
    `https://www.vvic.com/api/item/getDetail?itemId=${encodeURIComponent(itemId)}`,
  ];

  for (const apiUrl of candidates) {
    try {
      const { status, text, content_type } = await fetchText(apiUrl, {
        "Accept": "application/json,text/plain,*/*",
        "Referer": refererUrl || "https://m.vvic.com/",
      });

      // JSON이 아니어도 text 안에서 upload URL만 나오면 OK
      if (status >= 200 && status < 300) {
        const urls = extractByRegexFallback(text);
        if (urls.length > 0) {
          const main = urls.slice(0, Math.min(12, urls.length));
          const mainSet = new Set(main);
          const detail = urls.filter((u) => !mainSet.has(u));
          return { main, detail, hit: `${apiUrl} (${content_type || "no-ct"})` };
        }
      }
    } catch {
      // 다음 후보로 계속
    }
  }

  return { main: [], detail: [], hit: "" };
}

// -------------------------
// Routes
// -------------------------

// GET /api/vvic/extract?url=...
router.get("/extract", async (req, res) => {
  try {
    const rawUrl = String(req.query.url || "").trim();
    if (!rawUrl) return res.status(400).json({ ok: false, error: "url_required" });

    const normalized = normalizeVvicUrl(rawUrl);
    const itemId = extractItemId(normalized);

    // ✅ 여러 후보 URL로 HTML 재시도 (m 강제 때문에 promotion으로 튕기는 케이스 방지)
    const candidates = [];
    if (normalized) candidates.push(normalized);
    if (itemId) {
      candidates.push(`https://www.vvic.com/item/${itemId}`);
      candidates.push(`https://m.vvic.com/item/${itemId}`);
    }

    let status = 0;
    let html = "";
    let final_url = "";
    let content_type = "";
    let tried = [];

    for (const u of uniq(candidates)) {
      tried.push(u);
      const r = await fetchText(u, { "Referer": "https://www.vvic.com/" });
      status = r.status;
      html = r.text;
      final_url = r.final_url;
      content_type = r.content_type;

      if (isLikelyItemPage(html, final_url, itemId)) break;
    }

    if (!html || html.length < 200) {
      return res.status(500).json({ ok: false, error: "empty_html", status, url: normalized });
    }

    // ✅ promotion/검증으로 튕긴 경우는 “성공 0개”로 처리하지 말고 실패로 알려주기
    if (!isLikelyItemPage(html, final_url, itemId)) {
      const head = String(html || "").slice(0, 800);
      return res.status(200).json({
        ok: false,
        error: "blocked_or_redirected",
        url: normalized,
        debug: {
          status,
          final_url,
          content_type,
          itemId,
          tried,
          head_800: head,
          hint: "상품 HTML 대신 promotion/검증/로그인 페이지를 받았습니다. 서버 fetch가 차단되는 상태입니다.",
        },
      });
    }

    // ✅ A안: cheerio 있으면 DOM 기반
    let main = [];
    let detail = [];
    const ch = await getCheerio();

    if (ch) {
      cheerio = ch;
      ({ main, detail } = extractByDom(html));
    }

    // ✅ 둘 중 하나라도 비면, regex 백업으로 보강
    if (main.length === 0 || detail.length === 0) {
      const all = extractByRegexFallback(html);
      if (main.length === 0) main = all.slice(0, Math.min(12, all.length));
      if (detail.length === 0) {
        const mainSet = new Set(main);
        detail = all.filter((u) => !mainSet.has(u));
      }
    }

    // ✅ 그래도 0개면: B안(API 후보들)로 한번 더
    let api_hit = "";
    if (main.length === 0 && detail.length === 0) {
      const api = await tryFetchApiImages(itemId, final_url || normalized);
      api_hit = api.hit;
      if (api.main.length || api.detail.length) {
        main = api.main;
        detail = api.detail;
      }
    }

    // 마지막 정리
    main = uniq(main).filter(isRealVvicImage);
    detail = uniq(detail).filter(isRealVvicImage);

    if (main.length === 0 && detail.length === 0) {
      return res.status(200).json({
        ok: true,
        url: normalized,
        main_images: [],
        detail_images: [],
        counts: { total: 0, main: 0, detail: 0 },
        hint:
          "상품 HTML은 받았지만 DOM/regex/API 모두에서 img*.vvic.com/upload 이미지를 찾지 못했습니다. (JS로만 로딩되거나 구조 변경 가능)",
        debug: {
          status,
          final_url,
          content_type,
          itemId,
          dom: Boolean(ch),
          api_hit,
        },
      });
    }

    return res.status(200).json({
      ok: true,
      url: normalized,
      main_images: main,
      detail_images: detail,
      counts: { total: main.length + detail.length, main: main.length, detail: detail.length },
      meta: { dom: Boolean(ch), itemId, final_url, content_type, api_hit },
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
    });
  }
});

// GET /api/vvic/_debug?url=...
router.get("/_debug", async (req, res) => {
  try {
    const rawUrl = String(req.query.url || "").trim();
    const normalized = normalizeVvicUrl(rawUrl);
    const itemId = extractItemId(normalized);

    const candidates = [];
    if (normalized) candidates.push(normalized);
    if (itemId) {
      candidates.push(`https://www.vvic.com/item/${itemId}`);
      candidates.push(`https://m.vvic.com/item/${itemId}`);
    }

    let status = 0;
    let html = "";
    let final_url = "";
    let content_type = "";
    let tried = [];

    for (const u of uniq(candidates)) {
      tried.push(u);
      const r = await fetchText(u, { "Referer": "https://www.vvic.com/" });
      status = r.status;
      html = r.text;
      final_url = r.final_url;
      content_type = r.content_type;
      if (html && html.length > 200) break;
    }

    const sampleUpload = extractByRegexFallback(html).slice(0, 20);
    const head = String(html || "").slice(0, 800);

    res.status(200).json({
      ok: true,
      url: normalized,
      status,
      final_url,
      content_type,
      html_len: html?.length || 0,
      itemId,
      tried,
      sample_upload_urls: sampleUpload,
      head_800: head,
      note:
        "sample_upload_urls가 0개면: HTML 자체가 이미지 데이터를 안 주는 상태(=JS XHR 로딩/차단/검증/리다이렉트) 가능성 큼",
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;
