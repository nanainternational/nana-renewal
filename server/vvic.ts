import type { Request, Response } from "express";
import express from "express";
import { chromium } from "playwright";
import Jimp from "jimp";

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
    // 상세 더보기 같은 버튼이 있다면 눌러서 DOM에 더 로드되게 유도(없어도 무해)
    await page.waitForTimeout(1500);
    // 스크롤로 lazy-load 이미지 로드 유도
    await page.evaluate(async () => {
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 6; i++) {
        window.scrollBy(0, Math.max(800, window.innerHeight));
        await sleep(600);
      }
      window.scrollTo(0, 0);
      await sleep(400);
    });
  } catch {}

  const html = await page.content();

  // img/srcset/background-image 등에서 URL 최대한 긁기
  const anyUrls: string[] = await page.evaluate(() => {
    const out: string[] = [];
    const push = (u: any) => {
      if (!u) return;
      const s = String(u).trim();
      if (!s) return;
      out.push(s);
    };

    // img src / data-src / data-original / srcset
    document.querySelectorAll("img").forEach((img) => {
      push((img as HTMLImageElement).src);
      push(img.getAttribute("data-src"));
      push(img.getAttribute("data-original"));
      const ss = img.getAttribute("srcset");
      if (ss) {
        ss.split(",").forEach(part => {
          const u = part.trim().split(" ")[0];
          push(u);
        });
      }
    });

    // inline style background-image
    document.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg.includes("url(")) {
        const m = bg.match(/url\(["']?(.*?)["']?\)/i);
        if (m && m[1]) push(m[1]);
      }
    });

    return out;
  });

  await page.close();
  await browser.close();
  return { html, anyUrls };
}

function extractUrlsFromHtml(html: string): string[] {
  const out: string[] = [];
  if (!html) return out;

  // src="..."
  const reSrc = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = reSrc.exec(html))) out.push(m[1]);

  // data-src="..."
  const reData = /<img[^>]+data-src=["']([^"']+)["']/gi;
  while ((m = reData.exec(html))) out.push(m[1]);

  // srcset="..."
  const reSrcset = /srcset=["']([^"']+)["']/gi;
  while ((m = reSrcset.exec(html))) {
    const ss = m[1];
    ss.split(",").forEach(part => {
      const u = part.trim().split(" ")[0];
      if (u) out.push(u);
    });
  }

  // background-image: url(...)
  const reBg = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((m = reBg.exec(html))) out.push(m[1]);

  return out;
}

function splitMainDetail(urls: string[]): { main: string[]; detail: string[] } {
  const cleaned = urls
    .map(pickClean)
    .filter(Boolean)
    .map(normalizeUrl);

  // 상품이미지 형태만 남기기
  const productOnly = cleaned.filter(isProductImage);

  // 대표/상세 분리(휴리스틱)
  // - prod/ 는 대표/상세 섞여있을 수 있어서 우선 모두 후보
  // - upload/ 는 상세에서 많이 보이는데 대표도 있을 수 있음
  // 여기서는 "대표는 위쪽 섹션에서 많이 등장한 것" 형태로 정렬만 대충
  const uniq = uniqKeepOrder(productOnly);

  // 일단 단순히 앞부분을 main 후보로, 나머지를 detail로
  // (프론트에서 선택/이동 기능이 있으니 서버는 과하게 판단하지 않음)
  const main = uniq.slice(0, Math.min(uniq.length, 20));
  const detail = uniq.slice(Math.min(uniq.length, 20));

  return { main, detail };
}

