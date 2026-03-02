import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { API_BASE } from "@/lib/queryClient";

// [Type Definition]
type MediaItem = { type: "image" | "video"; url: string; checked?: boolean };
type OptionalBottomBlock = "topSize" | "bottomSize" | "washingTip";

// [Assets & Constants]
const HERO_IMAGE_PRIMARY = "/attached_assets/generated_images/aipage.png";
const HERO_IMAGE_FALLBACK = "https://raw.githubusercontent.com/nanainternational/nana-renewal/refs/heads/main/attached_assets/generated_images/aipage.png";
const HERO_TEXT_FULL = "링크 하나로 끝내는\n상세페이지 매직.";
const SIZE_LIST = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
const TOP_ITEMS = ["어깨", "가슴단면", "암홀", "소매길이", "소매통", "소매끝단면", "총장"];
const BOTTOM_ITEMS = ["허리단면", "힙단면", "허벅지단면", "밑위단면", "밑단단면", "총장"];

function sizeColumnsFromMode(mode: string): string[] {
  if (mode === "FREE") return ["FREE"];
  const n = Number(mode);
  if (!Number.isFinite(n) || n < 1) return ["FREE"];
  return SIZE_LIST.slice(0, Math.min(8, n));
}

// [Utility Functions]
function nowStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return yy + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes());
}

async function fetchSmartBlob(url: string, apiUrlStr: string): Promise<{ blob: Blob; ext: string } | null> {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      return { blob, ext: blob.type.includes('png') ? 'png' : 'jpg' };
    }
  } catch (e) {}

  try {
    const proxyRes = await fetch(apiUrlStr, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [url] }),
    });
    if (proxyRes.ok) {
      const blob = await proxyRes.blob();
      return { blob, ext: 'png' };
    }
  } catch (e) {
    console.error("다운로드 실패:", e);
  }
  return null;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  }
}


async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas Blob 생성 실패"));
    }, "image/png");
  });
}


