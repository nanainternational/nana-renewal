import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type MediaItem = { type: "image" | "video"; url: string; checked?: boolean };

type OptionGroup = { name: string; values: string[] };
type SampleOrder = {
  id: string;
  source: "vvic";
  url: string;
  title: string;
  main_image: string;
  unit_price: string; // 표시용(￥ 포함 가능)
  quantity: number;
  options_raw: string;
  groups: OptionGroup[];
  selection: Record<string, string>;
  created_at: string;
};

const HERO_IMAGE_PRIMARY = "/attached_assets/generated_images/aipage.png";
const HERO_IMAGE_FALLBACK = "https://raw.githubusercontent.com/nanainternational/nana-renewal/refs/heads/main/attached_assets/generated_images/aipage.png";
const HERO_TEXT_FULL = "링크 하나로 끝내는\n상세페이지 매직.";

function nowStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return yy + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes());
}

function nowIso() {
  const d = new Date();
  return d.toISOString();
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

function safeParseJson<T = any>(s: string): T | null {
  try { return JSON.parse(s); } catch { return null; }
}

export default function VvicDetailPage() {
  const [urlInput, setUrlInput] = useState("");
  const [status, setStatus] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [topBusyText, setTopBusyText] = useState("");
  const progressTimerRef = useRef<number | null>(null);
  const [mainItems, setMainItems] = useState<MediaItem[]>([]);
  const [detailImages, setDetailImages] = useState<MediaItem[]>([]);
  const [detailVideos, setDetailVideos] = useState<MediaItem[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProductName, setAiProductName] = useState("");
  const [aiEditor, setAiEditor] = useState("");
  const [aiCoupangKeywords, setAiCoupangKeywords] = useState<string[]>([]);
  const [aiAblyKeywords, setAiAblyKeywords] = useState<string[]>([]);

  // [신규] VVIC 샘플 주문
  const ORDER_LS_KEY = "nana_sample_orders_vvic";
  const [orderTitle, setOrderTitle] = useState("");
  const [orderImage, setOrderImage] = useState("");
  const [orderUnitPrice, setOrderUnitPrice] = useState("");
  const [orderQty, setOrderQty] = useState(1);
  const [orderOptionsRaw, setOrderOptionsRaw] = useState("");
  const [orderGroups, setOrderGroups] = useState<OptionGroup[]>([]);
  const [orderSelection, setOrderSelection] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<SampleOrder[]>([]);

  // [신규] 확장프로그램/붙여넣기 입력(옵션 자동 채우기용)
  const [orderPaste, setOrderPaste] = useState("");

  const [heroTyped, setHeroTyped] = useState("");
  const [heroTypingOn, setHeroTypingOn] = useState(true);
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE_PRIMARY);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {};
    img.onerror = () => {
      if (heroImageSrc !== HERO_IMAGE_FALLBACK) setHeroImageSrc(HERO_IMAGE_FALLBACK);
    };
    img.src = heroImageSrc;
  }, [heroImageSrc]);

  const urlCardRef = useRef<HTMLDivElement | null>(null);
  const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || "";

  function apiUrl(p: string) {
    const base = String(API_BASE || "").trim().replace(/\/$/, "");
    if (!base) return p; 
    return base + (p.startsWith("/") ? p : "/" + p);
  }

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

  // [신규] 로컬 저장 로드
  useEffect(() => {
    const raw = localStorage.getItem(ORDER_LS_KEY);
    if (!raw) return;
    const parsed = safeParseJson<SampleOrder[]>(raw);
    if (parsed && Array.isArray(parsed)) setOrders(parsed);
  }, []);

  function saveOrders(next: SampleOrder[]) {
    setOrders(next);
    try { localStorage.setItem(ORDER_LS_KEY, JSON.stringify(next)); } catch {}
  }

  const selectedMainImage = useMemo(() => {
    const chosen = (mainItems || []).find((x) => x.checked && x.type === "image") || (mainItems || [])[0];
    return chosen?.url || "";
  }, [mainItems]);

  // [신규] 기본 주문 값 자동 채움
  useEffect(() => {
    if (selectedMainImage && !orderImage) setOrderImage(selectedMainImage);
  }, [selectedMainImage]);

  useEffect(() => {
    if (aiProductName && !orderTitle) setOrderTitle(aiProductName);
  }, [aiProductName]);

  async function fetchUrlServer(url: string) {
    const steps = ["이미지 스캔 중...", "데이터 구조화 중...", "최적화 중..."];
    setUrlLoading(true);
    startProgress(steps);
    try {
      const u = (urlInput || "").trim();
      if (!u) { setStatus("URL을 입력해주세요."); return; }
      
      const api = apiUrl("/api/vvic/extract?url=" + encodeURIComponent(u));
      const res = await fetch(api);
      let data: any = null;
      try { data = await res.json(); } catch { }
      if (!res.ok || !data.ok) throw new Error(data.error || "서버 에러");

      const mm = (data.main_media || []).map((x: any) => ({ type: x.type === "video" ? "video" : "image", url: x.url, checked: true }));
      const dm = (data.detail_media || []).map((x: any) => ({ type: x.type === "video" ? "video" : "image", url: x.url, checked: true }));

      setMainItems(mm);
      setDetailImages(dm.filter((x: any) => x.type === "image"));
      setDetailVideos(dm.filter((x: any) => x.type === "video"));

      // [신규] 샘플 주문 URL 기본값
      if (!orderImage && mm.length && mm[0].type === "image") setOrderImage(mm[0].url);

      setStatus("데이터 추출 완료");
    } catch (e: any) {
      setStatus("Error: " + e.message);
    } finally {
      setUrlLoading(false);
      stopProgress();
    }
  }

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
        const res = await fetch(apiUrl("/api/vvic/stitch"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: selectedDetailUrls }),
        });
        if (res.ok) {
          const stitchBlob = await res.blob();
          zip.file(`stitched_${folderName}.png`, stitchBlob);
        }
      }

      if (selectedMainItems.length > 0) {
        setStatus(`대표 이미지 다운로드 중...`);
        for (let i = 0; i < selectedMainItems.length; i++) {
            const result = await fetchSmartBlob(selectedMainItems[i].url, apiUrl("/api/vvic/stitch"));
            if (result) zip.file(`main_${String(i+1).padStart(2,'0')}.${result.ext}`, result.blob);
        }
      }

      if (selectedDetailUrls.length > 0) {
        setStatus(`상세 이미지 다운로드 중...`);
        for (let i = 0; i < selectedDetailUrls.length; i++) {
            const result = await fetchSmartBlob(selectedDetailUrls[i], apiUrl("/api/vvic/stitch"));
            if (result) zip.file(`detail_${String(i+1).padStart(2,'0')}.${result.ext}`, result.blob);
        }
      }

      setStatus("압축 파일 생성 중...");
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}.zip`);
      setStatus("다운로드 완료! 압축을 풀어주세요.");
    } catch (e: any) {
      setStatus("다운로드 실패: " + e.message);
    } finally {
      setTopBusyText("");
    }
  }

  async function handleCreateFullDetailPage() {
    const selectedDetailUrls = detailImages.filter(x => x.checked).map(x => x.url);
    if (!selectedDetailUrls.length) {
        setStatus("선택된 상세 이미지가 없습니다.");
        return;
    }
    
    setTopBusyText("상세페이지 디자인 중...");
    setStatus("이미지 합치는 중...");

    try {
        const stitchRes = await fetch(apiUrl("/api/vvic/stitch"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: selectedDetailUrls }),
        });
        if (!stitchRes.ok) throw new Error("이미지 합치기 실패");
        const stitchBlob = await stitchRes.blob();
        
        const imgBitmap = await createImageBitmap(stitchBlob);
        
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
        } else {
            headerHeight = 0;
        }

        canvas.width = canvasWidth;
        canvas.height = headerHeight + imgBitmap.height;

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
        
        canvas.toBlob((blob) => {
            if (blob) {
                saveAs(blob, `detailpage_designed_${nowStamp()}.png`);
                setStatus("디자인 상세페이지 생성 완료!");
            } else {
                setStatus("이미지 변환 실패");
            }
        }, "image/png");

    } catch (e: any) {
        setStatus("상세페이지 생성 실패: " + e.message);
        console.error(e);
    } finally {
        setTopBusyText("");
    }
  }

  // [신규] 붙여넣기로 옵션/가격/상품명 자동 주입 (확장프로그램 결과를 그대로 붙여넣는 용도)
  function applyPastedOrderData() {
    const raw = (orderPaste || "").trim();
    if (!raw) { setStatus("붙여넣기 데이터가 없습니다."); return; }

    // 1) JSON 시도
    const j = safeParseJson<any>(raw);
    if (j) {
      // { title, main_image, unit_price, quantity, options_raw, groups, selection }
      if (typeof j.title === "string" && j.title.trim()) setOrderTitle(j.title.trim());
      if (typeof j.main_image === "string" && j.main_image.trim()) setOrderImage(j.main_image.trim());
      if (typeof j.unit_price === "string" && j.unit_price.trim()) setOrderUnitPrice(j.unit_price.trim());
      if (typeof j.quantity === "number" && j.quantity > 0) setOrderQty(Math.floor(j.quantity));
      if (typeof j.options_raw === "string") setOrderOptionsRaw(j.options_raw);

      if (Array.isArray(j.groups)) {
        const g: OptionGroup[] = j.groups
          .filter((x: any) => x && typeof x.name === "string" && Array.isArray(x.values))
          .map((x: any) => ({ name: String(x.name), values: x.values.map((v: any) => String(v)) }));
        setOrderGroups(g);
      }
      if (j.selection && typeof j.selection === "object") {
        const sel: Record<string, string> = {};
        Object.keys(j.selection).forEach((k) => (sel[String(k)] = String(j.selection[k])));
        setOrderSelection(sel);
      }
      setStatus("붙여넣기 데이터 적용 완료");
      return;
    }

    // 2) 간단 텍스트 포맷 지원: "컬러=화이트,블랙; 사이즈=S,M,L" 같은 형태
    // 아주 러프하게 groups만 생성
    const parts = raw.split(";").map((x) => x.trim()).filter(Boolean);
    if (parts.length) {
      const nextGroups: OptionGroup[] = [];
      const nextSel: Record<string, string> = { ...orderSelection };
      parts.forEach((p) => {
        const [k, v] = p.split("=").map((x) => x.trim());
        if (!k || !v) return;
        const vals = v.split(",").map((x) => x.trim()).filter(Boolean);
        if (!vals.length) return;
        nextGroups.push({ name: k, values: vals });
        if (!nextSel[k]) nextSel[k] = vals[0];
      });
      if (nextGroups.length) {
        setOrderGroups(nextGroups);
        setOrderSelection(nextSel);
        setOrderOptionsRaw(raw);
        setStatus("옵션 텍스트를 옵션 그룹으로 변환했습니다.");
        return;
      }
    }

    setStatus("붙여넣기 데이터를 인식하지 못했습니다. (JSON 권장)");
  }

  function addGroup(name: string, csvValues: string) {
    const n = (name || "").trim();
    if (!n) return;

    const values = (csvValues || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const next = [...orderGroups];
    const idx = next.findIndex((g) => g.name === n);
    if (idx >= 0) {
      const merged = Array.from(new Set([...(next[idx].values || []), ...values]));
      next[idx] = { name: n, values: merged };
    } else {
      next.push({ name: n, values: values.length ? values : [""] });
    }

    const sel = { ...orderSelection };
    if (!sel[n]) sel[n] = (next.find((g) => g.name === n)?.values || [""])[0] || "";
    setOrderGroups(next);
    setOrderSelection(sel);
  }

  function removeGroup(name: string) {
    const next = orderGroups.filter((g) => g.name !== name);
    const sel = { ...orderSelection };
    delete sel[name];
    setOrderGroups(next);
    setOrderSelection(sel);
  }

  function setSelection(name: string, value: string) {
    setOrderSelection((prev) => ({ ...prev, [name]: value }));
  }

  function addToOrders() {
    const u = (urlInput || "").trim();
    if (!u) { setStatus("먼저 VVIC URL을 입력해주세요."); return; }
    if (!orderTitle.trim()) { setStatus("상품명을 입력해주세요."); return; }
    if (!orderImage.trim()) { setStatus("대표이미지가 비어있습니다."); return; }
    if (!orderUnitPrice.trim()) { setStatus("판매가(단가)를 입력해주세요."); return; }
    if (!orderQty || orderQty < 1) { setStatus("수량은 1 이상이어야 합니다."); return; }

    const o: SampleOrder = {
      id: uid(),
      source: "vvic",
      url: u,
      title: orderTitle.trim(),
      main_image: orderImage.trim(),
      unit_price: orderUnitPrice.trim(),
      quantity: Math.floor(orderQty),
      options_raw: orderOptionsRaw || "",
      groups: orderGroups || [],
      selection: orderSelection || {},
      created_at: nowIso(),
    };

    const next = [o, ...orders];
    saveOrders(next);
    setStatus("샘플 주문에 담았습니다.");
  }

  function removeOrder(id: string) {
    const next = orders.filter((x) => x.id !== id);
    saveOrders(next);
  }

  function clearOrders() {
    saveOrders([]);
    setStatus("샘플 주문 리스트를 비웠습니다.");
  }

  function makeOrderText(o: SampleOrder) {
    const sel = Object.keys(o.selection || {})
      .map((k) => `${k}:${o.selection[k]}`)
      .join(" / ");
    return [
      `상품명: ${o.title}`,
      `판매가: ${o.unit_price}`,
      `수량: ${o.quantity}`,
      sel ? `옵션: ${sel}` : (o.options_raw ? `옵션: ${o.options_raw}` : ""),
      `URL: ${o.url}`,
    ].filter(Boolean).join("\n");
  }

  const totalOrdersCount = orders.length;

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

          /* Sample Order */
          .order-wrap { background: #fff; border: 1px solid #eee; border-radius: 24px; padding: 28px; }
          .order-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px; }
          .order-field { display: flex; flex-direction: column; gap: 8px; }
          .order-label { font-size: 12px; font-weight: 800; color: #777; letter-spacing: 0.4px; }
          .order-input { border: 1px solid #eee; border-radius: 14px; padding: 12px 14px; outline: none; font-size: 14px; }
          .order-input:focus { border-color: #111; }
          .order-row { display: flex; gap: 10px; align-items: center; }
          .order-img { width: 100%; max-width: 220px; aspect-ratio: 1/1; object-fit: cover; border-radius: 18px; border: 1px solid #eee; background: #f8f8f8; }
          .order-group { border: 1px solid #f1f1f1; border-radius: 16px; padding: 14px; background: #fafafa; }
          .order-group-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          .order-group-name { font-weight: 800; }
          .order-mini { font-size: 12px; color: #777; }
          .order-list { margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
          .order-card { border: 1px solid #eee; border-radius: 18px; padding: 14px; background: #fff; }
          .order-card-top { display: flex; gap: 12px; }
          .order-card-img { width: 64px; height: 64px; border-radius: 14px; object-fit: cover; border: 1px solid #eee; background: #f8f8f8; }
          .order-card-title { font-weight: 800; font-size: 14px; line-height: 1.25; }
          .order-card-meta { font-size: 12px; color: #666; margin-top: 6px; white-space: pre-wrap; }
          .order-card-actions { display: flex; gap: 6px; margin-top: 12px; }
          
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
            .order-grid { grid-template-columns: 1fr; }
            .order-img { max-width: 100%; }
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
                  placeholder="https://www.vvic.com/item/..." 
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
                <p className="section-desc">AI 분석의 기준이 될 이미지를 선택해주세요.</p>
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
                  readOnly 
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
                  readOnly 
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

          {/* 5. [신규 섹션] VVIC 샘플 주문 */}
          <div className="mt-20 pb-20">
            <div className="section-header">
              <div>
                <h2 className="section-title">샘플 주문</h2>
                <p className="section-desc">주문에 필요한 정보(상품명/옵션/판매가/수량)를 정리해서 저장합니다. (옵션은 확장프로그램 데이터 붙여넣기 지원)</p>
              </div>
              <div className="flex gap-2 items-center">
                <button className="btn-text" onClick={() => copyText(JSON.stringify(orders || [], null, 2))}>리스트 JSON 복사</button>
                <button className="btn-text" onClick={clearOrders} disabled={!totalOrdersCount}>전체 비우기</button>
              </div>
            </div>

            <div className="order-wrap">
              <div className="order-grid">
                <div>
                  <div className="order-row" style={{ alignItems: "flex-start" }}>
                    <img className="order-img" src={orderImage || selectedMainImage || ""} onError={(e) => ((e.currentTarget.style.opacity = "0.2"))} />
                    <div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div className="order-field">
                        <div className="order-label">상품명</div>
                        <input className="order-input" value={orderTitle} onChange={(e) => setOrderTitle(e.target.value)} placeholder="상품명을 입력" />
                      </div>

                      <div className="order-row">
                        <div className="order-field" style={{ flex: 1 }}>
                          <div className="order-label">판매가(단가)</div>
                          <input className="order-input" value={orderUnitPrice} onChange={(e) => setOrderUnitPrice(e.target.value)} placeholder="예: ￥45.00" />
                        </div>
                        <div className="order-field" style={{ width: 140 }}>
                          <div className="order-label">수량</div>
                          <input
                            className="order-input"
                            type="number"
                            min={1}
                            value={orderQty}
                            onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
                          />
                        </div>
                      </div>

                      <div className="order-field">
                        <div className="order-label">옵션 원문 (보이는 그대로)</div>
                        <input className="order-input" value={orderOptionsRaw} onChange={(e) => setOrderOptionsRaw(e.target.value)} placeholder="예: 컬러=화이트,블랙; 사이즈=S,M,L" />
                      </div>

                      <div className="order-field">
                        <div className="order-label">확장프로그램 데이터 붙여넣기 (JSON 권장)</div>
                        <div className="order-row">
                          <input className="order-input" style={{ flex: 1 }} value={orderPaste} onChange={(e) => setOrderPaste(e.target.value)} placeholder='{"title":"...","unit_price":"￥...","groups":[...],"selection":{...}}' />
                          <button className="btn-black" onClick={applyPastedOrderData}>적용</button>
                        </div>
                        <div className="order-mini">JSON이 아니면 "컬러=화이트,블랙; 사이즈=S,M,L" 형태도 지원합니다.</div>
                      </div>

                      <div className="order-row">
                        <button className="btn-black bg-[#FEE500] text-black hover:bg-[#ffe923]" onClick={addToOrders}>
                          샘플 주문 담기
                        </button>
                        <button className="btn-outline-black" onClick={() => { setOrderTitle(aiProductName || orderTitle); setOrderImage(selectedMainImage || orderImage); }}>
                          현재 분석값 채우기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="order-field">
                    <div className="order-label">옵션 그룹 (컬러/사이즈/기타 확장 가능)</div>

                    <div className="order-row" style={{ marginBottom: 10 }}>
                      <input className="order-input" style={{ flex: 1 }} placeholder="그룹명 (예: 컬러)" id="opt_g_name" />
                      <input className="order-input" style={{ flex: 1 }} placeholder="값들 (예: 화이트,블랙)" id="opt_g_vals" />
                      <button
                        className="btn-black"
                        onClick={() => {
                          const nameEl = document.getElementById("opt_g_name") as HTMLInputElement | null;
                          const valEl = document.getElementById("opt_g_vals") as HTMLInputElement | null;
                          const n = nameEl?.value || "";
                          const v = valEl?.value || "";
                          addGroup(n, v);
                          if (nameEl) nameEl.value = "";
                          if (valEl) valEl.value = "";
                        }}
                      >
                        추가
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {orderGroups.length === 0 && (
                        <div className="order-mini">옵션이 없으면 비워도 됩니다. (원문 옵션만 저장해도 됨)</div>
                      )}

                      {orderGroups.map((g, idx) => (
                        <div className="order-group" key={idx}>
                          <div className="order-group-head">
                            <div className="order-group-name">{g.name}</div>
                            <button className="btn-text" onClick={() => removeGroup(g.name)}>삭제</button>
                          </div>
                          <div className="order-row">
                            <select className="order-input" style={{ flex: 1 }} value={orderSelection[g.name] || ""} onChange={(e) => setSelection(g.name, e.target.value)}>
                              {(g.values || []).map((v, i) => (
                                <option key={i} value={v}>{v}</option>
                              ))}
                            </select>
                            <button
                              className="btn-outline-black"
                              onClick={() => {
                                const addv = prompt(`${g.name} 값 추가 (콤마로 여러 개 가능)`) || "";
                                if (addv.trim()) addGroup(g.name, addv);
                              }}
                            >
                              값 추가
                            </button>
                          </div>
                          <div className="order-mini">값: {(g.values || []).join(", ")}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="order-field" style={{ marginTop: 14 }}>
                    <div className="order-label">현재 선택(요약)</div>
                    <div className="order-mini" style={{ whiteSpace: "pre-wrap" }}>
                      {Object.keys(orderSelection || {}).length
                        ? Object.keys(orderSelection).map((k) => `${k}: ${orderSelection[k]}`).join("\n")
                        : (orderOptionsRaw ? orderOptionsRaw : "선택 없음")}
                    </div>
                  </div>
                </div>
              </div>

              {/* 주문 리스트 */}
              <div className="order-list">
                {orders.map((o) => (
                  <div className="order-card" key={o.id}>
                    <div className="order-card-top">
                      <img className="order-card-img" src={o.main_image} />
                      <div style={{ flex: 1 }}>
                        <div className="order-card-title">{o.title}</div>
                        <div className="order-card-meta">
                          {`판매가: ${o.unit_price}\n수량: ${o.quantity}`}
                          {Object.keys(o.selection || {}).length ? `\n옵션: ${Object.keys(o.selection).map((k) => `${k}:${o.selection[k]}`).join(" / ")}` : (o.options_raw ? `\n옵션: ${o.options_raw}` : "")}
                        </div>
                      </div>
                    </div>
                    <div className="order-card-actions">
                      <button className="btn-text" onClick={() => window.open(o.url)}>VVIC 열기</button>
                      <button className="btn-text" onClick={() => copyText(makeOrderText(o))}>복사</button>
                      <button className="btn-text" onClick={() => removeOrder(o.id)}>삭제</button>
                    </div>
                  </div>
                ))}
                {!orders.length && (
                  <div className="col-span-full py-10 text-center text-gray-300 text-sm">
                    아직 담긴 주문이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
