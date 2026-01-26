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

function normalizeVvicUrl(inputUrl) {
  if (!inputUrl) return "";
  let u = inputUrl.trim();

  // query 제거/정리
  try {
    const parsed = new URL(u);
    const itemPath = parsed.pathname; // /item/xxxx
    // m.vvic로 강제 (대개 HTML이 더 안정적)
    if (/^\/item\/.+/.test(itemPath)) {
      return `https://m.vvic.com${itemPath}`;
    }
    return u;
  } catch {
    return u;
  }
}

async function fetchHtml(url) {
  const resp = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
  });

  const text = await resp.text();
  return { status: resp.status, text };
}

// DOM 파싱 (cheerio 없이 “간단 파서” 방식으로도 되지만,
// 확실하게 하려면 cheerio를 쓰는 게 맞음)
// 프로젝트에 cheerio 없으면: npm i cheerio
let cheerio;
async function getCheerio() {
  if (cheerio) return cheerio;
  try {
    const mod = await import("cheerio");
    cheerio = mod.default || mod;
    return cheerio;
  } catch (e) {
    throw new Error('cheerio가 필요합니다. "npm i cheerio" 후 배포하세요.');
  }
}

// -------------------------
// A안: “상세 이미지 영역” DOM 기반 추출
// -------------------------
function extractByDom(html) {
  // 1) 상세영역 후보 셀렉터(실제 운영 중에 가장 흔한 케이스들)
  // - m.vvic 기준으로 상세 컨테이너가 다양해서 여러 후보를 둠
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

  // 2) 대표이미지(갤러리) 후보 셀렉터
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
      if (out.length > 0) break; // 첫 번째로 잡히는 “제대로 된 영역”을 우선
    }
    return uniq(out);
  };

  const main = pickUrlsFromSelectors(MAIN_SELECTORS);
  const detail = pickUrlsFromSelectors(DETAIL_SELECTORS);

  return { main, detail };
}

// HTML 내 스크립트/문자열에서 upload URL을 긁어오는 백업(최후 fallback)
// ※ DOM에서 안 잡힐 때만 사용
function extractByRegexFallback(html) {
  const re = /https?:\/\/img\d*\.vvic\.com\/upload\/[^"'\\\s>]+?\.(?:jpg|jpeg|png|webp)(\?[^"'\\\s>]*)?/gi;
  const found = html.match(re) || [];
  return uniq(found.map(toAbs).filter(isRealVvicImage));
}

// -------------------------
// Routes
// -------------------------

// GET /api/vvic/extract?url=...
router.get("/extract", async (req, res) => {
  try {
    const rawUrl = String(req.query.url || "").trim();
    if (!rawUrl) return res.status(400).json({ ok: false, error: "url_required" });

    const url = normalizeVvicUrl(rawUrl);

    const { status, text: html } = await fetchHtml(url);
    if (!html || html.length < 200) {
      return res.status(500).json({ ok: false, error: "empty_html", status, url });
    }

    const ch = await getCheerio();
    // cheerio 전역 할당
    cheerio = ch;

    // ✅ A안 DOM 기반 (상세영역 우선)
    let { main, detail } = extractByDom(html);

    // ✅ 둘 중 하나라도 비면, regex 백업으로 보강
    if (main.length === 0 || detail.length === 0) {
      const all = extractByRegexFallback(html);
      // main이 비면 앞쪽 일부를 main으로
      if (main.length === 0) main = all.slice(0, Math.min(12, all.length));
      // detail이 비면 main 제외하고 나머지 detail로
      if (detail.length === 0) {
        const mainSet = new Set(main);
        detail = all.filter((u) => !mainSet.has(u));
      }
    }

    // 마지막으로 혹시 섞인 로고/정적 제거 + 중복 제거
    main = uniq(main).filter(isRealVvicImage);
    detail = uniq(detail).filter(isRealVvicImage);

    // 그래도 아무것도 없으면, 디버그 힌트
    if (main.length === 0 && detail.length === 0) {
      return res.status(200).json({
        ok: true,
        url,
        main_images: [],
        detail_images: [],
        counts: { total: 0, main: 0, detail: 0 },
        hint: "DOM/regex 모두에서 img*.vvic.com/upload 이미지를 찾지 못했습니다. (로그인/차단/구조변경 가능)",
      });
    }

    return res.status(200).json({
      ok: true,
      url,
      main_images: main,
      detail_images: detail,
      counts: { total: main.length + detail.length, main: main.length, detail: detail.length },
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
    const url = normalizeVvicUrl(rawUrl);
    const { status, text: html } = await fetchHtml(url);

    const sampleUpload = extractByRegexFallback(html).slice(0, 20);

    res.status(200).json({
      ok: true,
      url,
      status,
      html_len: html?.length || 0,
      sample_upload_urls: sampleUpload,
      note: "upload 이미지가 여기 샘플로 안 나오면(0개) HTML 자체가 이미지 데이터를 안 주는 상태(로그인/차단/리다이렉트)일 가능성 큼",
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;