export async function apiExtract(req: Request, res: Response) {
  try {
    const url = String(req.query.url || "").trim();
    if (!url) return res.status(400).json({ ok: false, error: "url이 비었습니다." });

    const { html, anyUrls } = await fetchDomMediaByPlaywright(url);
    const htmlUrls = extractUrlsFromHtml(html);
    const all = [...anyUrls, ...htmlUrls];

    // canonicalKey 기준 중복 제거(쿼리 제거)
    const map = new Map<string, string>();
    for (const u of all) {
      const clean = pickClean(u);
      if (!clean) continue;
      const key = canonicalKey(clean);
      if (!map.has(key)) map.set(key, clean);
    }

    const merged = Array.from(map.values());
    const { main, detail } = splitMainDetail(merged);

    return res.json({
      ok: true,
      main_images: main,
      detail_images: detail,
      counts: { any: anyUrls.length, html: htmlUrls.length, merged: merged.length, main: main.length, detail: detail.length },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// --- AI 생성(기존 로직 유지: 실제 프로젝트에서 쓰는 쪽과 맞춰서 사용)
export async function apiAiGenerate(req: Request, res: Response) {
  try {
    // 여기 로직은 프로젝트에서 이미 연결해둔 AI 호출/프롬프트 방식이 있을 수 있어
    // 현재 파일 업로드 기준으로는 상세가 길어서 그대로 유지합니다(필요하면 다음 단계에서 붙임)
    return res.status(501).json({ ok: false, error: "ai는 현재 이 파일에서 샘플로만 존재합니다. 프로젝트의 실제 ai 연결 로직에 맞춰 붙이세요." });
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

    const picked = urls.map(u => String(u || "").trim()).filter(Boolean).slice(0, MAX_IMAGES);
    if (!picked.length) {
      return res.status(400).json({ ok: false, error: "유효한 이미지가 없습니다." });
    }

    // CORS 자체는 브라우저 이미지 로드에서만 문제. stitch는 서버에서 처리하지만,
    // 프론트에서 결과를 안전하게 받도록 응답 CORS 헤더는 열어둠(프로젝트 전반 CORS 설정이 있으면 중복돼도 무해).
    res.setHeader("Access-Control-Allow-Origin", "*");

    async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        return await fetch(url, {
          signal: ctrl.signal,
          headers: {
            // VVIC/일부 CDN은 Referer 없으면 막는 경우가 있어 넣어둠
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
        return res
          .status(400)
          .json({ ok: false, error: `이미지 다운로드 실패: ${r.status} ${url}` });
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

      // 폭을 제한해서 메모리/합성 속도 안정화
      if (img.bitmap.width > MAX_WIDTH) {
        img = img.resize(MAX_WIDTH, Jimp.AUTO);
      }

      imgs.push(img);
    }

    if (!imgs.length) {
      return res.status(400).json({ ok: false, error: "유효한 이미지가 없습니다." });
    }

    // 세로로 이어붙이기: 최대 폭에 맞춰 리사이즈 후 합성
    const maxW = Math.max(...imgs.map((i) => i.bitmap.width));
    const resized = imgs.map((img) => {
      if (img.bitmap.width === maxW) return img;
      // 비율 유지하면서 폭만 맞춤
      return img.resize(maxW, Jimp.AUTO);
    });

    const totalH = resized.reduce((acc, img) => acc + img.bitmap.height, 0);
    if (totalH > MAX_TOTAL_HEIGHT) {
      return res.status(400).json({
        ok: false,
        error: `이미지가 너무 길어 합성할 수 없습니다. (총 높이 ${totalH}px) 선택 수를 줄이거나 이미지를 줄여주세요.`,
      });
    }

    // 흰 배경 캔버스
    const canvas = new Jimp(maxW, totalH, 0xffffffff);

    let y = 0;
    for (const img of resized) {
      canvas.composite(img, 0, y);
      y += img.bitmap.height;
    }

    // 품질/용량 안정화
    canvas.quality(90);

    const out = await canvas.getBufferAsync(Jimp.MIME_JPEG);

    // 자동 다운로드되도록 attachment 헤더 추가
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", 'attachment; filename="vvic_detail.jpg"');
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(out);
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: e?.message || String(e) || "stitch 실패" });
  }
}

export const vvicRouter = express.Router();
vvicRouter.get("/extract", apiExtract);
vvicRouter.post("/ai", express.json({ limit: "2mb" }), apiAiGenerate);
vvicRouter.post("/stitch", express.json({ limit: "5mb" }), apiStitch);

export default vvicRouter;
