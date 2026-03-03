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
type ProductInfoRow = { label: string; vals: string[]; active: number };

const TOP_PRODUCT_INFO_DEFAULT: ProductInfoRow[] = [
  { label: "비침", vals: ["없음", "밝은컬러 약간", "많음", ""], active: 0 },
  { label: "신축성", vals: ["없음", "보통", "좋음", "매우좋음"], active: 1 },
  { label: "두께감", vals: ["얇음", "보통", "두꺼움", ""], active: 1 },
  { label: "안감", vals: ["없음", "있음", "기모", ""], active: 0 },
];

const BOTTOM_PRODUCT_INFO_DEFAULT: ProductInfoRow[] = [
  { label: "비침", vals: ["없음", "약간있음", "많음", ""], active: 0 },
  { label: "신축성", vals: ["없음", "보통", "좋음", "매우좋음"], active: 0 },
  { label: "두께감", vals: ["얇음", "보통", "두꺼움", ""], active: 0 },
  { label: "안감", vals: ["없음", "있음", "기모", ""], active: 0 },
];

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

// [Icons for Optional UI]
const TopIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a8.5 8.5 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>
);
const BottomIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 3h13A1.5 1.5 0 0 1 20 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 14 19.5v-8a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v8A1.5 1.5 0 0 1 8.5 21h-3A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3z"/></svg>
);
const WashIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8z"/><path d="M21 8c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2"/><path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M12 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
);

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
  const [topProductInfoRows, setTopProductInfoRows] = useState<ProductInfoRow[]>(TOP_PRODUCT_INFO_DEFAULT);
  const [bottomProductInfoRows, setBottomProductInfoRows] = useState<ProductInfoRow[]>(BOTTOM_PRODUCT_INFO_DEFAULT);

  const urlCardRef = useRef<HTMLDivElement | null>(null);

  const bottomBlockMeta: Array<{ key: OptionalBottomBlock; title: string; desc: string; icon: JSX.Element }> = [
    { key: "topSize", title: "상의 사이즈 섹션", desc: "어깨/가슴/소매/총장 사이즈 표", icon: <TopIcon /> },
    { key: "bottomSize", title: "하의 사이즈 섹션", desc: "허리/힙/허벅지/총장 사이즈 표", icon: <BottomIcon /> },
    { key: "washingTip", title: "원단별 세탁 가이드", desc: "FABRIC WASHING TIP 및 고지 배너", icon: <WashIcon /> },
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
    // 텍스트 입력 중일 때는 빈 값도 허용 (타이핑 시 자연스러움)
    setValues({
      ...values,
      [item]: (values[item] || []).map((x, i) => (i === colIndex ? val : x)),
    });
  }

  function onSizeValueBlur(
    item: string,
    colIndex: number,
    val: string,
    values: Record<string, string[]>,
    setValues: (v: Record<string, string[]>) => void,
  ) {
    // 포커스를 잃었을 때 비어있다면 다시 '-' 기호로 복구
    if (val.trim() === "") {
      setValues({
        ...values,
        [item]: (values[item] || []).map((x, i) => (i === colIndex ? "-" : x)),
      });
    }
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
      <div className="optional-editor-inner">
        <div className="optional-editor-header">
          <span className="optional-editor-title">{title} 측정 가이드</span>
          <div className="segmented-control">
            {["FREE", "2", "3", "4", "5", "6", "7", "8"].map((opt) => (
              <label className={`segmented-item ${mode === opt ? "active" : ""}`} key={opt}>
                <input
                  type="radio"
                  checked={mode === opt}
                  onChange={() => changeSizeMode(opt, setMode, items, values, setValues)}
                />
                {opt === "FREE" ? "FREE" : `S~${SIZE_LIST[Number(opt) - 1]}`}
              </label>
            ))}
          </div>
        </div>
        <div className="optional-size-grid">
          <table>
            <thead>
              <tr>
                <th>측정항목 (단위:cm)</th>
                {cols.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item}>
                  <th>{item}</th>
                  {cols.map((_, idx) => {
                    const val = (values[item] || [])[idx];
                    // '-' 값이면 빈 문자열로 표시하여 placeholder '-' 가 보이게 함. 클릭 시 비워지는 효과.
                    const displayVal = val === "-" ? "" : val;
                    return (
                      <td key={`${item}-${idx}`}>
                        <input
                          value={displayVal}
                          placeholder="-"
                          onChange={(e) => onSizeValueChange(item, idx, e.target.value, values, setValues)}
                          onBlur={(e) => onSizeValueBlur(item, idx, e.target.value, values, setValues)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function onProductInfoSelect(
    rows: ProductInfoRow[],
    setRows: (rows: ProductInfoRow[]) => void,
    rowIndex: number,
    colIndex: number,
  ) {
    setRows(rows.map((row, idx) => (idx === rowIndex ? { ...row, active: colIndex } : row)));
  }

  function renderProductInfoEditor(
    title: string,
    rows: ProductInfoRow[],
    setRows: (rows: ProductInfoRow[]) => void,
  ) {
    return (
      <div className="product-info-editor">
        <p className="optional-editor-title">{title} INFO</p>
        <div className="pi-container">
          {rows.map((row, rowIdx) => (
            <div key={row.label} className="pi-row">
              <strong>{row.label}</strong>
              <div className="pi-options">
                {row.vals.map((v, colIdx) => (
                  <button
                    key={`${row.label}-${colIdx}`}
                    type="button"
                    className={row.active === colIdx ? "pi-pill active" : "pi-pill"}
                    disabled={!v}
                    onClick={() => onProductInfoSelect(rows, setRows, rowIdx, colIdx)}
                  >
                    {v || "-"}
                  </button>
                ))}
              </div>
            </div>
          ))}
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
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) {
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
        const sizeBlockH = 980;
        const washH = 1120;
        const blockGap = 34;
        const enabledCount = (optionalBottomBlocks.topSize ? 1 : 0) + (optionalBottomBlocks.bottomSize ? 1 : 0) + (optionalBottomBlocks.washingTip ? 1 : 0);
        const bottomHeight = hasBottomSection
          ? (optionalBottomBlocks.topSize ? sizeBlockH : 0)
            + (optionalBottomBlocks.bottomSize ? sizeBlockH : 0)
            + (optionalBottomBlocks.washingTip ? washH : 0)
            + blockGap * Math.max(0, enabledCount - 1)
          : 0;

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

        const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
        };

        const drawProductInfo = (x: number, y: number, w: number, rows: ProductInfoRow[]) => {
          ctx.fillStyle = "#111";
          ctx.font = "700 28px Pretendard, sans-serif";
          ctx.textAlign = "left";
          ctx.fillRect(x, y - 24, 6, 24);
          ctx.fillText("PRODUCT INFO", x + 14, y);

          const rowH = 56;
          const colW0 = 120;
          const colW = (w - colW0) / 4;
          rows.forEach((row, r) => {
            const ry = y + 28 + r * rowH;
            ctx.strokeStyle = "#e8e8e8";
            ctx.beginPath();
            ctx.moveTo(x, ry + rowH);
            ctx.lineTo(x + w, ry + rowH);
            ctx.stroke();
            ctx.fillStyle = "#f7f7f7";
            ctx.fillRect(x, ry, colW0, rowH);
            ctx.fillStyle = "#666";
            ctx.font = "600 16px Pretendard, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(row.label, x + colW0 / 2, ry + 35);
            row.vals.forEach((v, c) => {
              const cx = x + colW0 + c * colW + colW / 2;
              if (c === row.active) {
                drawRoundedRect(cx - 28, ry + 18, 56, 24, 12, "#111");
                ctx.fillStyle = "#fff";
                ctx.font = "600 12px Pretendard, sans-serif";
                ctx.fillText(v, cx, ry + 39);
              } else {
                ctx.fillStyle = "#333";
                ctx.font = "500 13px Pretendard, sans-serif";
                ctx.fillText(v, cx, ry + 38);
              }
            });
          });
        };

        const drawTopSizeIllustration = (x: number, y: number, w: number, h: number) => {
          const cx = x + w / 2;
          const topY = y + 20;

          ctx.save();
          ctx.strokeStyle = "#9199a1";
          ctx.fillStyle = "#eef2f5";
          ctx.lineWidth = 3;
          ctx.lineJoin = "round";

          ctx.beginPath();
          ctx.moveTo(cx - 36, topY + 24);
          ctx.lineTo(cx - 68, topY + 58);
          ctx.lineTo(cx - 50, topY + 80);
          ctx.lineTo(cx - 24, topY + 54);
          ctx.lineTo(cx - 24, topY + 138);
          ctx.lineTo(cx + 24, topY + 138);
          ctx.lineTo(cx + 24, topY + 54);
          ctx.lineTo(cx + 50, topY + 80);
          ctx.lineTo(cx + 68, topY + 58);
          ctx.lineTo(cx + 36, topY + 24);
          ctx.lineTo(cx + 18, topY + 38);
          ctx.quadraticCurveTo(cx, topY + 48, cx - 18, topY + 38);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = "#a7afb7";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, topY + 48);
          ctx.lineTo(cx, topY + 138);
          ctx.moveTo(cx - 24, topY + 82);
          ctx.lineTo(cx + 24, topY + 82);
          ctx.stroke();
          ctx.restore();
        };

        const drawSizeBlock = (isTop: boolean, cols: string[], items: string[], values: Record<string, string[]>, y: number) => {
          const outerX = 26;
          const outerW = canvasWidth - 52;
          drawRoundedRect(outerX, y, outerW, sizeBlockH, 20, "#fff");

          ctx.fillStyle = "#111";
          ctx.font = "700 28px Pretendard, sans-serif";
          ctx.textAlign = "center";

          drawRoundedRect(outerX + 28, y + 44, outerW - 56, 56, 12, "#eef2f5");
          ctx.fillStyle = "#444";
          ctx.font = "600 14px Pretendard, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(cols[0] === "FREE" ? "◉ FREE" : `◉ ${cols.join(" ")}`, outerX + 42, y + 79);

          const panelX = outerX + 28;
          const panelW = outerW - 56;
          const leftW = 260;
          const rightW = panelW - leftW - 28;
          const rowH = 48;

          ctx.fillStyle = "#111";
          ctx.font = "700 28px Pretendard, sans-serif";
          ctx.textAlign = "left";
          ctx.fillRect(panelX, y + 124, 6, 24);
          ctx.textBaseline = "middle";
          ctx.fillText("SIZE INFO", panelX + 22, y + 136);
          ctx.textBaseline = "alphabetic";

          drawRoundedRect(panelX, y + 170, leftW, 320, 12, "#fafafa");
          drawTopSizeIllustration(panelX + 52, y + 220, 150, 150);
          ctx.fillStyle = "#888";
          ctx.font = "400 12px Pretendard, sans-serif";
          ctx.fillText("* 측정 방법에 따라 오차가 발생할 수 있습니다.", panelX + 24, y + 470);

          const tableX = panelX + leftW + 28;
          const labelW = 156;
          const cellW = (rightW - labelW) / cols.length;
          ctx.fillStyle = "#666";
          ctx.font = "600 18px Pretendard, sans-serif";
          ctx.fillText("사이즈 (단위:cm)", tableX, y + 206);
          cols.forEach((c, i) => {
            ctx.textAlign = "center";
            ctx.fillText(c, tableX + labelW + cellW * i + cellW / 2, y + 206);
          });
          ctx.textAlign = "left";
          ctx.strokeStyle = "#222";
          ctx.beginPath();
          ctx.moveTo(tableX, y + 228);
          ctx.lineTo(tableX + rightW, y + 228);
          ctx.stroke();

          items.forEach((item, r) => {
            const rowY = y + 228 + rowH * r;
            ctx.strokeStyle = "#eaeaea";
            ctx.beginPath();
            ctx.moveTo(tableX, rowY + rowH);
            ctx.lineTo(tableX + rightW, rowY + rowH);
            ctx.stroke();
            ctx.fillStyle = "#555";
            ctx.font = "600 16px Pretendard, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(item, tableX + 4, rowY + 31);
            cols.forEach((_, i) => {
              ctx.fillStyle = "#333";
              ctx.textAlign = "center";
              ctx.fillText((values[item] || [])[i] ?? "-", tableX + labelW + cellW * i + cellW / 2, rowY + 31);
            });
          });

          drawRoundedRect(panelX, y + 512, panelW, 86, 8, "#fafafa");
          ctx.fillStyle = "#777";
          ctx.font = "400 14px Pretendard, sans-serif";
          ctx.textAlign = "left";
          const descs = isTop
            ? [
                "* 재는 위치에 따라 1~3cm 정도 오차가 있을 수 있습니다.",
                "* 신축성이 좋은 원단은 사이즈 오차 범위가 클 수 있습니다.",
                "* 표 안의 '-' 부분을 클릭하면 바로 수치 입력이 가능합니다.",
              ]
            : [
                "* 재는 위치에 따라 1~3cm 정도 오차가 있을 수 있습니다.",
                "* 허리 단면 측정은 앞/뒷면을 수평으로 눕혀 측정합니다.",
              ];
          descs.forEach((d, i) => ctx.fillText(d, panelX + 16, y + 542 + i * 24));

          drawProductInfo(panelX, y + 640, panelW, isTop ? topProductInfoRows : bottomProductInfoRows);
        };

        let bottomY = headerHeight + imgBitmap.height + 30;
        if (optionalBottomBlocks.topSize) {
          drawSizeBlock(true, topCols, TOP_ITEMS, topSizeValues, bottomY);
          bottomY += sizeBlockH + blockGap;
        }
        if (optionalBottomBlocks.bottomSize) {
          drawSizeBlock(false, bottomCols, BOTTOM_ITEMS, bottomSizeValues, bottomY);
          bottomY += sizeBlockH + blockGap;
        }
        if (optionalBottomBlocks.washingTip) {
          const x = 26;
          const w = canvasWidth - 52;
          drawRoundedRect(x, bottomY, w, washH, 20, "#fff");
          ctx.fillStyle = "#111";
          ctx.font = "700 28px Pretendard, sans-serif";
          ctx.textAlign = "center";
          drawRoundedRect(x + 28, bottomY + 44, w - 56, 52, 8, "#ffebee");
          ctx.fillStyle = "#d32f2f";
          ctx.font = "600 15px Pretendard, sans-serif";
          ctx.textBaseline = "middle";
          ctx.fillText("🚨 리오더 회차에 따라 부속품(단추, 지퍼, 버클 등)의 색상 및 디테일은 상이할 수 있습니다.", x + w / 2, bottomY + 70);
          ctx.textBaseline = "alphabetic";

          drawRoundedRect(x + 28, bottomY + 120, w - 56, washH - 160, 20, "#111");
          ctx.fillStyle = "#fff";
          ctx.font = "700 46px Pretendard, sans-serif";
          ctx.fillText("FABRIC WASHING TIP", x + w / 2, bottomY + 198);
          ctx.fillStyle = "#f0c37b";
          ctx.font = "700 24px Pretendard, sans-serif";
          ctx.fillText("모든 의류의 첫 세탁은 드라이 크리닝을 추천해 드립니다.", x + w / 2, bottomY + 242);
          ctx.fillStyle = "#cfcfcf";
          ctx.font = "400 15px Pretendard, sans-serif";
          ctx.fillText("데님 및 색원단 제품은 이염 가능성이 있어 주의 부탁드립니다.", x + w / 2, bottomY + 276);

          const fabrics: [string, string, string][] = [
            ["COTTON", "면 (Cotton)", `드라이 세제 또는 울세제로 잠깐 담궜다가\n단독손세탁을 권장합니다.`],
            ["RAYON", "레이온 (Rayon)", `레이온 소재 특성상 물에 약한 소재이므로\n첫 세탁은 드라이 크리닝 권장.`],
            ["DENIM", "데님 (Denim)", `데님은 물빠짐이 있을 수 있어 첫 세탁은\n드라이 크리닝을 추천합니다.`],
            ["POLY", "폴리 (Poly)", `중성세제를 이용해 미온수 손세탁을 권장하며\n건조 시 비틀어 짜지 마세요.`],
            ["LINEN", "린넨 (Linen)", `색원단 물빠짐이 있을 수 있어\n단독 손세탁 또는 드라이 크리닝 권장.`],
            ["ACRYLIC", "아크릴 (Acrylic)", `30도 이하 미지근한 물 손세탁 권장,\n정전기 방지를 위해 섬유유연제 사용.`],
            ["WOOL", "울 (Wool)", `원형 보존을 위해 드라이 크리닝이 좋으며\n잦은 세탁은 수명을 단축시킬 수 있습니다.`],
            ["TENCEL", "텐셀 (Tencel)", `물에 약해 변형 방지를 위해 드라이 크리닝 권장,\n보풀/늘어짐 주의.`],
            ["NYLON", "나일론 (Nylon)", `장시간 물에 담그지 말고 빠르게 세탁,\n표백세제 사용은 피해주세요.`],
            ["LEATHER", "가죽 (Leather)", `물에 약해 드라이 크리닝 권장,\n전용 크림 사용 및 통풍 보관이 좋습니다.`],
          ];
          const gridX = x + 56;
          const gridY = bottomY + 322;
          const colW = (w - 112 - 30) / 2;
          const itemH = 136;
          fabrics.forEach((f, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const ix = gridX + col * (colW + 30);
            const iy = gridY + row * (itemH + 12);
            drawRoundedRect(ix, iy, 84, 84, 16, "#e6e9ec");
            ctx.fillStyle = "#4a4a4a";
            ctx.font = "700 16px Pretendard, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(f[0], ix + 42, iy + 50);
            ctx.fillStyle = "#fff";
            ctx.font = "700 26px Pretendard, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(f[1], ix + 104, iy + 28);
            ctx.fillStyle = "#cfcfcf";
            ctx.font = "400 16px Pretendard, sans-serif";
            wrapText(ctx, f[2], ix + 104, iy + 54, colW - 104, 24);
          });
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

          /* 기존 레이아웃 CSS */
          .hero-wrap { background: linear-gradient(135deg, #FEE500 0%, #FFF8B0 100%); border-radius: 32px; padding: 80px 60px; margin: 20px 0 50px; display: flex; align-items: center; justify-content: space-between; position: relative; overflow: hidden; width: 100%; }
          .hero-content { z-index: 2; width: 100%; max-width: 600px; }
          .hero-title { font-size: 52px; font-weight: 900; line-height: 1.15; letter-spacing: -1.5px; margin-bottom: 24px; white-space: pre-wrap; }
          .hero-desc { font-size: 18px; color: rgba(0,0,0,0.6); font-weight: 500; margin-bottom: 32px; }
          .hero-input-box { background: #fff; padding: 8px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); display: flex; gap: 8px; align-items: center; }
          .hero-input { flex: 1; border: none; padding: 16px 20px; font-size: 16px; border-radius: 12px; outline: none; background: transparent; min-width: 0; }
          .hero-btn { background: #111; color: #fff; border: none; padding: 16px 32px; border-radius: 12px; font-weight: 700; font-size: 16px; cursor: pointer; transition: transform 0.2s; white-space: nowrap; }
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
          .media-card { background: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #eee; position: relative; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
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

          /* === 새롭게 적용된 '월드클래스 디자이너' 모던 하단 섹션 CSS === */
          .optional-blocks { margin-top: 32px; display: flex; flex-direction: column; gap: 24px; }
          .optional-row { background: #fff; border: 1px solid #eaeaea; border-radius: 24px; padding: 24px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); transition: all 0.3s ease; }
          .optional-row:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); border-color: #dfdfdf; }
          .optional-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
          .optional-title-wrap { display: flex; align-items: center; gap: 12px; }
          .optional-icon-box { display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; background: #f4f5f7; border-radius: 12px; color: #444; }
          .optional-title { font-size: 17px; font-weight: 800; color: #111; }
          .optional-desc { font-size: 13px; color: #888; margin-top: 4px; font-weight: 500; }
          
          /* Modern Segmented Control for Radio Buttons */
          .segmented-control { display: inline-flex; background: #f4f5f7; border-radius: 12px; padding: 4px; gap: 4px; align-items: center; }
          .segmented-control.wrap { flex-wrap: wrap; }
          .segmented-item { position: relative; cursor: pointer; padding: 8px 16px; font-size: 13px; font-weight: 700; color: #777; border-radius: 8px; transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1); user-select: none; }
          .segmented-item input { display: none; }
          .segmented-item:hover { color: #111; }
          .segmented-item.active { background: #111; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }

          /* Size Editor Grid (Minimalist & Clean) */
          .optional-editor { margin-top: 24px; border-top: 1px solid #f0f0f0; padding-top: 24px; animation: fade-in 0.3s ease; }
          .optional-editor-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
          .optional-editor-title { font-size: 14px; font-weight: 800; color: #333; letter-spacing: -0.2px; text-transform: uppercase; }
          
          .optional-size-grid { overflow-x: auto; }
          .optional-size-grid table { width: 100%; border-collapse: separate; border-spacing: 0; }
          .optional-size-grid th { font-size: 13px; font-weight: 700; color: #555; padding: 14px 10px; border-bottom: 2px solid #eee; text-align: center; white-space: nowrap; }
          .optional-size-grid th:first-child { text-align: left; color: #111; }
          .optional-size-grid td { padding: 10px; border-bottom: 1px solid #f5f5f5; text-align: center; }
          .optional-size-grid td input { 
            width: 100%; max-width: 90px; margin: 0 auto; 
            border: 1px solid transparent; background: #f9fafb; 
            border-radius: 10px; padding: 12px 10px; font-size: 14px; font-weight: 600; text-align: center; 
            color: #111; transition: all 0.2s; outline: none; box-sizing: border-box;
          }
          .optional-size-grid td input:hover { background: #f0f2f5; }
          .optional-size-grid td input:focus { background: #fff; border-color: #111; box-shadow: 0 0 0 2px rgba(17,17,17,0.1); }
          .optional-size-grid td input::placeholder { color: #d0d0d0; font-weight: 400; }
          
          /* Washing Tip Textarea */
          .optional-tip-input { width: 100%; min-height: 100px; border: 1px solid #eee; background: #f9fafb; border-radius: 12px; padding: 16px; font-size: 14px; color: #333; outline: none; transition: 0.2s; resize: vertical; }
          .optional-tip-input:focus { background: #fff; border-color: #111; }

          /* Product Info Pills */
          .product-info-editor { margin-top: 32px; }
          .pi-container { background: #fafafa; border-radius: 16px; padding: 20px; border: 1px solid #f0f0f0; }
          .pi-row { display: grid; grid-template-columns: 80px 1fr; gap: 16px; align-items: center; padding: 12px 0; border-bottom: 1px dashed #e6e6e6; }
          .pi-row:last-child { border-bottom: none; }
          .pi-row strong { color: #444; font-size: 13px; font-weight: 800; letter-spacing: -0.3px; }
          .pi-options { display: flex; flex-wrap: wrap; gap: 8px; }
          .pi-pill { background: #fff; border: 1px solid #e0e0e0; border-radius: 99px; padding: 8px 18px; font-size: 13px; font-weight: 600; color: #555; cursor: pointer; transition: all 0.2s ease; }
          .pi-pill:hover:not(:disabled) { border-color: #aaa; color: #111; }
          .pi-pill.active { background: #111; color: #fff; border-color: #111; box-shadow: 0 4px 12px rgba(17,17,17,0.15); }
          .pi-pill:disabled { opacity: 0.4; cursor: not-allowed; background: #f9f9f9; }

          @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

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
            .optional-head { flex-direction: column; align-items: flex-start; gap: 16px; }
            .optional-row { padding: 20px; }
            .pi-row { grid-template-columns: 1fr; gap: 10px; }
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

          {/* 3.5 Detail Videos */}
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

          {/* 4. AI Dashboard */}
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

          {/* 5. 하단 섹션 설정 (완벽한 디자인 개편 반영) */}
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
                      <div className="optional-title-wrap">
                        <div className="optional-icon-box">{block.icon}</div>
                        <div>
                          <p className="optional-title">{block.title}</p>
                          <p className="optional-desc">{block.desc}</p>
                        </div>
                      </div>
                      
                      {/* Segmented Control for Yes/No */}
                      <div className="segmented-control" role="radiogroup" aria-label={`${block.title} 사용 여부`}>
                        <label className={`segmented-item ${enabled ? 'active' : ''}`}>
                          <input
                            type="radio"
                            checked={enabled}
                            onChange={() => setBottomBlockEnabled(block.key, true)}
                          />
                          사용함
                        </label>
                        <label className={`segmented-item ${!enabled ? 'active' : ''}`}>
                          <input
                            type="radio"
                            checked={!enabled}
                            onChange={() => setBottomBlockEnabled(block.key, false)}
                          />
                          사용안함
                        </label>
                      </div>
                    </div>

                    {enabled && block.key === "topSize" && (
                      <div className="optional-editor">
                        {renderSizeTableEditor("상의", topSizeMode, TOP_ITEMS, topSizeValues, setTopSizeMode, setTopSizeValues)}
                        {renderProductInfoEditor("상의", topProductInfoRows, setTopProductInfoRows)}
                      </div>
                    )}
                    {enabled && block.key === "bottomSize" && (
                      <div className="optional-editor">
                        {renderSizeTableEditor("하의", bottomSizeMode, BOTTOM_ITEMS, bottomSizeValues, setBottomSizeMode, setBottomSizeValues)}
                        {renderProductInfoEditor("하의", bottomProductInfoRows, setBottomProductInfoRows)}
                      </div>
                    )}
                    {enabled && block.key === "washingTip" && (
                      <div className="optional-editor">
                        <div className="optional-editor-header">
                          <span className="optional-editor-title">세탁 가이드 문구 편집</span>
                        </div>
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
