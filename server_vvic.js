import express from "express";

const router = express.Router();

// ==================================================================
// 1. 유틸리티 함수 (기존 기능 보존 + 강화)
// ==================================================================

// 중복 제거
function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

// 절대 경로 변환
function toAbs(url) {
  if (!url) return "";
  let clean = url.trim().replace(/\\/g, ""); // JSON 역슬래시 제거
  if (clean.startsWith("//")) return "https:" + clean;
  if (clean.startsWith("/")) return "https://www.vvic.com" + clean;
  return clean;
}

// VVIC 상품 ID 추출
function extractItemId(inputUrl) {
  if (!inputUrl) return "";
  try {
    // 1) URL 경로에서 추출 (/item/12345)
    const match = inputUrl.match(/\/item\/(\d+)/);
    if (match) return match[1];
    
    // 2) 쿼리 파라미터 등 다른 패턴 대응
    const parsed = new URL(toAbs(inputUrl));
    const pathParts = parsed.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    return /^\d+$/.test(id) ? id : "unknown";
  } catch {
    return "unknown";
  }
}

// URL 정규화
function normalizeVvicUrl(rawUrl) {
  if (!rawUrl) return "";
  let url = toAbs(rawUrl);
  // 불필요한 파라미터 제거
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

// ⭐ [핵심] VVIC 진짜 이미지 판별 (엄격 모드)
function isRealVvicImage(u) {
  if (!u) return false;
  const url = toAbs(u);

  // 1. 제외 대상 (아이콘, 로고, 로딩바, 빈 이미지)
  if (url.includes("src.vvic.com/statics")) return false; // 정적 자원
  if (url.includes("/statics/")) return false;
  if (url.includes("loading")) return false;
  if (url.includes("blank.gif")) return false;
  if (url.includes("logo")) return false;

  // 2. 필수 포함 (upload 경로 + 확장자)
  // 예: https://img.vvic.com/upload/12345.jpg
  const hasUpload = url.includes("/upload/");
  const isImage = /\.(jpg|jpeg|png|webp|gif)/i.test(url);
  
  return hasUpload && isImage;
}

// 이미지 URL 청소 (썸네일 -> 원본)
function cleanVvicUrl(url) {
  let clean = toAbs(url);
  // _300x300.jpg 같은 리사이징 제거
  return clean.replace(/_\d+x\d+.*$/, "").replace(/\.jpg_.*$/, ".jpg");
}

// ==================================================================
// 2. 데이터 가져오기 (Fetch)
// ==================================================================

async function fetchText(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.vvic.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Cookie": "lang=zh-CN; currency=CNY;", // 중국어 강제
        ...headers,
      },
    });
    
    clearTimeout(timeout);
    
    const text = await res.text();
    return {
      status: res.status,
      ok: res.ok,
      text,
      final_url: res.url,
      content_type: res.headers.get("content-type"),
    };
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ==================================================================
// 3. ⭐ [엔진] 강력한 정규식 추출기 (JSON 파싱 포함)
// ==================================================================

