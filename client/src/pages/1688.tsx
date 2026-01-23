import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// [Type Definition]
type MediaItem = { type: "image" | "video"; url: string; checked?: boolean };

// [Assets & Constants]
const HERO_IMAGE_PRIMARY = "/attached_assets/generated_images/aipage.png";
const HERO_IMAGE_FALLBACK = "https://raw.githubusercontent.com/nanainternational/nana-renewal/refs/heads/main/attached_assets/generated_images/aipage.png";
const HERO_TEXT_FULL = "링크 하나로 끝내는\n상세페이지 매직.";

export default function Alibaba1688DetailPage() {
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

  // [State] Sample Order (New Feature)
  const [samplePrice, setSamplePrice] = useState("");
  const [sampleOption, setSampleOption] = useState("");
  const [sampleQty, setSampleQty] = useState(1);

  // [State] Hero UI
  const [heroTyped, setHeroTyped] = useState("");
  const [heroTypingOn, setHeroTypingOn] = useState(true);
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE_PRIMARY);

  const urlCardRef = useRef<HTMLDivElement | null>(null);
  const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || "";

  function apiUrl(p: string) {
    const base = String(API_BASE || "").trim().replace(/\/$/, "");
    if (!base) return p; 
    return base + (p.startsWith("/") ? p : "/" + p);
  }
  
  // 1688(alicdn) 이미지 핫링크 차단(403) 대응: 서버에서 referer를 붙여 프록시
  const proxyImageUrl = (u: string) => {
    if (!u) return u;
    if (!/^https?:\/\//i.test(u)) return u;
    return apiUrl(`/api/proxy/image?url=${encodeURIComponent(u)}`);
  };

  // [Helper] Fetch blob
  async function fetchSmartBlob(url: string, apiUrlStr: string): Promise<{ blob: Blob; ext: string } | null> {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        return { blob, ext: blob.type.includes('png') ? 'png' : 'jpg' };
      }
    } catch (e) {}
  
    try {
      // server image proxy
      const proxyRes = await fetch(`${apiUrlStr}?url=${encodeURIComponent(url)}`);
      if (proxyRes.ok) {
        const blob = await proxyRes.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        return { blob, ext };
      }
    } catch (e) {
      console.error("다운로드 실패:", e);
    }
    return null;
  }

  // [Utility] Date stamp
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
    } catch { return false; }
  }

  // [Effect] Typing Effect & Image Fallback
  useEffect(() => {
    const img = new Image();
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

  // [Helper] Progress
  function startProgress(msg: string) {
    setTopBusyText(msg);
  }
  function stopProgress() {
    setTopBusyText("");
  }

  // ============================================================
  // 🔥 [핵심 수정] 서버에 저장된 최신 데이터 불러오기
  // ============================================================
  async function fetchUrlServer() {
    // 1. 상태 초기화
    setUrlLoading(true);
    startProgress("확장프로그램 데이터 불러오는 중...");
    setStatus("");

    try {
      // 2. 확장프로그램이 저장해둔 데이터 요청 (/api/1688/latest)
      const res = await fetch(apiUrl("/api/1688/latest"));
      const data = await res.json();

      // 3. 데이터가 없는 경우 (확장프로그램 실행 안 함)
      if (!res.ok || !data.ok) {
        const msg = data.message || "데이터를 불러올 수 없습니다.";
        if (msg.includes("없습니다")) {
            alert("⚠️ 아직 추출된 데이터가 없습니다.\n\n1. 1688 상품 페이지로 이동하세요.\n2. 브라우저 우측 상단 'N' 확장프로그램 아이콘을 클릭하세요.\n3. 알림창이 뜨면 다시 '불러오기' 버튼을 눌러주세요.");
        }
        throw new Error(msg);
      }

      // 4. 데이터 적용
      if (data.url) setUrlInput(data.url); // URL 자동 입력
      if (data.product_name) setAiProductName(data.product_name); // 상품명 자동 입력

      const mm = (data.main_media || []).map((x: any) => ({ type: "image", url: x.url, checked: true }));
      const dm = (data.detail_media || []).map((x: any) => ({ type: "image", url: x.url, checked: true }));

      setMainItems(mm);
      setDetailImages(dm);
      setDetailVideos([]); // 비디오는 현재 제외 (필요 시 추가)
      
      setStatus(`성공! 대표 ${mm.length}장, 상세 ${dm.length}장을 불러왔습니다.`);
      
    } catch (e: any) {
      setStatus(e.message);
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
    startProgress("AI가 상품을 분석하고 있습니다...");
    try {
      const res = await fetch(apiUrl("/api/1688/ai"), {
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
      
      // Stitch API 호출
      if (selectedDetailUrls.length > 0) {
        const res = await fetch(apiUrl("/api/1688/stitch"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: selectedDetailUrls }),
        });
        if (res.ok) {
          const stitchBlob = await res.blob();
          zip.file(`stitched_${folderName}.png`, stitchBlob);
        }
      }

      // 개별 다운로드
      if (selectedMainItems.length > 0) {
        for (let i = 0; i < selectedMainItems.length; i++) {
            const result = await fetchSmartBlob(selectedMainItems[i].url, apiUrl("/api/proxy/image"));
            if (result) zip.file(`main_${String(i+1).padStart(2,'0')}.${result.ext}`, result.blob);
        }
      }

      if (selectedDetailUrls.length > 0) {
        for (let i = 0; i < selectedDetailUrls.length; i++) {
            const result = await fetchSmartBlob(selectedDetailUrls[i], apiUrl("/api/proxy/image"));
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
  
  // [Func] Canvas Text Helper
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, measureOnly = false) {
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
        const stitchRes = await fetch(apiUrl("/api/1688/stitch"), {
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
        
        // 디자인 파라미터
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

        // 높이 계산
        if (dummyCtx && (aiProductName || aiEditor)) {
            dummyCtx.font = `800 ${titleFontSize}px Pretendard, sans-serif`;
            const h1 = aiProductName ? wrapText(dummyCtx, aiProductName, 0, 0, canvasWidth - paddingX * 2, titleFontSize * 1.3, true) : 0;
            
            const hDivider = (aiProductName && aiEditor) ? gapTitleEditor : 0;

            dummyCtx.font = `400 ${editorFontSize}px Pretendard, sans-serif`;
            const h2 = aiEditor ? wrapText(dummyCtx, aiEditor, 0, 0, canvasWidth - paddingX * 2, editorFontSize * 1.6, true) : 0;

            headerHeight = paddingTop + h1 + hDivider + h2 + gapEditorImage;
        }

        canvas.width = canvasWidth;
        canvas.height = headerHeight + imgBitmap.height;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 헤더 그리기
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
    } finally {
        setTopBusyText("");
    }
  }

  // [Func] Sample Order
  function handleAddToSampleList() {
    const chosenImage = mainItems.find(x => x.checked && x.type === 'image');
    if (!urlInput) { alert("데이터를 먼저 불러와주세요."); return; }
    if (!chosenImage) { alert("대표 이미지를 선택해주세요."); return; }
    if (!samplePrice) { alert("예상 단가를 입력해주세요."); return; }
    if (!sampleOption) { alert("옵션 내용을 입력해주세요."); return; }

    const sampleItem = {
      id: Date.now(),
      url: urlInput,
      productName: aiProductName || "상품명 미지정",
      mainImage: chosenImage.url,
      price: samplePrice,
      currency: "CNY",
      optionRaw: sampleOption,
      quantity: sampleQty,
      domain: "1688"
    };

    try {
      const existing = localStorage.getItem("nana_sample_cart");
      const cart = existing ? JSON.parse(existing) : [];
      cart.push(sampleItem);
      localStorage.setItem("nana_sample_cart", JSON.stringify(cart));
      
      alert(`[중국사입] 리스트에 담겼습니다!\n\n상품: ${sampleItem.productName}\n옵션: ${sampleItem.optionRaw}\n수량: ${sampleItem.quantity}`);
    } catch (e) {
      alert("장바구니 저장 실패");
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
            color: #666;
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

          .sample-order-wrap { background: #fff; border-radius: 24px; border: 1px solid #eee; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
          .sample-flex { display: flex; gap: 30px; align-items: flex-start; }
          .sample-preview { width: 150px; height: 150px; border-radius: 12px; overflow: hidden; background: #f8f8f8; flex-shrink: 0; border: 1px solid #eee; }
          .sample-preview img { width: 100%; height: 100%; object-fit: cover; }
          .sample-form { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .form-group { display: flex; flex-direction: column; gap: 8px; }
          .form-label { font-size: 13px; font-weight: 700; color: #555; }
          .form-input { padding: 12px 16px; border: 1px solid #ddd; border-radius: 10px; font-size: 14px; outline: none; transition: 0.2s; }
          .form-input:focus { border-color: #111; }
          .form-textarea { padding: 12px 16px; border: 1px solid #ddd; border-radius: 10px; font-size: 14px; outline: none; resize: none; min-height: 80px; }
          
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
            
            .sample-flex { flex-direction: column; }
            .sample-preview { width: 100%; height: 200px; }
            .sample-form { grid-template-columns: 1fr; }
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
                  placeholder="확장프로그램 실행 후 버튼을 눌러주세요" 
                  value={urlInput}
                  readOnly 
                />
                <button className="hero-btn" onClick={() => fetchUrlServer()} disabled={urlLoading}>
                  {urlLoading ? "불러오는 중..." : "방금 추출한 데이터 불러오기"}
                </button>
              </div>
              {status && <div className="mt-4 text-sm font-bold text-black/60">{status}</div>}
            </div>
            {/* Decorative Element */}
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
                      : <img src={proxyImageUrl(it.url)} className="card-thumb" loading="lazy" />
                    }
                  </div>
                  <div className="card-actions">
                    <span className="card-badge">#{String(idx+1).padStart(2,'0')}</span>
                    <div className="card-btn-group">
                      <button className="card-mini-btn" onClick={() => window.open(proxyImageUrl(it.url))}>↗</button>
                    </div>
                  </div>
                </div>
              ))}
              {!mainItems.length && (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                  데이터 불러오기 버튼을 눌러주세요.
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
                    <img src={proxyImageUrl(it.url)} className="card-thumb" loading="lazy" />
                  </div>
                  <div className="card-actions">
                    <span className="card-badge">DETAIL</span>
                    <div className="card-btn-group">
                      <button className="card-mini-btn" onClick={() => window.open(proxyImageUrl(it.url))}>↗</button>
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

          {/* 5. Sample Order */}
          <div className="mt-20 pb-20">
            <div className="section-header">
              <div>
                <h2 className="section-title">샘플 주문 담기</h2>
                <p className="section-desc">현재 상품 정보를 확인하고 중국사입 리스트에 추가합니다.</p>
              </div>
            </div>

            <div className="sample-order-wrap">
              <div className="sample-flex">
                <div className="sample-preview">
                  {mainItems.find(x => x.checked && x.type === 'image') ? (
                    <img src={proxyImageUrl(mainItems.find(x => x.checked && x.type === 'image')!.url)} alt="Main" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">No Image</div>
                  )}
                </div>

                <div className="sample-form">
                  <div className="form-group span-2">
                    <label className="form-label">상품명 (자동입력)</label>
                    <input 
                      type="text" 
                      className="form-input bg-gray-50" 
                      value={aiProductName || "AI 생성 전입니다."} 
                      readOnly 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">예상 단가 (CNY)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="예: 58.00" 
                      value={samplePrice}
                      onChange={(e) => setSamplePrice(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">주문 수량</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={sampleQty}
                      min={1}
                      onChange={(e) => setSampleQty(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group span-2">
                    <label className="form-label">옵션 (색상 / 사이즈 등 원문 입력)</label>
                    <textarea 
                      className="form-textarea" 
                      placeholder="예: 블랙 / Free 사이즈"
                      value={sampleOption}
                      onChange={(e) => setSampleOption(e.target.value)}
                    />
                  </div>
                  
                  <div className="span-2">
                    <button className="btn-black w-full py-4 text-base" onClick={handleAddToSampleList}>
                      중국사입 리스트에 담기
                    </button>
                  </div>
                </div>
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