async function decodeImageBlob(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("이미지 디코드 실패"));
        el.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 생성 실패");
      ctx.drawImage(img, 0, 0);
      const pngBlob = await canvasToBlob(canvas);
      return await createImageBitmap(pngBlob);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function stitchImagesWithFallback(urls: string[], stitchApiUrl: string): Promise<Blob> {
  let serverErrMsg = "";

  try {
    const stitchRes = await fetch(stitchApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });

    if (stitchRes.ok) {
      const ct = (stitchRes.headers.get("content-type") || "").toLowerCase();
      const bodyBlob = await stitchRes.blob();
      const blobType = (bodyBlob.type || "").toLowerCase();
      if (ct.includes("image") || blobType.includes("image")) {
        return bodyBlob;
      }
      serverErrMsg = `서버 스티치 실패(비이미지 응답: ${ct || blobType || "unknown"})`;
    } else {
      const bodyText = (await stitchRes.text().catch(() => "")).slice(0, 180).replace(/\s+/g, " ").trim();
      serverErrMsg = `서버 스티치 실패(${stitchRes.status})${bodyText ? `: ${bodyText}` : ""}`;
    }

  } catch (e: any) {
    serverErrMsg = `서버 스티치 예외: ${e?.message || "unknown"}`;
  }

  const bitmaps: ImageBitmap[] = [];
  for (const url of urls) {
    const fetched = await fetchSmartBlob(url, stitchApiUrl);
    if (!fetched) continue;
    try {
      const bitmap = await decodeImageBlob(fetched.blob);
      bitmaps.push(bitmap);
    } catch (e) {
      console.error("클라이언트 이미지 디코드 실패:", url, e);
    }
  }

  if (!bitmaps.length) {
    throw new Error(serverErrMsg || "이미지를 불러오지 못해 합치기에 실패했습니다.");
  }

  const width = Math.max(...bitmaps.map((b) => b.width));
  const totalHeight = bitmaps.reduce((sum, b) => sum + b.height, 0);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 생성 실패");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = 0;
  for (const b of bitmaps) {
    const x = Math.floor((width - b.width) / 2);
    ctx.drawImage(b, x, y);
    y += b.height;
    if (typeof b.close === "function") b.close();
  }

  return await canvasToBlob(canvas);
}


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSizeTableHtml(items: string[], cols: string[], values: Record<string, string[]>): string {
  const head = cols.map((col) => `<th>${escapeHtml(col)}</th>`).join("");
  const body = items
    .map((item) => {
      const cells = cols
        .map((_, i) => `<td>${escapeHtml((values[item] || [])[i] ?? "-")}</td>`)
        .join("");
      return `<tr><th>${escapeHtml(item)}</th>${cells}</tr>`;
    })
    .join("");
  return `<table><thead><tr><th>사이즈 (단위:cm)</th>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function buildBottomTemplateHtml(params: {
  topEnabled: boolean;
  bottomEnabled: boolean;
  washingEnabled: boolean;
  topCols: string[];
  bottomCols: string[];
  topValues: Record<string, string[]>;
  bottomValues: Record<string, string[]>;
  washingTipText: string;
}): { html: string; estimatedHeight: number } {
  const topSection = params.topEnabled
    ? `
      <div class="template-container">
        <h2>SIZE INFO</h2>
        <div class="flex-box">
          <div class="schematic-box">
            <svg viewBox="0 0 240 240" width="100%" height="240" xmlns="http://www.w3.org/2000/svg">
              <path d="M 70 50 Q 120 75 170 50 L 220 90 L 195 130 L 175 110 L 175 200 L 65 200 L 65 110 L 45 130 L 20 90 Z" fill="#fff" stroke="#ccc" stroke-width="2" stroke-linejoin="round"/>
              <path d="M 90 50 Q 120 80 150 50" fill="none" stroke="#ccc" stroke-width="2"/>
              <line x1="70" y1="35" x2="170" y2="35" stroke="#ff6b6b" stroke-width="1.5" stroke-dasharray="4"/>
              <text x="120" y="28" font-size="11" text-anchor="middle" fill="#ff6b6b">어깨</text>
              <line x1="65" y1="120" x2="175" y2="120" stroke="#4dabf7" stroke-width="1.5" stroke-dasharray="4"/>
              <text x="120" y="115" font-size="11" text-anchor="middle" fill="#4dabf7">가슴단면</text>
              <line x1="185" y1="50" x2="185" y2="200" stroke="#20c997" stroke-width="1.5" stroke-dasharray="4"/>
              <text x="210" y="130" font-size="11" text-anchor="middle" fill="#20c997">총장</text>
              <line x1="170" y1="50" x2="220" y2="90" stroke="#fcc419" stroke-width="1.5" stroke-dasharray="4"/>
              <text x="215" y="65" font-size="11" text-anchor="middle" fill="#fcc419">소매</text>
            </svg>
            <div class="schematic-caption">* 측정 방법에 따라 오차가 발생할 수 있습니다.</div>
          </div>
          <div style="flex-grow:1;">${renderSizeTableHtml(TOP_ITEMS, params.topCols, params.topValues)}</div>
        </div>
        <div class="desc-text">
          <span>* 재는 위치에 따라 1~3cm 정도 오차가 있을 수 있습니다.</span>
          <span>* 신축성이 좋은 원단을 사용한 상품은 사이즈 오차 범위가 클 수 있습니다.</span>
          <span>* 표 안의 '-' 부분을 클릭하시면 바로 수치를 입력하실 수 있습니다.</span>
        </div>
      </div>`
    : "";

  const bottomSection = params.bottomEnabled
    ? `
      <div class="template-container">
        <h2>SIZE INFO</h2>
        <div class="flex-box">
          <div class="schematic-box">
            <svg viewBox="0 0 240 240" width="100%" height="240" xmlns="http://www.w3.org/2000/svg">
              <path d="M 60 40 L 180 40 L 190 200 L 130 200 L 120 100 L 110 200 L 50 200 Z" fill="#fff" stroke="#ccc" stroke-width="2" stroke-linejoin="round"/>
              <line x1="60" y1="25" x2="180" y2="25" stroke="#ff6b6b" stroke-width="1.5" stroke-dasharray="4"/>
              <text x="120" y="18" font-size="11" text-anchor="middle" fill="#ff6b6b">허리단면</text>
              <line x1="55" y1="80" x2="185" y2="80" stroke="#4dabf7" stroke-width="1.5" stroke-dasharray="4"/>
              <text x="120" y="75" font-size="11" text-anchor="middle" fill="#4dabf7">힙단면</text>
              <line x1="53" y1="110" x2="118" y2="110" stroke="#fcc419" stroke-width="1.5" stroke-dasharray="4"/>
              <text x="85" y="105" font-size="11" text-anchor="middle" fill="#fcc419">허벅지</text>
              <line x1="200" y1="40" x2="200" y2="200" stroke="#20c997" stroke-width="1.5" stroke-dasharray="4"/>
              <text x="225" y="125" font-size="11" text-anchor="middle" fill="#20c997">총장</text>
            </svg>
            <div class="schematic-caption">* 측정 방법에 따라 오차가 발생할 수 있습니다.</div>
          </div>
          <div style="flex-grow:1;">${renderSizeTableHtml(BOTTOM_ITEMS, params.bottomCols, params.bottomValues)}</div>
        </div>
        <div class="desc-text">
          <span>* 재는 위치에 따라 1~3cm 정도 오차가 있을 수 있습니다.</span>
          <span>* 허리 단면 사이즈 측정은 허리 앞, 뒷면을 수평으로 눕혀 측정합니다.</span>
        </div>
      </div>`
    : "";

  const washing = params.washingEnabled
    ? `
      <div class="template-container">
        <div class="notice-banner"><span>🚨</span> 리오더 회차에 따라 부속품(단추, 지퍼, 버클 등)의 색상 및 디테일은 상이할 수 있습니다.</div>
        <div class="washing-tip-box">
          <div class="tip-header">
            <h3>FABRIC WASHING TIP</h3>
            <p>모든 의류의 첫 세탁은 드라이 크리닝을 추천해 드립니다.</p>
            <span>${escapeHtml(params.washingTipText)}</span>
          </div>
        </div>
      </div>`
    : "";

  const html = `
    <div class="root">${topSection}${bottomSection}${washing}</div>
  `;
  let estimatedHeight = 40;
  if (params.topEnabled) estimatedHeight += 960;
  if (params.bottomEnabled) estimatedHeight += 900;
  if (params.washingEnabled) estimatedHeight += 520;
  return { html, estimatedHeight };
}

async function renderHtmlSectionToBitmap(width: number, html: string, height: number): Promise<ImageBitmap> {
  const documentHtml = `
  <div xmlns="http://www.w3.org/1999/xhtml">
    <style>
      * { box-sizing:border-box; margin:0; padding:0; }
      .root { font-family: Pretendard, Arial, sans-serif; background: #f0f2f5; padding: 20px 0; }
      .template-container { max-width: 860px; margin: 0 auto 40px auto; background: #fff; padding: 48px; border-radius: 20px; }
      h2 { font-size: 36px; font-weight: 800; margin-bottom: 30px; color: #111; display: flex; align-items: center; gap: 12px; }
      h2::before { content: ''; display: block; width: 4px; height: 26px; background-color: #111; }
      .flex-box { display: flex; gap: 30px; margin-bottom: 24px; align-items: stretch; }
      .schematic-box { width: 320px; background-color: #fafafa; border-radius: 12px; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:20px; }
      .schematic-caption { font-size: 14px; color: #777; margin-top: 10px; }
      table { width:100%; border-collapse: collapse; text-align:center; font-size:20px; }
      th, td { padding: 14px 10px; border-bottom: 1px solid #eaeaea; }
      th { font-weight: 700; color: #666; text-align: left; width: 25%; }
      td { color: #222; font-weight: 600; }
      .desc-text { font-size: 16px; color: #777; line-height: 1.7; background:#fafafa; padding: 20px; border-radius: 8px; }
      .desc-text span { display:block; margin-bottom:5px; }
      .notice-banner { background: #ffebee; color:#d32f2f; padding:18px; text-align:center; font-size:20px; font-weight:700; margin-bottom:20px; border-radius:8px; display:flex; justify-content:center; align-items:center; gap:10px; }
      .washing-tip-box { background:#111; color:#fff; border-radius:20px; padding:60px 40px; }
      .tip-header { text-align:center; }
      .tip-header h3 { font-size:44px; margin-bottom:15px; font-weight:700; }
      .tip-header p { font-size:28px; font-weight:700; margin-bottom:15px; color:#f0c37b; }
      .tip-header span { font-size:22px; color:#ddd; line-height:1.6; }
    </style>
    ${html}
  </div>`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">${documentHtml}</foreignObject>
    </svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  return await decodeImageBlob(blob);
}

function wrapText(
  ctx: CanvasRenderingContext2D, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number, 
  lineHeight: number,
  measureOnly = false
) {
  const words = text.split('');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    if (words[n] === '\n') {
        if (!measureOnly) ctx.fillText(line, x, currentY);
        line = '';
        currentY += lineHeight;
        continue;
    }
    const testLine = line + words[n];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      if (!measureOnly) ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (!measureOnly) ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

export default function VvicDetailPage() {
  // [State] URL & Status
  const [urlInput, setUrlInput] = useState("");
  const [status, setStatus] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [topBusyText, setTopBusyText] = useState("");
  const progressTimerRef = useRef<number | null>(null);

  // [State] Media Items
  const [mainItems, setMainItems] = useState<MediaItem[]>([]);
  const [detailImages, setDetailImages] = useState<MediaItem[]>([]);
  const [detailVideos, setDetailVideos] = useState<MediaItem[]>([]);

  // [State] AI Data
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProductName, setAiProductName] = useState("");
  const [aiEditor, setAiEditor] = useState("");
  const [aiCoupangKeywords, setAiCoupangKeywords] = useState<string[]>([]);
  const [aiAblyKeywords, setAiAblyKeywords] = useState<string[]>([]);

  // [State] Hero UI
  const [heroTyped, setHeroTyped] = useState("");
  const [heroTypingOn, setHeroTypingOn] = useState(true);
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE_PRIMARY);
  const [optionalBottomBlocks, setOptionalBottomBlocks] = useState<Record<OptionalBottomBlock, boolean>>({
    topSize: true,
    bottomSize: true,
    washingTip: true,
  });
  const [topSizeMode, setTopSizeMode] = useState("FREE");
  const [bottomSizeMode, setBottomSizeMode] = useState("2");
  const [topSizeValues, setTopSizeValues] = useState<Record<string, string[]>>(() => {
    const initCols = sizeColumnsFromMode("FREE").length;
    return Object.fromEntries(TOP_ITEMS.map((item) => [item, Array(initCols).fill("-")]));
  });
  const [bottomSizeValues, setBottomSizeValues] = useState<Record<string, string[]>>(() => {
    const initCols = sizeColumnsFromMode("2").length;
    return Object.fromEntries(BOTTOM_ITEMS.map((item) => [item, Array(initCols).fill("-")]));
  });
  const [washingTipText, setWashingTipText] = useState("모든 의류의 첫 세탁은 드라이 크리닝을 권장합니다.");

  const urlCardRef = useRef<HTMLDivElement | null>(null);

  const bottomBlockMeta: Array<{ key: OptionalBottomBlock; title: string; desc: string }> = [
    { key: "topSize", title: "상의 사이즈 섹션", desc: "어깨/가슴/소매/총장 사이즈 표" },
    { key: "bottomSize", title: "하의 사이즈 섹션", desc: "허리/힙/허벅지/총장 사이즈 표" },
    { key: "washingTip", title: "원단별 세탁 가이드", desc: "FABRIC WASHING TIP 및 고지 배너" },
  ];

  function setBottomBlockEnabled(block: OptionalBottomBlock, enabled: boolean) {
    setOptionalBottomBlocks((prev) => ({
      ...prev,
      [block]: enabled,
    }));
  }

  function changeSizeMode(
    mode: string,
    setMode: (v: string) => void,
    items: string[],
    values: Record<string, string[]>,
    setValues: (v: Record<string, string[]>) => void,
  ) {
    setMode(mode);
    const nextCols = sizeColumnsFromMode(mode).length;
    const nextValues: Record<string, string[]> = {};
    for (const item of items) {
      const prev = values[item] || [];
      const resized = Array.from({ length: nextCols }, (_, idx) => (prev[idx] ?? "-") || "-");
      nextValues[item] = resized;
    }
    setValues(nextValues);
  }

  function onSizeValueChange(
    item: string,
    colIndex: number,
    val: string,
    values: Record<string, string[]>,
    setValues: (v: Record<string, string[]>) => void,
  ) {
    const safe = val.trim() === "" ? "-" : val.trim();
    setValues({
      ...values,
      [item]: (values[item] || []).map((x, i) => (i === colIndex ? safe : x)),
    });
  }

  function renderSizeTableEditor(
    title: string,
    mode: string,
    items: string[],
    values: Record<string, string[]>,
    setMode: (v: string) => void,
    setValues: (v: Record<string, string[]>) => void,
  ) {
    const cols = sizeColumnsFromMode(mode);
    return (
      <div className="optional-editor-table-wrap">
        <p className="optional-editor-title">{title}</p>
        <div className="radio-row wrap">
          {["FREE", "2", "3", "4", "5", "6", "7", "8"].map((opt) => (
            <label className="radio-item" key={opt}>
              <input
                type="radio"
                name={`size-mode-${title}`}
                checked={mode === opt}
                onChange={() => changeSizeMode(opt, setMode, items, values, setValues)}
              />
              {opt === "FREE" ? "FREE" : `S~${SIZE_LIST[Number(opt) - 1]}`}
            </label>
          ))}
        </div>
        <div className="optional-size-grid">
          <table>
            <thead>
              <tr>
                <th>사이즈(단위:cm)</th>
                {cols.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item}>
                  <th>{item}</th>
                  {cols.map((_, idx) => (
                    <td key={`${item}-${idx}`}>
                      <input
                        value={(values[item] || [])[idx] ?? "-"}
                        onChange={(e) => onSizeValueChange(item, idx, e.target.value, values, setValues)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function apiUrl(p: string) {
    const base = String(API_BASE || "").trim().replace(/\/$/, "");
    if (!base) return p; 
    return base + (p.startsWith("/") ? p : "/" + p);
  }

  // [Effect] Hero Image Fallback

  useEffect(() => {
    const img = new Image();
    img.onload = () => {};
    img.onerror = () => {
      if (heroImageSrc !== HERO_IMAGE_FALLBACK) setHeroImageSrc(HERO_IMAGE_FALLBACK);
    };
    img.src = heroImageSrc;
  }, [heroImageSrc]);

  // [Effect] Typing Effect
  useEffect(() => {
    if (!heroTypingOn) return;
    let i = 0;
    setHeroTyped("");
    const timer = window.setInterval(() => {
      i += 1;
      setHeroTyped(HERO_TEXT_FULL.slice(0, i));
      if (i >= HERO_TEXT_FULL.length) {
        window.clearInterval(timer);
        window.setTimeout(() => setHeroTypingOn(false), 2000);
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, [heroTypingOn]);

  // [Helper] Progress Indicator
  function startProgress(steps: string[]) {
    stopProgress();
    let i = 0;
    setTopBusyText(steps[0]);
    progressTimerRef.current = window.setInterval(() => {
      i = (i + 1) % steps.length;
      setTopBusyText(steps[i]);
    }, 1200);
  }

  function stopProgress() {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setTopBusyText("");
  }

  // [Func] Fetch URL Data
  async function fetchUrlServer(url: string) {
    const steps = ["이미지 스캔 중...", "데이터 구조화 중...", "최적화 중..."];
    setUrlLoading(true);
    startProgress(steps);
    try {
      const u = (url || urlInput || "").trim();
      if (!u) { setStatus("URL을 입력해주세요."); return; }

      let parsed: URL | null = null;
      try { parsed = new URL(u); } catch {}
      const host = parsed?.hostname?.toLowerCase() || "";
      const path = parsed?.pathname || "";
      if (parsed && (host === "www.vvic.com" || host === "vvic.com") && /^\/gz\/?$/i.test(path)) {
        setStatus("/gz 페이지에서는 확장프로그램 버튼이 제한될 수 있습니다. 상품 상세 페이지(/item/...) URL을 넣어주세요.");
        return;
      }
      
      const api = apiUrl("/api/vvic/extract?url=" + encodeURIComponent(u) + "&_=" + Date.now());
      const res = await fetch(api, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.status === 304) {
        throw new Error("캐시(304) 응답으로 본문이 없습니다. 강력 새로고침 후 다시 시도해주세요.");
      }
      // ✅ 서버가 JSON 대신 index.html(text/html)을 내려주는 경우를 즉시 감지
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) {
        // Response 일부만 읽어서 디버깅 힌트 제공(전체 출력은 과도하니 제한)
        const t = await res.text();
        const head = t.slice(0, 200).replace(/\s+/g, " ").trim();
        throw new Error("서버가 JSON 대신 HTML을 반환했습니다. (/api/vvic/extract 라우팅 누락) : " + head);
      }

      let data: any = null;
      try { data = await res.json(); } catch { }
      if (!res.ok) throw new Error(data?.error || "서버 에러");
      if (!data || !data.ok) throw new Error(data?.error || "서버 응답 형식 오류");

      const mainMediaRaw = Array.isArray(data.main_media) ? data.main_media : null;
      const detailMediaRaw = Array.isArray(data.detail_media) ? data.detail_media : null;

      // ✅ 서버 응답이 예전형(main_media/detail_media) 또는 신형(main_images/detail_images) 모두 지원
      const mainFallback = Array.isArray(data.main_images) ? data.main_images : [];
      const detailFallback = Array.isArray(data.detail_images) ? data.detail_images : [];

      const mm = (mainMediaRaw || mainFallback).map((x: any) => {
        if (typeof x === "string") return { type: "image", url: x, checked: true };
        return { type: x.type === "video" ? "video" : "image", url: x.url, checked: true };
      });

      const dm = (detailMediaRaw || detailFallback).map((x: any) => {
        if (typeof x === "string") return { type: "image", url: x, checked: true };
        return { type: x.type === "video" ? "video" : "image", url: x.url, checked: true };
      });

      setMainItems(mm);
      setDetailImages(dm.filter((x: any) => x.type === "image"));
      setDetailVideos(dm.filter((x: any) => x.type === "video"));
      
      // AI 생성 시 상품명 자동 채우기 위해 초기화
      setAiProductName("");
      setStatus("데이터 추출 완료");
    } catch (e: any) {
      if (e?.message === "not_logged_in") {
        window.alert("로그인 후 이용 가능합니다");
        setStatus("로그인 후 이용 가능합니다");
      } else {
        setStatus("Error: " + e.message);
      }
    } finally {
      setUrlLoading(false);
      stopProgress();
    }
  }

  // [Func] Generate AI Content
  async function generateByAI() {
    const chosen = (mainItems || []).find((x) => x.checked && x.type === "image") || (mainItems || [])[0];
    if (!chosen) { setStatus("분석할 이미지가 없습니다."); return; }
    
    setAiLoading(true);
    startProgress(["이미지 시각 분석...", "카피라이팅 작성...", "SEO 키워드 추출..."]);
    try {
      const res = await fetch(apiUrl("/api/vvic/ai"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: chosen.url, source_url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      
      setAiProductName(data.product_name || "");
      setAiEditor(data.editor || "");
      setAiCoupangKeywords(data.coupang_keywords || []);
      setAiAblyKeywords(data.ably_keywords || []);
      setStatus("AI 생성 완료");
    } catch (e) { setStatus("AI 생성 실패"); }
    finally { setAiLoading(false); stopProgress(); }
  }

  // [Func] Merge & Download Zip
  async function handleMergeAndDownloadZip() {
    const selectedDetailUrls = detailImages.filter(x => x.checked).map(x => x.url);
    const selectedMainItems = mainItems.filter(x => x.checked && x.type === 'image');

    if (!selectedDetailUrls.length && !selectedMainItems.length) {
      setStatus("선택된 이미지가 없습니다.");
      return;
    }

    const folderName = nowStamp();
    setStatus("다운로드 패키지 생성 중...");
    setTopBusyText("이미지 패키징 중...");

    try {
      const zip = new JSZip();
      
      if (selectedDetailUrls.length > 0) {
        try {
          const stitchBlob = await stitchImagesWithFallback(selectedDetailUrls, apiUrl("/api/vvic/stitch"));
          zip.file(`stitched_${folderName}.png`, stitchBlob);
        } catch (e: any) {
          setStatus(`합친 이미지 생성 실패(원본만 저장): ${e?.message || "unknown"}`);
        }
      }

      if (selectedMainItems.length > 0) {
        for (let i = 0; i < selectedMainItems.length; i++) {
            const result = await fetchSmartBlob(selectedMainItems[i].url, apiUrl("/api/vvic/stitch"));
            if (result) zip.file(`main_${String(i+1).padStart(2,'0')}.${result.ext}`, result.blob);
        }
      }

      if (selectedDetailUrls.length > 0) {
        for (let i = 0; i < selectedDetailUrls.length; i++) {
            const result = await fetchSmartBlob(selectedDetailUrls[i], apiUrl("/api/vvic/stitch"));
            if (result) zip.file(`detail_${String(i+1).padStart(2,'0')}.${result.ext}`, result.blob);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}.zip`);
      setStatus("다운로드 완료! 압축을 풀어주세요.");
    } catch (e: any) {
      setStatus("다운로드 실패: " + e.message);
    } finally {
      setTopBusyText("");
    }
  }

  // [Func] Create Full Detail Page Design
  async function handleCreateFullDetailPage() {
    const selectedDetailUrls = detailImages.filter(x => x.checked).map(x => x.url);
    if (!selectedDetailUrls.length) {
        setStatus("선택된 상세 이미지가 없습니다.");
        return;
    }
    
    setTopBusyText("상세페이지 디자인 중...");
    setStatus("이미지 합치는 중...");

    try {
        const stitchBlob = await stitchImagesWithFallback(selectedDetailUrls, apiUrl("/api/vvic/stitch"));
        const imgBitmap = await decodeImageBlob(stitchBlob);
        
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 생성 실패");

        const contentWidth = imgBitmap.width;
        const canvasWidth = contentWidth; 
        
        const bgColor = "#ffffff";
        const titleColor = "#111111";
        const editorColor = "#555555";
        const pointColor = "#FEE500";
        
        const titleFontSize = Math.max(40, Math.floor(canvasWidth / 14)); 
        const editorFontSize = Math.max(24, Math.floor(canvasWidth / 28));
        
        const paddingX = Math.floor(canvasWidth * 0.08); 
        const paddingTop = Math.floor(canvasWidth * 0.12);
        const gapTitleEditor = Math.floor(canvasWidth * 0.06); 
        const gapEditorImage = Math.floor(canvasWidth * 0.12);
        const dividerWidth = Math.floor(canvasWidth * 0.08);
        const dividerHeight = Math.max(3, Math.floor(canvasWidth * 0.006)); 

        const dummyCanvas = document.createElement("canvas");
        const dummyCtx = dummyCanvas.getContext("2d");
        let headerHeight = 0;

        if (dummyCtx && (aiProductName || aiEditor)) {
            dummyCtx.font = `800 ${titleFontSize}px Pretendard, sans-serif`;
            const h1 = aiProductName ? wrapText(dummyCtx, aiProductName, 0, 0, canvasWidth - paddingX * 2, titleFontSize * 1.3, true) : 0;
            
            const hDivider = (aiProductName && aiEditor) ? gapTitleEditor : 0;

            dummyCtx.font = `400 ${editorFontSize}px Pretendard, sans-serif`;
            const h2 = aiEditor ? wrapText(dummyCtx, aiEditor, 0, 0, canvasWidth - paddingX * 2, editorFontSize * 1.6, true) : 0;

            headerHeight = paddingTop + h1 + hDivider + h2 + gapEditorImage;
        }

        const topCols = sizeColumnsFromMode(topSizeMode);
        const bottomCols = sizeColumnsFromMode(bottomSizeMode);

        const hasBottomSection = optionalBottomBlocks.topSize || optionalBottomBlocks.bottomSize || optionalBottomBlocks.washingTip;
        let bottomBitmap: ImageBitmap | null = null;
        let bottomHeight = 0;

        if (hasBottomSection) {
          const bottomTpl = buildBottomTemplateHtml({
            topEnabled: optionalBottomBlocks.topSize,
            bottomEnabled: optionalBottomBlocks.bottomSize,
            washingEnabled: optionalBottomBlocks.washingTip,
            topCols,
            bottomCols,
            topValues: topSizeValues,
            bottomValues: bottomSizeValues,
            washingTipText,
          });
          bottomBitmap = await renderHtmlSectionToBitmap(canvasWidth, bottomTpl.html, bottomTpl.estimatedHeight);
          bottomHeight = bottomBitmap.height;
        }

        canvas.width = canvasWidth;
        canvas.height = headerHeight + imgBitmap.height + (bottomHeight > 0 ? 30 + bottomHeight : 0);

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (headerHeight > 0) {
            let currentY = paddingTop;
            if (aiProductName) {
                ctx.fillStyle = titleColor;
                ctx.font = `800 ${titleFontSize}px Pretendard, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const nextY = wrapText(ctx, aiProductName, canvasWidth / 2, currentY, canvasWidth - paddingX * 2, titleFontSize * 1.3);
                currentY = nextY;
            }
            if (aiProductName && aiEditor) {
                const dividerY = currentY + (gapTitleEditor / 2) - (dividerHeight / 2);
                ctx.fillStyle = pointColor;
                ctx.fillRect((canvasWidth - dividerWidth) / 2, dividerY, dividerWidth, dividerHeight);
                currentY += gapTitleEditor;
            }
            if (aiEditor) {
                ctx.fillStyle = editorColor;
                ctx.font = `400 ${editorFontSize}px Pretendard, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                wrapText(ctx, aiEditor, canvasWidth / 2, currentY, canvasWidth - paddingX * 2, editorFontSize * 1.6);
            }
        }

        ctx.drawImage(imgBitmap, 0, headerHeight);

        if (bottomBitmap) {
          ctx.drawImage(bottomBitmap, 0, headerHeight + imgBitmap.height + 30);
          if (typeof bottomBitmap.close === "function") bottomBitmap.close();
        }

        const blob = await canvasToBlob(canvas);
        saveAs(blob, `detailpage_designed_${nowStamp()}.png`);
        setStatus("디자인 상세페이지 생성 완료!");

    } catch (e: any) {
        setStatus("상세페이지 생성 실패: " + e.message);
    } finally {
        setTopBusyText("");
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#111] font-sans">
      <Navigation />

      <main className="pt-[80px]">
        {/* Busy Indicator */}
        {topBusyText && (
          <div className="fixed top-[90px] left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2">
            <div className="bg-[#111] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3">
              <span className="w-2 h-2 bg-[#FEE500] rounded-full animate-pulse" />
              <span className="text-sm font-semibold tracking-wide">{topBusyText}</span>
            </div>
          </div>
        )}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;600;800&display=swap');
          body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }

          .layout-container { max-width: 100%; margin: 0 auto; padding: 0 40px 60px; }

          .hero-wrap { 
            background: linear-gradient(135deg, #FEE500 0%, #FFF8B0 100%);
            border-radius: 32px; 
            padding: 80px 60px; 
            margin: 20px 0 50px; 
            display: flex; 
            align-items: center; 
            justify-content: space-between;
            position: relative;
            overflow: hidden;
            width: 100%;
          }
          .hero-content { z-index: 2; width: 100%; max-width: 600px; }
          .hero-title { font-size: 52px; font-weight: 900; line-height: 1.15; letter-spacing: -1.5px; margin-bottom: 24px; white-space: pre-wrap; }
          .hero-desc { font-size: 18px; color: rgba(0,0,0,0.6); font-weight: 500; margin-bottom: 32px; }
          
          .hero-input-box {
            background: #fff;
            padding: 8px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.08);
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .hero-input {
            flex: 1;
            border: none;
            padding: 16px 20px;
            font-size: 16px;
            border-radius: 12px;
            outline: none;
            background: transparent;
            min-width: 0; 
          }
          .hero-btn {
            background: #111;
            color: #fff;
            border: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.2s;
            white-space: nowrap;
          }
          .hero-btn:hover { transform: scale(1.02); }
          
          .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding: 0 4px; }
          .section-title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
          .section-desc { font-size: 15px; color: #888; margin-top: 4px; }
          
          .btn-text { background: transparent; border: none; font-size: 13px; font-weight: 600; color: #666; cursor: pointer; padding: 8px 12px; border-radius: 8px; transition: background 0.2s; }
          .btn-text:hover { background: rgba(0,0,0,0.05); color: #000; }
          .btn-black { background: #111; color: #fff; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: 0.2s; }
          .btn-black:hover { background: #333; }
          
          .btn-outline-black { background: transparent; color: #111; border: 2px solid #111; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.2s; }
          .btn-outline-black:hover { background: #111; color: #fff; }

          .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }

          .media-card {
            background: #fff;
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid #eee;
            position: relative;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          }
          .media-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: #FEE500; }
          .card-thumb-wrap { width: 100%; aspect-ratio: 1/1; background: #f8f8f8; position: relative; }
          .card-thumb { width: 100%; height: 100%; object-fit: cover; }
          .card-overlay { position: absolute; top: 12px; left: 12px; z-index: 10; transform: scale(1.2); cursor: pointer; accent-color: #FEE500; }
          
          .card-actions { padding: 12px; display: flex; justify-content: space-between; align-items: center; background: #fff; border-top: 1px solid #f9f9f9; }
          .card-badge { font-size: 11px; font-weight: 800; color: #ddd; }
          .card-btn-group { display: flex; gap: 4px; }
          .card-mini-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid #eee; background: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #555; transition: 0.2s; }
          .card-mini-btn:hover { background: #111; color: #fff; border-color: #111; }

          .bento-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: auto auto; gap: 24px; }
          .bento-item { background: #F9F9FB; border-radius: 24px; padding: 32px; border: 1px solid rgba(0,0,0,0.03); }
          .bento-dark { background: #111; color: #fff; }
          .bento-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; opacity: 0.6; display: flex; justify-content: space-between; }
          .bento-content { width: 100%; background: transparent; border: none; resize: none; outline: none; font-size: 16px; line-height: 1.6; }
          .bento-dark .bento-content { color: #eee; }
          .span-2 { grid-column: span 2; }
          .span-4 { grid-column: span 4; }
          .tag-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
          .tag { background: #fff; padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 600; border: 1px solid #eee; }
          .bento-dark .tag { background: #333; border-color: #444; color: #FEE500; }


          .optional-blocks { margin-top: 28px; display: grid; gap: 14px; }
          .optional-row { background: #fff; border: 1px solid #ececec; border-radius: 16px; padding: 16px 18px; }
          .optional-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
          .optional-title { font-size: 15px; font-weight: 700; }
          .optional-desc { font-size: 12px; color: #777; margin-top: 4px; }
          .radio-row { display: flex; align-items: center; gap: 14px; }
          .radio-item { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #444; cursor: pointer; }
          .radio-item input { accent-color: #111; cursor: pointer; }
          .optional-editor { margin-top: 12px; background: #fafafa; border: 1px dashed #ddd; border-radius: 12px; padding: 12px 14px; font-size: 13px; color: #666; }
          .optional-editor-title { font-size: 13px; font-weight: 700; margin-bottom: 10px; }
          .radio-row.wrap { flex-wrap: wrap; margin-bottom: 12px; }
          .optional-size-grid table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .optional-size-grid th, .optional-size-grid td { border: 1px solid #e5e5e5; padding: 6px; text-align: center; }
          .optional-size-grid th:first-child { text-align: left; width: 140px; background: #f7f7f7; }
          .optional-size-grid td input { width: 100%; border: 1px solid #ddd; border-radius: 6px; padding: 4px 6px; font-size: 12px; text-align: center; }
          .optional-tip-input { width: 100%; min-height: 90px; border: 1px solid #ddd; border-radius: 8px; padding: 10px; font-size: 13px; }

          @media (max-width: 1024px) {
            .layout-container { padding: 0 24px 60px; }
            .hero-wrap { padding: 60px 30px; }
          }
          @media (max-width: 768px) {
            .layout-container { padding: 0 16px 60px; }
            .hero-wrap { flex-direction: column; padding: 40px 24px; text-align: center; border-radius: 24px; }
            .hero-title { font-size: 32px; }
            .hero-input-box { flex-direction: column; padding: 12px; gap: 12px; width: 100%; }
            .hero-btn { width: 100%; }
            .grid-container { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .bento-grid { grid-template-columns: 1fr; gap: 16px; }
            .span-2, .span-4 { grid-column: span 1; }
            .bento-item { padding: 24px; }
            
          }
        `}</style>

        <div className="layout-container">
          {/* 1. HERO & INPUT */}
          <div className="hero-wrap">
            <div className="hero-content">
              <h1 className="hero-title">{heroTyped}<span className="animate-pulse">|</span></h1>
              <p className="hero-desc">URL만 넣으면 이미지 분석부터 AI 카피라이팅까지.<br/>복잡한 과정 없이 3초 만에 끝내세요.</p>
              
              <div className="hero-input-box" ref={urlCardRef}>
                <input 
                  type="text" 
                  className="hero-input" 
                  placeholder="https://www.vvic.com/item/... 또는 https://www.vvic.com/gz/..." 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUrlServer(urlInput)}
                />
                <button className="hero-btn" onClick={() => fetchUrlServer(urlInput)} disabled={urlLoading}>
                  {urlLoading ? "분석 중..." : "매직 시작하기"}
                </button>
              </div>
              {status && <div className="mt-4 text-sm font-bold text-black/60">{status}</div>}
            </div>
            {/* Decorative Element PC Only */}
            <div className="hidden lg:block absolute -right-10 top-10 opacity-90">
               <img src={heroImageSrc} className="w-[420px] rotate-[-5deg] drop-shadow-2xl rounded-2xl" />
            </div>
          </div>

          {/* 2. Main Images */}
          <div className="mt-12">
            <div className="section-header">
              <div>
                <h2 className="section-title">대표 이미지</h2>
                <p className="section-desc">AI 분석 및 샘플 주문에 사용될 이미지를 선택해주세요.</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-text" onClick={() => setMainItems(prev => prev.map(it => ({...it, checked: true})))}>모두 선택</button>
                <button className="btn-text" onClick={() => setMainItems(prev => prev.map(it => ({...it, checked: false})))}>해제</button>
              </div>
            </div>
            
            <div className="grid-container">
              {mainItems.map((it, idx) => (
                <div className="media-card" key={idx}>
                  <div className="card-thumb-wrap">
                    <input 
                      type="checkbox" 
                      className="card-overlay" 
                      checked={it.checked} 
                      onChange={() => setMainItems(prev => prev.map((x, i) => i === idx ? {...x, checked: !x.checked} : x))}
                    />
                    {it.type === 'video' 
                      ? <video src={it.url} className="card-thumb" muted /> 
                      : <img src={it.url} className="card-thumb" loading="lazy" />
                    }
                  </div>
                  <div className="card-actions">
                    <span className="card-badge">#{String(idx+1).padStart(2,'0')}</span>
                    <div className="card-btn-group">
                      <button className="card-mini-btn" onClick={() => window.open(it.url)}>↗</button>
                    </div>
                  </div>
                </div>
              ))}
              {!mainItems.length && (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                  URL을 입력하여 이미지를 불러오세요.
                </div>
              )}
            </div>
          </div>

          {/* 3. Detail Images */}
          <div className="mt-16">
            <div className="section-header">
              <div>
                <h2 className="section-title">상세페이지 편집</h2>
                <p className="section-desc">순서를 변경하고 하나의 이미지로 합칠 수 있습니다.</p>
              </div>
              <div className="flex gap-2 items-center">
                <button className="btn-text" onClick={() => setDetailImages(prev => prev.map(it => ({...it, checked: true})))}>모두 선택</button>
                <button className="btn-text" onClick={() => setDetailImages(prev => prev.map(it => ({...it, checked: false})))}>해제</button>
                <button className="btn-black" onClick={handleMergeAndDownloadZip}>
                  선택 이미지 합치기 (ZIP Down)
                </button>
              </div>
            </div>

            <div className="grid-container">
              {detailImages.map((it, idx) => (
                <div className="media-card" key={idx}>
                  <div className="card-thumb-wrap">
                    <input 
                      type="checkbox" 
                      className="card-overlay" 
                      checked={it.checked} 
                      onChange={() => setDetailImages(prev => prev.map((x, i) => i === idx ? {...x, checked: !x.checked} : x))}
                    />
                    <img src={it.url} className="card-thumb" loading="lazy" />
                  </div>
                  <div className="card-actions">
                    <span className="card-badge">DETAIL</span>
                    <div className="card-btn-group">
                      <button className="card-mini-btn" onClick={() => window.open(it.url)}>↗</button>
                    </div>
                  </div>
                </div>
              ))}
              {!detailImages.length && (
                <div className="col-span-full py-10 text-center text-gray-300 text-sm">
                  상세 이미지가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* 3.5 Detail Videos (Restored) */}
          {detailVideos.length > 0 && (
            <div className="mt-16">
              <div className="section-header">
                <div>
                  <h2 className="section-title">제품 동영상</h2>
                  <p className="section-desc">상세페이지에 포함된 영상입니다.</p>
                </div>
              </div>
              
              <div className="grid-container">
                {detailVideos.map((it, idx) => (
                  <div className="media-card" key={idx}>
                    <div className="card-thumb-wrap">
                      <video src={it.url} className="card-thumb" controls />
                    </div>
                    <div className="card-actions">
                      <span className="card-badge">VIDEO #{String(idx+1).padStart(2,'0')}</span>
                      <div className="card-btn-group">
                        <button className="card-mini-btn" onClick={() => window.open(it.url)}>↗</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. AI Dashboard (Bento Grid) */}
          <div className="mt-20">
            <div className="section-header">
              <div>
                <h2 className="section-title">AI 마케팅 대시보드</h2>
                <p className="section-desc">대표 이미지를 분석하여 상품명과 키워드를 제안합니다.</p>
              </div>
              <div className="flex gap-3">
                <button className="btn-outline-black" onClick={handleCreateFullDetailPage} disabled={aiLoading}>
                  상세페이지 넣기
                </button>
                <button className="btn-black bg-[#FEE500] text-black hover:bg-[#ffe923]" onClick={generateByAI} disabled={aiLoading}>
                  {aiLoading ? "AI 생각 중..." : "AI 생성 시작하기"}
                </button>
              </div>
            </div>

            <div className="bento-grid">
              <div className="bento-item span-2 bento-dark">
                <div className="bento-title">
                  <span>PRODUCT NAME</span>
                  <button onClick={() => copyText(aiProductName)} className="hover:text-[#FEE500]">COPY</button>
                </div>
                <textarea 
                  className="bento-content h-[100px] font-bold text-xl" 
                  placeholder="AI가 매력적인 상품명을 제안합니다." 
                  value={aiProductName} 
                  onChange={(e) => setAiProductName(e.target.value)}
                />
              </div>

              <div className="bento-item span-2">
                <div className="bento-title">
                  <span>EDITOR'S NOTE</span>
                  <button onClick={() => copyText(aiEditor)}>COPY</button>
                </div>
                <textarea 
                  className="bento-content h-[100px]" 
                  placeholder="상품의 특징을 살린 한 줄 요약이 여기에 표시됩니다." 
                  value={aiEditor} 
                  onChange={(e) => setAiEditor(e.target.value)}
                />
              </div>

              <div className="bento-item span-2">
                <div className="bento-title">COUPANG KEYWORDS</div>
                <div className="tag-wrap">
                  {aiCoupangKeywords.length > 0 ? aiCoupangKeywords.map((k, i) => (
                    <span key={i} className="tag">#{k}</span>
                  )) : <span className="text-gray-400 text-sm">생성 대기 중...</span>}
                </div>
              </div>

              <div className="bento-item span-2 bento-dark">
                <div className="bento-title">ABLY KEYWORDS</div>
                <div className="tag-wrap">
                  {aiAblyKeywords.length > 0 ? aiAblyKeywords.map((k, i) => (
                    <span key={i} className="tag">#{k}</span>
                  )) : <span className="text-gray-500 text-sm">생성 대기 중...</span>}
                </div>
              </div>
            </div>
          </div>


          <div className="mt-16">
            <div className="section-header">
              <div>
                <h2 className="section-title">하단 섹션 노출 설정</h2>
                <p className="section-desc">사용 안함이면 접혀서 숨기고, 사용할 때만 편집 UI를 펼칩니다.</p>
              </div>
            </div>

            <div className="optional-blocks">
              {bottomBlockMeta.map((block) => {
                const enabled = optionalBottomBlocks[block.key];
                return (
                  <div className="optional-row" key={block.key}>
                    <div className="optional-head">
                      <div>
                        <p className="optional-title">{block.title}</p>
                        <p className="optional-desc">{block.desc}</p>
                      </div>
                      <div className="radio-row" role="radiogroup" aria-label={`${block.title} 사용 여부`}>
                        <label className="radio-item">
                          <input
                            type="radio"
                            name={`bottom-block-${block.key}`}
                            checked={enabled}
                            onChange={() => setBottomBlockEnabled(block.key, true)}
                          />
                          사용함
                        </label>
                        <label className="radio-item">
                          <input
                            type="radio"
                            name={`bottom-block-${block.key}`}
                            checked={!enabled}
                            onChange={() => setBottomBlockEnabled(block.key, false)}
                          />
                          사용안함
                        </label>
                      </div>
                    </div>

                    {enabled && block.key === "topSize" && (
                      <div className="optional-editor">
                        {renderSizeTableEditor("top", topSizeMode, TOP_ITEMS, topSizeValues, setTopSizeMode, setTopSizeValues)}
                      </div>
                    )}
                    {enabled && block.key === "bottomSize" && (
                      <div className="optional-editor">
                        {renderSizeTableEditor("bottom", bottomSizeMode, BOTTOM_ITEMS, bottomSizeValues, setBottomSizeMode, setBottomSizeValues)}
                      </div>
                    )}
                    {enabled && block.key === "washingTip" && (
                      <div className="optional-editor">
                        <p className="optional-editor-title">세탁 가이드 문구</p>
                        <textarea
                          className="optional-tip-input"
                          value={washingTipText}
                          onChange={(e) => setWashingTipText(e.target.value)}
                          placeholder="세탁 가이드 문구를 입력하세요."
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      

      <Footer />
      <ScrollToTop />
    </main>
    </div>
  );
}
