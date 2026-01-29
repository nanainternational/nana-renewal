import { Router } from "express";

// ==================================================================
// 🟣 1688 확장프로그램 수신용 (서버 메모리 임시 저장)
// ==================================================================
let latestProductData: any = null;

const alibaba1688Router = Router();

const PROXY_PATH = "/api/1688/proxy/image";

// 이미지 URL 필터(불필요한 아이콘/뱃지/평점 등 제거)
function isLikelyProductImage(u: string) {
  const s = String(u || "");
  if (!s) return false;

  // 대표/상세에 섞여 들어오는 아이콘, 로고, 평점, 88x88 썸네일 등 제거
  if (s.includes("tps-") || s.includes("rate.jpg") || s.includes("_88x88")) return false;
  if (s.includes("favicon") || s.includes("logo") || s.includes("TB1")) return false;

  // 1688 상품 이미지에 자주 나오는 도메인/경로
  return (
    s.includes("cbu01.alicdn.com/img/ibank/") ||
    s.includes("img.alicdn.com/imgextra/") ||
    s.includes("img.alicdn.com/img/ibank/")
  );
}

function toProxyUrl(raw: string) {
  const u = String(raw || "").trim();
  if (!u) return "";
  // 이미 프록시라면 그대로
  if (u.includes(PROXY_PATH)) return u;
  // 프로토콜 없는 경우 보정
  const fixed = u.startsWith("//") ? "https:" + u : u;
  return `${PROXY_PATH}?url=${encodeURIComponent(fixed)}`;
}

// [Legacy] 서버 직접 추출 (차단 안내)
alibaba1688Router.get("/extract", async (req, res) => {
  return res.json({
    ok: true,
    product_name: "1688 상품 데이터",
    main_media: [],
    detail_media: [],
    source: "server_fetch",
    message: "서버 직접 추출은 차단될 수 있습니다. 확장프로그램을 사용하세요.",
  });
});

// ==================================================================
// 🟣 이미지 프록시 (CORS/Referer 문제 회피)
// ==================================================================
alibaba1688Router.get("/proxy/image", async (req, res) => {
  try {
    const target = String(req.query.url || "").trim();
    if (!target) return res.status(400).send("url required");

    // 프로토콜 없는 URL 보정
    const fixed = target.startsWith("//") ? "https:" + target : target;

    const upstream = await fetch(fixed, {
      headers: {
        // 일부 alicdn 리소스는 referer/ua 없으면 막히거나 깨지는 경우가 있음
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        referer: "https://detail.1688.com/",
        origin: "https://detail.1688.com",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      // Render/Node 환경에서 keepalive 불필요
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send(await upstream.text().catch(() => "upstream error"));
    }

    const ct = upstream.headers.get("content-type") || "";
    const buf = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", ct || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");
    // 이미지 태그/캔버스/zip 다운로드 모두 막히지 않게
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).send(buf);
  } catch (e: any) {
    return res.status(500).send(e?.message || String(e));
  }
});

// [확장프로그램] 데이터 수신 및 저장
alibaba1688Router.post("/extract_client", (req, res) => {
  try {
    const { url, product_name, main_media, detail_media } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: "url required" });

    latestProductData = {
      url,
      product_name: product_name || "1688 상품 데이터",
      main_media: Array.isArray(main_media) ? main_media : [],
      detail_media: Array.isArray(detail_media) ? detail_media : [],
      source: "client_extension",
      timestamp: new Date().toISOString(),
    };

    return res.json({
      ok: true,
      message: "서버에 저장되었습니다. 웹사이트에서 불러오세요.",
      data_count: latestProductData.main_media.length + latestProductData.detail_media.length,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// [웹] 최신 저장 데이터 조회 (여기서만 프록시 변환/필터 적용)
alibaba1688Router.get("/latest", (req, res) => {
  if (!latestProductData) {
    return res.json({
      ok: false,
      message: "아직 추출된 데이터가 없습니다. 확장프로그램을 먼저 실행해주세요.",
    });
  }

  const main = (latestProductData.main_media || []).filter(isLikelyProductImage).map(toProxyUrl);
  const detail = (latestProductData.detail_media || []).filter(isLikelyProductImage).map(toProxyUrl);

  return res.json({
    ok: true,
    ...latestProductData,
    main_media: main,
    detail_media: detail,
  });
});

export default alibaba1688Router;