function extractByRegexFallback(html) {
  if (!html) return [];
  const images = new Set();

  // 전략 A: JSON 데이터 내의 이스케이프된 URL 찾기 (\/upload\/...)
  // VVIC는 HTML 내의 <script> 태그 안에 이미지 정보를 숨겨두는 경우가 많음
  const jsonRegex = /(?:https?:|\\u002F\\u002F|\/\/|\\\/\\\/)?[a-zA-Z0-9.-]*\.vvic\.com(?:\\\/|\/)upload(?:\\\/|\/)[^"'\s)<>]+/gi;
  const jsonMatches = html.match(jsonRegex) || [];
  
  jsonMatches.forEach(raw => {
    const clean = cleanVvicUrl(raw);
    if (isRealVvicImage(clean)) images.add(clean);
  });

  // 전략 B: 일반 <img> 태그 src 찾기 (보조 수단)
  const imgTagRegex = /<img[^>]+src=['"]([^'"]+)['"]/gi;
  let match;
  while ((match = imgTagRegex.exec(html)) !== null) {
    const clean = cleanVvicUrl(match[1]);
    if (isRealVvicImage(clean)) images.add(clean);
  }

  // 전략 C: data-src 속성 (Lazy Load 대응)
  const dataSrcRegex = /data-src=['"]([^'"]+)['"]/gi;
  while ((match = dataSrcRegex.exec(html)) !== null) {
    const clean = cleanVvicUrl(match[1]);
    if (isRealVvicImage(clean)) images.add(clean);
  }

  return Array.from(images);
}


// ==================================================================
// 4. API 라우트 정의
// ==================================================================

// GET /api/vvic?url=...
router.get("/", async (req, res) => {
  const api_hit = Date.now();
  const rawUrl = req.query.url;

  // 1. URL 검증
  if (!rawUrl) {
    return res.status(400).json({ ok: false, error: "url_required" });
  }

  const url = normalizeVvicUrl(rawUrl);
  const itemId = extractItemId(url);

  console.log(`🔍 [VVIC] 추출 요청: ${itemId} (${url})`);

  try {
    // 2. HTML 다운로드
    const { ok, status, text: html, final_url, content_type } = await fetchText(url);

    if (!ok) {
      return res.status(status).json({ 
        ok: false, 
        error: `fetch_error_${status}`,
        meta: { url, final_url } 
      });
    }

    // 3. 이미지 추출 (업그레이드된 엔진 사용)
    const allImages = extractByRegexFallback(html);
    console.log(`   └─ 발견된 이미지: ${allImages.length}장`);

    if (allImages.length === 0) {
      // 이미지가 없으면 404 처리 (프론트엔드에서 알림 띄우도록)
      return res.status(404).json({
        ok: false,
        error: "no_images_found",
        meta: { url, itemId, html_len: html.length }
      });
    }

    // 4. 대표/상세 분류
    // VVIC 특성상 상단 5장은 대표(Main), 나머지는 상세(Detail)일 확률이 높음
    // (만약 VVIC가 별도 필드로 구분한다면 로직 추가 가능하지만, 현재는 이 방식이 가장 안전)
    let main = [];
    let detail = [];

    if (allImages.length <= 5) {
      main = allImages; // 이미지가 적으면 다 대표로
    } else {
      main = allImages.slice(0, 5);
      detail = allImages.slice(5);
    }

    // 5. 최종 응답 (기존 포맷 유지)
    return res.status(200).json({
      ok: true,
      url,
      // 프론트엔드 호환성을 위해 객체 배열로 변환
      main_media: main.map(u => ({ type: "image", url: u })),
      detail_media: detail.map(u => ({ type: "image", url: u })),
      
      // 구형 클라이언트 호환성 (문자열 배열)
      main_images: main,
      detail_images: detail,
      
      counts: { 
        total: main.length + detail.length, 
        main: main.length, 
        detail: detail.length 
      },
      meta: { 
        dom: false, // 이제 Regex 방식이므로 DOM 파싱 안 함
        itemId, 
        final_url, 
        content_type, 
        api_hit 
      },
    });

  } catch (e) {
    console.error("❌ [VVIC] 처리 중 에러:", e);
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
      meta: { url, itemId }
    });
  }
});

// GET /api/vvic/_debug?url=... (디버그용, 기존 기능 유지)
router.get("/_debug", async (req, res) => {
  try {
    const rawUrl = String(req.query.url || "").trim();
    const url = normalizeVvicUrl(rawUrl);
    
    const { status, text: html } = await fetchText(url, {
      "Referer": "https://m.vvic.com/", // 모바일 페이지 테스트용
    });

    const foundImages = extractByRegexFallback(html);

    res.status(200).json({
      ok: true,
      debug: true,
      target_url: url,
      status,
      html_length: html?.length || 0,
      found_count: foundImages.length,
      images_preview: foundImages.slice(0, 20), // 너무 길지 않게 20개만
      html_head: (html || "").slice(0, 500) // HTML 앞부분 미리보기
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
