import express from "express";
const router = express.Router();

// ==================================================================
// 🛠️ [유틸리티] URL 정리 및 정규화 Helper
// ==================================================================

// 1. URL 절대경로 변환
function toAbs(url) {
  if (!url) return "";
  let clean = url.trim().replace(/\\/g, ""); // JSON 내의 역슬래시 제거
  if (clean.startsWith("//")) return "https:" + clean;
  if (clean.startsWith("/")) return "https://www.vvic.com" + clean;
  return clean;
}

// 2. VVIC 이미지 유효성 검사 (엄격 모드)
function isRealVvicImage(u) {
  if (!u) return false;
  const url = toAbs(u);
  
  // 로고, 아이콘, 정적 리소스 제외
  if (url.includes("src.vvic.com/statics")) return false;
  if (url.includes("/statics/")) return false;
  if (url.includes("loading")) return false;
  if (url.includes("blank.gif")) return false;
  
  // 반드시 /upload/ 경로가 있어야 상품 이미지임
  // 예: https://img.vvic.com/upload/12345.jpg
  return url.includes("/upload/") && /\.(jpg|jpeg|png|webp|gif)/i.test(url);
}

// 3. 썸네일 주소 제거하고 원본 주소로 변환
function cleanVvicUrl(url) {
  let clean = toAbs(url);
  // _300x300.jpg 같은 리사이징 접미사 제거
  return clean.replace(/_\d+x\d+.*$/, "").replace(/\.jpg_.*$/, ".jpg");
}

// 4. HTML 가져오기 (헤더 강화)
async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.vvic.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Cookie": "lang=zh-CN; currency=CNY;" // 중국어/위안화 강제
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (e) {
    console.error(`[Fetch Error] ${url}:`, e.message);
    return "";
  }
}

// 5. 상품 ID 추출
function extractItemId(inputUrl) {
  try {
    // URL 마지막 숫자 추출 시도
    const match = inputUrl.match(/\/item\/(\d+)/);
    return match ? match[1] : "unknown";
  } catch (e) {
    return "unknown";
  }
}

// ==================================================================
// 🕵️ [핵심 엔진] 이미지 추출 로직 (Regex 방식)
// ==================================================================
function extractImagesFromHtml(html) {
  const images = new Set();
  
  // 전략 1: JSON 문자열 내의 이미지 찾기 (가장 강력함)
  // VVIC는 HTML 안에 JSON 데이터를 숨겨둠. (\/upload\/ 패턴)
  const jsonRegex = /(?:https?:|\\u002F\\u002F|\/\/|\\\/\\\/)?[a-zA-Z0-9.-]*\.vvic\.com(?:\\\/|\/)upload(?:\\\/|\/)[^"'\s)<>]+/gi;
  const matches = html.match(jsonRegex) || [];
  
  matches.forEach(raw => {
    // JSON 이스케이프 문자(\/) 제거 및 정리
    const clean = cleanVvicUrl(raw);
    if (isRealVvicImage(clean)) {
      images.add(clean);
    }
  });

  // 전략 2: 일반 img 태그 src 찾기 (보조)
  const imgTagRegex = /<img[^>]+src=['"]([^'"]+)['"]/gi;
  let tagMatch;
  while ((tagMatch = imgTagRegex.exec(html)) !== null) {
    const clean = cleanVvicUrl(tagMatch[1]);
    if (isRealVvicImage(clean)) {
      images.add(clean);
    }
  }

  return Array.from(images);
}

// ==================================================================
// 🚀 [API] 메인 추출 라우트
// ==================================================================
router.get("/", async (req, res) => {
  // 클라이언트가 /api/vvic?url=... 형태로 요청
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ ok: false, error: "URL required" });
  }

  console.log(`🔍 [VVIC] 추출 요청: ${targetUrl}`);

  try {
    // 1. HTML 다운로드
    const html = await fetchHtml(targetUrl);
    
    if (!html || html.length < 500) {
      throw new Error("페이지를 불러올 수 없습니다 (HTML 비어있음)");
    }

    // 2. 이미지 추출 (강력한 Regex 엔진 사용)
    const allImages = extractImagesFromHtml(html);
    console.log(`   └─ 발견된 이미지: ${allImages.length}장`);

    if (allImages.length === 0) {
      return res.status(404).json({ ok: false, error: "이미지를 찾을 수 없습니다." });
    }

    // 3. 대표/상세 분류
    // VVIC는 보통 이미지 순서대로 나옵니다.
    // 처음 5장을 대표(Main)로, 나머지를 상세(Detail)로 분류합니다.
    const mainImages = allImages.slice(0, 5);
    const detailImages = allImages.slice(5);

    // 4. 결과 반환
    return res.json({
      ok: true,
      url: targetUrl,
      product_name: "VVIC 상품 (상세페이지 확인 필요)",
      main_media: mainImages.map(u => ({ type: "image", url: u })),
      detail_media: detailImages.map(u => ({ type: "image", url: u })),
      data_count: allImages.length,
      item_id: extractItemId(targetUrl)
    });

  } catch (e) {
    console.error("❌ [VVIC] 처리 중 에러:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ==================================================================
// 🛠️ [API] 디버그 라우트 (기존 기능 유지)
// ==================================================================
router.get("/_debug", async (req, res) => {
  const targetUrl = req.query.url;
  try {
    const html = await fetchHtml(targetUrl || "https://www.vvic.com");
    const images = extractImagesFromHtml(html);
    
    res.json({
      ok: true,
      debug: true,
      target_url: targetUrl,
      html_length: html.length,
      found_images_count: images.length,
      sample_images: images.slice(0, 10),
      html_preview: html.slice(0, 500)
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
