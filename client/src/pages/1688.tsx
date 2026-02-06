import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// [Type Definition]
type MediaItem = { type: "image" | "video"; url: string; checked?: boolean };

type SkuItem = { label: string; img?: string; disabled?: boolean };
type SkuGroup = { title: string; items: SkuItem[] };
// ✅ [추가] 가격/재고 매핑용 타입
type SkuMapItem = { name: string; price?: string; stock?: string };

// [Assets & Constants]
const HERO_IMAGE_PRIMARY = "/attached_assets/generated_images/aipage.png";
const HERO_IMAGE_FALLBACK =
  "https://raw.githubusercontent.com/nanainternational/nana-renewal/refs/heads/main/attached_assets/generated_images/aipage.png";
const HERO_TEXT_FULL = "링크 하나로 끝내는\n상세페이지 매직.";

// [Extension Download]
const EXTENSION_DOWNLOAD_URL = "https://github.com/nanainternational/nana-renewal/releases/latest/download/nana-1688-extractor.zip";


// ✅ SKU 데이터 변환 로직
function convertSkuPropsToGroups(skuProps: any): SkuGroup[] {
  if (!Array.isArray(skuProps)) return [];
  return skuProps
    .map((prop: any) => ({
      title: String(prop?.label ?? prop?.name ?? "").trim(),
      items: Array.isArray(prop?.values)
        ? prop.values.map((val: any) => ({
            label: String(val?.name ?? val?.label ?? "").trim(),
            img: String(val?.imgUrl ?? val?.img ?? val?.image ?? "").trim() || undefined,
            disabled: false
          }))
        : []
    }))
    .filter((g: any) => g.title && Array.isArray(g.items) && g.items.length);
}

function parseSkuHtmlToGroups(skuHtml: any): SkuGroup[] {
  const html = typeof skuHtml === "string" ? skuHtml : "";
  if (!html.trim()) return [];
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const root =
      doc.querySelector("#skuSelection") ||
      doc.querySelector('[data-spm="skuSelection"]') ||
      doc.body;

    const groups: SkuGroup[] = [];
    const dls = Array.from(root.querySelectorAll("dl"));
    
    for (const dl of dls) {
      const dt = dl.querySelector("dt");
      const title = (dt?.textContent || "").trim().replace(/[:：]\s*$/, "");
      if (!title) continue;
      const itemEls = Array.from(dl.querySelectorAll("li, button, a"));
      const items: any[] = [];
      const seen = new Set<string>();
      for (const el of itemEls) {
        const label = (el.textContent || "").trim();
        const img = (el as any).querySelector?.("img")?.getAttribute?.("src");
        if(label && !seen.has(label)) {
            seen.add(label);
            items.push({ label, img: img || undefined, disabled: false });
        }
      }
      if (items.length) groups.push({ title, items });
    }
    return groups;
  } catch {
    return [];
  }
}

function getSkuGroupsFromData(data: any): SkuGroup[] {
  const g1 = data?.sku_groups;
  if (Array.isArray(g1) && g1.length) return g1;
  const g2 = convertSkuPropsToGroups(data?.sku_props);
  if (g2.length) return g2;
  const g3 = parseSkuHtmlToGroups(data?.sku_html);
  return g3;
}


// [Utility] Fetch & Blob
async function fetchSmartBlob(url: string, apiUrlStr: string): Promise<{ blob: Blob; ext: string } | null> {
  try {
    const proxyRes = await fetch(`${apiUrlStr}?url=${encodeURIComponent(url)}`);
    if (proxyRes.ok) {
      const blob = await proxyRes.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      return { blob, ext };
    }
  } catch (e) {}
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      return { blob, ext: blob.type.includes("png") ? "png" : "jpg" };
    }
  } catch (e) {}
  return null;
}

function nowStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return yy + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes());
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, measureOnly = false) {
  const words = text.split("");
  let line = "";
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    if (words[n] === "\n") {
      if (!measureOnly) ctx.fillText(line, x, currentY);
      line = "";
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

export default function Alibaba1688DetailPage() {
  // [State]
  const [urlInput, setUrlInput] = useState("");
  const [status, setStatus] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [topBusyText, setTopBusyText] = useState("");
  const progressTimerRef = useRef<number | null>(null);

  // [State] Media
  const [mainItems, setMainItems] = useState<MediaItem[]>([]);
  const [detailImages, setDetailImages] = useState<MediaItem[]>([]);
  
  // [State] AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProductName, setAiProductName] = useState("");
  const [aiEditor, setAiEditor] = useState("");
  const [aiCoupangKeywords, setAiCoupangKeywords] = useState<string[]>([]);
  const [aiAblyKeywords, setAiAblyKeywords] = useState<string[]>([]);
  const [newCoupangKw, setNewCoupangKw] = useState("");
  const [newAblyKw, setNewAblyKw] = useState("");

  // [State] Sample Order & SKU
  const [sampleTitle, setSampleTitle] = useState("");
  const [sampleImage, setSampleImage] = useState("");
  const [skuGroups, setSkuGroups] = useState<SkuGroup[]>([]);
  // ✅ [추가] 가격/재고 매핑 state
  const [skuMap, setSkuMap] = useState<SkuMapItem[]>([]); 
  const [selectedSku, setSelectedSku] = useState<Record<string, string>>({});
  const [samplePrice, setSamplePrice] = useState("");
  const [sampleOption, setSampleOption] = useState("");
  const [sampleQty, setSampleQty] = useState(1);

  // [State] UI
  const [heroTyped, setHeroTyped] = useState("");
  const [heroTypingOn, setHeroTypingOn] = useState(true);
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE_PRIMARY);
  const [toastText, setToastText] = useState("");
  const toastTimerRef = useRef<number | null>(null);
  const urlCardRef = useRef<HTMLDivElement | null>(null);
  
  const API_BASE = (import.meta as any)?.env?.VITEITE_API_BASE || (import.meta as any)?.env?.VITE_API_BASE || "";

  function apiUrl(p: string) {
    const base = String(API_BASE || "").trim().replace(/\/$/, "");
    if (!base) return p;
    return base + (p.startsWith("/") ? p : "/" + p);
  }

  const proxyImageUrl = (u: string) => {
    if (!u) return u;
    if (!/^https?:\/\//i.test(u)) return u;
    return apiUrl(`/api/1688/proxy/image?url=${encodeURIComponent(u)}`);
  };

  function showToast(msg: string, ms = 2400) {
    const t = String(msg || "").trim();
    if (!t) return;
    setToastText(t);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastText("");
      toastTimerRef.current = null;
    }, ms);
  }

  useEffect(() => {
    if (status) showToast(status);
  }, [status]);

  function loadImageSize(u: string, timeoutMs = 8000): Promise<{ w: number; h: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      const timer = window.setTimeout(() => { cleanup(); resolve(null); }, timeoutMs);
      function cleanup() { window.clearTimeout(timer); img.onload = null; img.onerror = null; }
      img.onload = () => { cleanup(); resolve({ w: (img as any).naturalWidth || img.width, h: (img as any).naturalHeight || img.height }); };
      img.onerror = () => { cleanup(); resolve(null); };
      img.src = proxyImageUrl(u);
    });
  }

  async function filterLargeImages(items: MediaItem[], minSide = 200) {
    const checks = await Promise.all(items.map(async (it) => {
        const s = await loadImageSize(it.url);
        return s && s.w >= minSide && s.h >= minSide;
    }));
    return items.filter((_, i) => checks[i]);
  }

  // ✅ [자동 업데이트] 옵션 선택 변경 시 텍스트 반영
  useEffect(() => {
    if (Object.keys(selectedSku).length > 0) {
      const opt = Object.values(selectedSku).filter(Boolean).join(" / ");
      setSampleOption(opt);
    }
  }, [selectedSku]);

  // ✅ [옵션 선택]
  function handleSelectSku(groupTitle: string, itemLabel: string) {
    setSelectedSku((prev) => ({ ...prev, [groupTitle]: itemLabel }));
  }

  // ✅ [SKU 메타데이터 조회] 이름으로 가격/재고 찾기
  function getSkuMeta(name: string) {
    if (!skuMap.length) return { price: "", stock: "" };
    // 정확히 일치하거나, 포함되는 경우 (1688 데이터 특성상 부분 일치 필요할 수 있음)
    const found = skuMap.find(s => s.name === name || s.name.includes(name) || name.includes(s.name));
    return found || { price: "", stock: "" };
  }

  // Message Listener
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      const d: any = ev?.data;
      if (!d || d.type !== "VVIC_SAMPLE_ORDER") return;
      const p = d.payload || {};
      if (p.url) setUrlInput(p.url.trim());
      if (p.title) setSampleTitle(p.title.trim());
      if (p.main_image) setSampleImage(p.main_image.trim());
      if (p.unit_price) setSamplePrice(String(p.unit_price).replace(/[^0-9.]/g, ""));
      if (p.option_text) setSampleOption(p.option_text.trim());
      setStatus("확장프로그램 데이터 수신 완료");
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // UI Effects
  useEffect(() => {
    const img = new Image();
    img.onload = () => {};
    img.onerror = () => { if (heroImageSrc !== HERO_IMAGE_FALLBACK) setHeroImageSrc(HERO_IMAGE_FALLBACK); };
    img.src = heroImageSrc;
  }, [heroImageSrc]);

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
    if (progressTimerRef.current) { window.clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
    setTopBusyText("");
  }

  // [Func] Fetch URL Data
  async function fetchUrlServer(url: string) {
    setUrlLoading(true);
    startProgress(["데이터 불러오는 중...", "이미지 구성 중..."]);
    try {
      const api = apiUrl("/api/1688/latest?_=" + Date.now());
      const res = await fetch(api, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.message || "데이터 없음");

      if (data.url) setUrlInput(data.url);
      if (data.product_name) {
          setAiProductName(data.product_name);
          setSampleTitle(data.product_name);
      }
      
      const firstMain = (data.main_media || [])[0];
      const firstMainUrl = typeof firstMain === "string" ? firstMain : firstMain?.url;
      if (firstMainUrl) setSampleImage(firstMainUrl);

      const rawUnit = data.price ?? data.unit_price ?? "";
      if (rawUnit) setSamplePrice(String(rawUnit).replace(/[^0-9.]/g, ""));

      // ✅ SKU Setting (핵심)
      const groups = getSkuGroupsFromData(data);
      if (Array.isArray(groups) && groups.length) {
        setSkuGroups(groups);
        
        // ✅ 1688의 sku_map 데이터 저장
        if (Array.isArray(data.sku_map)) {
            setSkuMap(data.sku_map);
        }

        const init: Record<string, string> = {};
        for (const g of groups) {
          const first = g?.items?.find((it: any) => !it?.disabled) || g?.items?.[0];
          if (g?.title && first?.label) init[g.title] = first.label;
        }
        setSelectedSku(init);
      }

      const mm = (data.main_media || []).map((x:any) => ({ type: "image", url: x.url || x, checked: true }));
      const dm = (data.detail_media || []).map((x:any) => ({ type: "image", url: x.url || x, checked: true }));
      const mm2 = await filterLargeImages(mm, 200);
      const dm2 = await filterLargeImages(dm, 200);
      setMainItems(mm2 as any);
      setDetailImages(dm2 as any);

      setStatus(`불러오기 완료 (옵션 ${groups.length}개)`);
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setUrlLoading(false);
      stopProgress();
    }
  }

  async function generateByAI() {
    const chosen = mainItems.find(x => x.checked) || mainItems[0];
    if (!chosen) return setStatus("이미지 없음");
    setAiLoading(true);
    startProgress(["AI 분석 중...", "키워드 추출 중..."]);
    try {
        const res = await fetch(apiUrl("/api/vvic/ai"), {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_url: chosen.url, source_url: urlInput.trim() })
        });
        const d = await res.json();
        if(!d.ok) throw new Error(d.error);
        setAiProductName(d.product_name||""); setAiEditor(d.editor||"");
        setAiCoupangKeywords(d.coupang_keywords||[]); setAiAblyKeywords(d.ably_keywords||[]);
        setStatus("AI 생성 완료");
    } catch(e) { setStatus("AI 실패"); }
    finally { setAiLoading(false); stopProgress(); }
  }

  async function handleMergeAndDownloadZip() {
    const m = mainItems.filter(x => x.checked), d = detailImages.filter(x => x.checked);
    if(!m.length && !d.length) return setStatus("선택된 이미지 없음");
    setTopBusyText("ZIP 생성 중...");
    try {
        const zip = new JSZip();
        for(let i=0; i<m.length; i++) {
            const r = await fetchSmartBlob(m[i].url, apiUrl("/api/1688/proxy/image"));
            if(r) zip.file(`main_${i+1}.${r.ext}`, r.blob);
        }
        for(let i=0; i<d.length; i++) {
            const r = await fetchSmartBlob(d[i].url, apiUrl("/api/1688/proxy/image"));
            if(r) zip.file(`detail_${i+1}.${r.ext}`, r.blob);
        }
        const b = await zip.generateAsync({type:"blob"});
        saveAs(b, `${nowStamp()}.zip`);
        setStatus("다운로드 완료");
    } catch(e:any) { setStatus("실패: "+e.message); }
    finally { setTopBusyText(""); }
  }

  async function handlePutDetailPage() {
    const selectedDetailItems = detailImages.filter((x) => x.checked);
    if (!selectedDetailItems.length) {
      setStatus("상세페이지에 넣을 이미지가 없습니다. (상세 이미지에서 체크)");
      return;
    }
    const limitedItems = selectedDetailItems.slice(0, 100);
    const MAX_HEIGHT = 100000;
    try {
      localStorage.setItem("nana_detail_draft", JSON.stringify({
        domain: "1688",
        source_url: urlInput.trim(),
        product_name: aiProductName,
        editor: aiEditor,
        coupang_keywords: aiCoupangKeywords,
        ably_keywords: aiAblyKeywords,
        detail_images: limitedItems.map((x) => x.url),
        created_at: Date.now(),
      }));
    } catch (e) {}

    setStatus("상세페이지 만들기 중...");
    startProgress(["상세페이지 구성 중...", "이미지 로딩 중...", "PNG 생성 중..."]);

    function pathRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.closePath();
    }
    function loadImg(u: string, timeoutMs = 15000): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timer = window.setTimeout(() => reject(new Error("이미지 로딩 타임아웃")), timeoutMs);
            img.crossOrigin = "anonymous";
            img.onload = () => { window.clearTimeout(timer); resolve(img); };
            img.onerror = () => { window.clearTimeout(timer); reject(new Error("이미지 로딩 실패")); };
            img.src = proxyImageUrl(u);
        });
    }

    try {
        const W = 1000; const P = 40;
        const probeCanvas = document.createElement("canvas");
        probeCanvas.width = W; probeCanvas.height = 2000;
        const probeCtx = probeCanvas.getContext("2d");
        if (!probeCtx) throw new Error("Canvas 생성 불가");

        let y = P;
        if (aiProductName.trim()) {
            probeCtx.fillStyle = "#111"; probeCtx.font = "900 34px Pretendard, sans-serif";
            y = wrapText(probeCtx, aiProductName.trim(), P, y + 34, W - P * 2, 44, true);
            y += 6;
        }
        if (aiEditor.trim()) {
            probeCtx.font = "500 20px Pretendard, sans-serif";
            const h = wrapText(probeCtx, aiEditor.trim(), P+40, 0, W-P*2-80, 32, true);
            y += h + 100 + 60;
        }
        y += 26; 

        const maxW = W - P * 2;
        const loaded: { img: HTMLImageElement; drawH: number }[] = [];
        for (let i = 0; i < limitedItems.length; i++) {
            try {
                const img = await loadImg(limitedItems[i].url);
                const iw = (img as any).naturalWidth || img.width || 1;
                const ih = (img as any).naturalHeight || img.height || 1;
                const scale = maxW / iw;
                const drawH = Math.round(ih * scale);
                if (y + drawH + 18 + P > MAX_HEIGHT) break;
                loaded.push({ img, drawH });
                y += drawH + 18;
            } catch (e) { continue; }
        }

        const finalH = Math.min(MAX_HEIGHT, Math.max(y + P, 1200));
        const canvas = document.createElement("canvas");
        canvas.width = W; canvas.height = finalH;
        const ctx = canvas.getContext("2d");
        if(!ctx) throw new Error();

        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        let yy = P;

        if (aiProductName.trim()) {
            ctx.save(); ctx.fillStyle = "#111"; ctx.font = "900 34px Pretendard, sans-serif"; ctx.textAlign = "center";
            yy = wrapText(ctx, aiProductName.trim(), W / 2, yy + 34, W - P * 2, 44);
            ctx.restore(); yy += 6;
        }
        if (aiEditor.trim()) {
            const boxW = W - (P * 2);
            ctx.font = "500 20px Pretendard, sans-serif";
            const tempY = wrapText(ctx, aiEditor.trim(), W/2, 0, boxW-80, 32, true);
            const boxH = tempY + 100;
            ctx.fillStyle = "#F8F9FA"; pathRoundRect(ctx, P, yy, boxW, boxH, 20); ctx.fill();
            ctx.fillStyle = "#FEE500"; pathRoundRect(ctx, P, yy, 6, boxH, 20); ctx.fill(); // Left Bar
            ctx.fillStyle = "#111"; ctx.font = "900 16px Pretendard, sans-serif"; ctx.textAlign = "center";
            ctx.fillText("MD'S COMMENT", W/2, yy + 45);
            ctx.fillStyle = "#444"; ctx.font = "500 20px Pretendard, sans-serif"; ctx.textAlign = "left";
            yy = wrapText(ctx, aiEditor.trim(), W/2, yy + 85, boxW-60, 32);
            ctx.textAlign = "left"; yy += 60;
        }

        ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(P, yy); ctx.lineTo(W - P, yy); ctx.stroke();
        yy += 24;

        for (const { img, drawH } of loaded) {
            ctx.drawImage(img, P, yy, maxW, drawH);
            yy += drawH + 18;
        }

        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
        if (!blob) throw new Error("PNG 생성 실패");
        saveAs(blob, `${nowStamp()}_detailpage.png`);
        setStatus("상세페이지 생성 완료");
    } catch (e: any) {
        setStatus("상세페이지 생성 실패: " + e.message);
    } finally {
        stopProgress();
    }
  }

  function handleAddToSampleList() {
    const chosenImage = mainItems.find((x) => x.checked && x.type === "image");
    if (!urlInput || !chosenImage || !samplePrice || !sampleOption) return alert("필수 정보를 입력해주세요.");
    const sampleItem = {
      id: Date.now(),
      url: urlInput,
      productName: aiProductName || "상품명 미지정",
      mainImage: chosenImage.url,
      price: samplePrice,
      currency: "CNY",
      optionRaw: sampleOption,
      quantity: sampleQty,
      domain: "1688",
    };
    try {
      const existing = localStorage.getItem("nana_sample_cart");
      const cart = existing ? JSON.parse(existing) : [];
      cart.push(sampleItem);
      localStorage.setItem("nana_sample_cart", JSON.stringify(cart));
      alert(`[중국사입] 리스트에 담겼습니다!\n\n상품: ${sampleItem.productName}\n옵션: ${sampleItem.optionRaw}`);
    } catch (e) { alert("저장 실패"); }
  }

  function addKw(setter: any, current: string[], raw: string) { if(raw.trim() && !current.includes(raw.trim())) setter([...current, raw.trim()]); }
  function removeKw(setter: any, current: string[], kw: string) { setter(current.filter((x) => x !== kw)); }
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#111] font-sans">
      <Navigation />
      <main className="pt-[80px]">
        {topBusyText && <div className="fixed top-[90px] left-1/2 -translate-x-1/2 z-[100] bg-[#111] text-white px-5 py-3 rounded-full shadow-xl text-sm font-bold animate-pulse">{topBusyText}</div>}
        {toastText && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] bg-white border px-4 py-3 rounded-2xl shadow-xl text-sm font-bold">{toastText}</div>}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;600;800&display=swap');
          body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
          .layout-container { max-width: 100%; margin: 0 auto; padding: 0 40px 60px; }
          .bento-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
          .bento-item { background: #F9F9FB; border-radius: 24px; padding: 32px; border: 1px solid rgba(0,0,0,0.03); }
          .span-2 { grid-column: span 2; }
          .card-thumb-wrap { width: 100%; aspect-ratio: 1/1; background: #f8f8f8; position: relative; }
          .card-thumb { width: 100%; height: 100%; object-fit: cover; }
          @media (max-width: 1024px) { .bento-grid { grid-template-columns: repeat(2, 1fr); } .span-2 { grid-column: span 2; } }
          @media (max-width: 768px) { .bento-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
        `}</style>

        <div className="layout-container">
          {/* Hero */}
          <div style={{background: "linear-gradient(135deg, #FEE500 0%, #FFF8B0 100%)", borderRadius: "32px", padding: "60px", margin: "20px 0 50px", display: "flex", justifyContent: "space-between", alignItems:"center"}}>
            <div style={{maxWidth:"600px"}}>
                <h1 style={{fontSize:"48px", fontWeight:900, marginBottom:"24px"}}>{heroTyped}<span className="animate-pulse">|</span></h1>
                <p className="text-lg opacity-60 font-medium mb-8">1688 페이지에서 확장프로그램 추출 후 불러오세요.</p>
                <div className="bg-white p-2 rounded-2xl shadow-sm flex gap-2">
                    <input className="flex-1 border-none outline-none px-4 py-3 text-lg" placeholder="1688 URL" value={urlInput} onChange={e=>setUrlInput(e.target.value)} />
                    <button onClick={()=>fetchUrlServer(urlInput)} className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition">불러오기</button>
                    <a href={EXTENSION_DOWNLOAD_URL} target="_blank" className="bg-[#7C3AED] text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition flex items-center">확장앱 다운</a>
                </div>
            </div>
            <div className="hidden lg:block opacity-90"><img src={heroImageSrc} className="w-[380px] rotate-[-5deg] drop-shadow-2xl rounded-2xl"/></div>
          </div>

          {/* Main Images */}
          <div className="mt-12">
             <div className="flex justify-between items-center mb-4 px-1">
                <div><h2 className="text-2xl font-bold">대표 이미지</h2><p className="text-gray-400 text-sm">작은 아이콘은 자동 제외됩니다.</p></div>
                <div className="flex gap-2">
                    <button className="text-sm font-bold text-gray-500 hover:bg-gray-100 px-3 py-1 rounded" onClick={()=>setMainItems(p=>p.map(x=>({...x, checked:true})))}>전체선택</button>
                    <button className="text-sm font-bold text-gray-500 hover:bg-gray-100 px-3 py-1 rounded" onClick={()=>setMainItems(p=>p.map(x=>({...x, checked:false})))}>해제</button>
                </div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {mainItems.map((it, idx) => (
                    <div key={idx} className="relative aspect-square border rounded-xl overflow-hidden bg-gray-50 group">
                        <input type="checkbox" className="absolute top-3 left-3 z-10 w-5 h-5 accent-black cursor-pointer" checked={it.checked} onChange={()=>setMainItems(p=>p.map((x,i)=>i===idx?{...x, checked:!x.checked}:x))} />
                        <img src={proxyImageUrl(it.url)} className="w-full h-full object-cover transition group-hover:scale-105" loading="lazy" onClick={()=>window.open(it.url)}/>
                    </div>
                ))}
                {!mainItems.length && <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">데이터를 불러와주세요.</div>}
             </div>
          </div>

          {/* Detail Images */}
          <div className="mt-16">
             <div className="flex justify-between items-center mb-4 px-1">
                <div><h2 className="text-2xl font-bold">상세 이미지</h2></div>
                <div className="flex gap-2">
                    <button className="text-sm font-bold text-gray-500 hover:bg-gray-100 px-3 py-1 rounded" onClick={()=>setDetailImages(p=>p.map(x=>({...x, checked:true})))}>전체선택</button>
                    <button className="text-sm font-bold text-gray-500 hover:bg-gray-100 px-3 py-1 rounded" onClick={()=>setDetailImages(p=>p.map(x=>({...x, checked:false})))}>해제</button>
                    <button className="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-bold" onClick={handleMergeAndDownloadZip}>ZIP 저장</button>
                </div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {detailImages.map((it, idx) => (
                    <div key={idx} className="relative aspect-square border rounded-xl overflow-hidden bg-gray-50 group">
                        <input type="checkbox" className="absolute top-3 left-3 z-10 w-5 h-5 accent-black cursor-pointer" checked={it.checked} onChange={()=>setDetailImages(p=>p.map((x,i)=>i===idx?{...x, checked:!x.checked}:x))} />
                        <img src={proxyImageUrl(it.url)} className="w-full h-full object-cover transition group-hover:scale-105" loading="lazy" onClick={()=>window.open(it.url)}/>
                    </div>
                ))}
             </div>
          </div>

          {/* AI & Order Section */}
          <div className="mt-20 pb-20">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">AI 마케팅 & 주문</h2>
                <div className="flex gap-2">
                    <button onClick={generateByAI} className="border-2 border-black px-5 py-2 rounded-xl font-bold hover:bg-gray-50" disabled={aiLoading}>{aiLoading?"분석 중...":"AI 생성"}</button>
                    <button onClick={handlePutDetailPage} className="bg-black text-white px-5 py-2 rounded-xl font-bold hover:bg-gray-800">상세페이지 넣기</button>
                </div>
             </div>

             <div className="bento-grid mb-10">
                <div className="bento-item span-2">
                    <div className="text-xs font-bold text-gray-400 mb-2 flex justify-between">PRODUCT NAME <span onClick={()=>copyText(aiProductName)} className="cursor-pointer bg-gray-200 px-2 rounded-full text-black">COPY</span></div>
                    <input className="w-full text-xl font-extrabold bg-transparent border-b border-gray-200 pb-2 outline-none" value={aiProductName} onChange={e=>setAiProductName(e.target.value)} placeholder="상품명 입력" />
                </div>
                <div className="bento-item span-2">
                    <div className="text-xs font-bold text-gray-400 mb-2 flex justify-between">EDITOR COPY <span onClick={()=>copyText(aiEditor)} className="cursor-pointer bg-gray-200 px-2 rounded-full text-black">COPY</span></div>
                    <textarea className="w-full text-sm font-medium bg-transparent outline-none h-[100px] resize-none" value={aiEditor} onChange={e=>setAiEditor(e.target.value)} placeholder="설명 입력" />
                </div>
                {/* Keywords (Simplified for brevity, fully functional) */}
                <div className="bento-item span-2 bg-[#111] text-white">
                    <div className="text-xs font-bold opacity-50 mb-2">COUPANG KEYWORDS</div>
                    <div className="flex flex-wrap gap-2 mb-2">{aiCoupangKeywords.map(k=><span key={k} onClick={()=>removeKw(setAiCoupangKeywords,aiCoupangKeywords,k)} className="bg-white/10 px-2 py-1 rounded-lg text-xs cursor-pointer hover:bg-red-500/50">#{k}</span>)}</div>
                    <div className="flex gap-2"><input className="bg-white/10 border-none rounded-lg px-2 py-1 text-sm flex-1 text-white" value={newCoupangKw} onChange={e=>setNewCoupangKw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addKw(setAiCoupangKeywords,aiCoupangKeywords,newCoupangKw)}/><button onClick={()=>addKw(setAiCoupangKeywords,aiCoupangKeywords,newCoupangKw)} className="bg-white/20 px-3 rounded-lg text-xs font-bold">추가</button></div>
                </div>
                <div className="bento-item span-2 bg-[#111] text-white">
                    <div className="text-xs font-bold opacity-50 mb-2">ABLY KEYWORDS</div>
                    <div className="flex flex-wrap gap-2 mb-2">{aiAblyKeywords.map(k=><span key={k} onClick={()=>removeKw(setAiAblyKeywords,aiAblyKeywords,k)} className="bg-white/10 px-2 py-1 rounded-lg text-xs cursor-pointer hover:bg-red-500/50">#{k}</span>)}</div>
                    <div className="flex gap-2"><input className="bg-white/10 border-none rounded-lg px-2 py-1 text-sm flex-1 text-white" value={newAblyKw} onChange={e=>setNewAblyKw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addKw(setAiAblyKeywords,aiAblyKeywords,newAblyKw)}/><button onClick={()=>addKw(setAiAblyKeywords,aiAblyKeywords,newAblyKw)} className="bg-white/20 px-3 rounded-lg text-xs font-bold">추가</button></div>
                </div>
             </div>

             {/* ✅ 1688 Style Sample Order */}
             <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                <div className="font-black text-xl mb-6 pb-4 border-b">샘플 주문 담기</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-5">
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">상품명</label><input className="w-full border border-gray-200 rounded-xl p-3 text-sm font-medium" value={sampleTitle} onChange={e=>setSampleTitle(e.target.value)} /></div>
                        <div className="flex gap-4">
                            <div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">가격 (CNY)</label><input className="w-full border border-gray-200 rounded-xl p-3 text-sm font-bold text-orange-600" value={samplePrice} onChange={e=>setSamplePrice(e.target.value)} /></div>
                            <div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">수량</label><input type="number" className="w-full border border-gray-200 rounded-xl p-3 text-sm" value={sampleQty} onChange={e=>setSampleQty(Number(e.target.value))} /></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">옵션 (자동입력)</label><textarea className="w-full border border-gray-200 rounded-xl p-3 text-sm min-h-[100px] bg-gray-50" value={sampleOption} readOnly /></div>
                        <button onClick={handleAddToSampleList} className="w-full bg-black text-white rounded-xl py-4 font-bold hover:bg-gray-800 shadow-lg">장바구니 담기</button>
                    </div>

                    {/* ✅ Right: 1688 Style Options (The Key Fix) */}
                    <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-gray-100">
                        {!skuGroups.length && <div className="text-center text-gray-400 py-10">옵션 정보가 없습니다.</div>}
                        
                        {skuGroups.map((g, gIdx) => {
                            const isTileType = g.items.some(it => it.img);
                            return (
                                <div key={gIdx} className="mb-6 last:mb-0">
                                    <h3 className="text-sm font-extrabold text-gray-800 mb-3">{g.title}</h3>
                                    {isTileType ? (
                                        <div className="flex flex-wrap gap-2">
                                            {g.items.map((it) => {
                                                const active = selectedSku[g.title] === it.label;
                                                return (
                                                    <button key={it.label} onClick={()=>handleSelectSku(g.title, it.label)}
                                                        className={`relative flex items-center gap-2 px-2 py-1 pr-3 rounded-md border transition-all ${active ? "border-[#FF5000] bg-[#FFF5F0]" : "border-gray-200 bg-white hover:border-gray-300"}`}
                                                    >
                                                        {it.img ? <img src={proxyImageUrl(it.img)} className="w-8 h-8 rounded object-cover border border-gray-100"/> : <div className="w-8 h-8 bg-gray-100 rounded"/>}
                                                        <span className={`text-xs ${active ? "font-bold text-[#FF5000]" : "text-gray-600"}`}>{it.label}</span>
                                                        {active && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[url('https://img.alicdn.com/tps/i4/TB1291.LXXXXXbOXXXXL.17.LXXX-12-12.png')] bg-contain bg-no-repeat"/>}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {g.items.map((it) => {
                                                const active = selectedSku[g.title] === it.label;
                                                const meta = getSkuMeta(it.label);
                                                return (
                                                    <button key={it.label} onClick={()=>handleSelectSku(g.title, it.label)}
                                                        className={`flex items-center justify-between w-full px-4 py-3 rounded-lg border transition-all text-sm ${active ? "border-[#FF5000] bg-[#FFF5F0]" : "border-gray-200 bg-white hover:border-gray-300"}`}
                                                    >
                                                        <span className={`font-medium ${active ? "text-[#FF5000]" : "text-gray-700"}`}>{it.label}</span>
                                                        <div className="flex items-center gap-4 text-xs">
                                                            {meta.price && <span className="font-bold text-gray-900">¥{meta.price}</span>}
                                                            {meta.stock && <span className="text-gray-400">재고 {meta.stock}</span>}
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
             </div>
          </div>
          <ContactForm />
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
