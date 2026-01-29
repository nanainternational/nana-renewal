import { Router } from "express";

// Node 18+ global fetch 사용 (Render Node >=18)


// ==================================================================
// 🟣 1688 확장프로그램 수신용 (서버 메모리 임시 저장)
// ==================================================================
let latestProductData: any = null;

const alibaba1688Router = Router();

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
      data_count:
        latestProductData.main_media.length + latestProductData.detail_media.length,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// [웹] 최신 저장 데이터 조회
alibaba1688Router.get("/latest", (req, res) => {
  if (!latestProductData) {
    return res.json({
      ok: false,
      message: "아직 추출된 데이터가 없습니다. 확장프로그램을 먼저 실행해주세요.",
    });
  }
  return res.json({ ok: true, ...latestProductData });
});



// ------------------------------------------------------------------
// 🟣 이미지 프록시 (핫링크/403/CORS 우회용)
// - 사용처: 프론트에서 /api/1688/proxy/image?url=... 로 호출
// - 기능: 원본 이미지를 서버에서 받아 그대로 스트리밍
// ------------------------------------------------------------------
alibaba1688Router.get("/proxy/image", async (req, res) => {
  try {
    const raw = String(req.query.url || "");
    if (!raw) return res.status(400).json({ ok: false, error: "url required" });

    // 기본 방어: http(s)만 허용
    if (!/^https?:\/\//i.test(raw)) {
      return res.status(400).json({ ok: false, error: "invalid url" });
    }

    // upstream fetch (Referer 붙여 403 방지)
    const upstream = await fetch(raw, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://detail.1688.com/",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        ok: false,
        error: `upstream ${upstream.status}`,
      });
    }

    // content-type 전달
    const ct = upstream.headers.get("content-type") || "";
    if (ct) res.setHeader("Content-Type", ct);

    // 캐시/보안 헤더
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    // stream
    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.status(200).send(buf);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default alibaba1688Router;
