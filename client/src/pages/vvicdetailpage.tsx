import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
// [중요] 배경 제거 라이브러리 (@imgly/background-removal)
type MediaItem = { type: "image" | "video"; url: string; checked?: boolean };
const HERO_IMAGE_PRIMARY = "/attached_assets/generated_images/aipage.png";
const HERO_IMAGE_FALLBACK = "https://raw.githubusercontent.com/nanainternational/nana-renewal/refs/heads/main/attached_assets/generated_images/aipage.png";
const HERO_TEXT_FULL = "링크 하나로 끝내는\n상세페이지 매직.";

function nowStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return yy + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes());
}

async function imglyRemoveBackground(input: Blob) {
  // ✅ @imgly/background-removal export 형태가 환경에 따라 default/named로 달라질 수 있어 동적 import로 안전 처리
  const mod: any = await import("@imgly/background-removal");
  const fn =
    mod?.removeBackground ||
    mod?.default?.removeBackground ||
    mod?.default ||
    null;

  if (!fn) throw new Error("배경 제거 모듈 로딩 실패(removeBackground 없음)");

  // removeBackground는 보통 Blob/File/HTMLImageElement 등을 받음
  return await fn(input);
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

  // [상태] 배경제거 관련 State
  const [rmBgFile, setRmBgFile] = useState<File | null>(null);
  const [rmBgImage, setRmBgImage] = useState<string | null>(null);
  const [rmBgResult, setRmBgResult] = useState<string | null>(null);
  const [rmBgBlob, setRmBgBlob] = useState<Blob | null>(null);
  const [rmBgLoading, setRmBgLoading] = useState(false);

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


  // [기능] 이미지 업로드 시 실행되는 함수
  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 기존 URL 해제(메모리 누수 방지)
    if (rmBgImage) URL.revokeObjectURL(rmBgImage);
    if (rmBgResult) URL.revokeObjectURL(rmBgResult);

    const url = URL.createObjectURL(file);
    setRmBgFile(file);
    setRmBgImage(url);
    setRmBgResult(null);
    setRmBgBlob(null);
    setStatus("업로드 완료. 배경 제거 실행을 눌러주세요.");
  };


  // [기능] AI 배경 제거 실행 함수
  async function handleRemoveBackground() {
    if (!rmBgFile) {
      setStatus("이미지를 업로드해주세요.");
      return;
    }

    setRmBgLoading(true);
    setTopBusyText("배경 제거 중...");
    setStatus("배경 제거 중...");

    try {
      // ✅ @imgly/background-removal: 브라우저에서 고품질 누끼(투명 PNG) 생성
      // - 반환값은 Blob(이미지/png) 입니다.
      const outBlob = await imglyRemoveBackground(rmBgFile);

      if (rmBgResult) URL.revokeObjectURL(rmBgResult);
      const outUrl = URL.createObjectURL(outBlob);

      setRmBgBlob(outBlob);
      setRmBgResult(outUrl);
      setStatus("배경 제거가 완료되었습니다.");
    } catch (e: any) {
      console.error(e);
      setStatus("배경 제거 실패: " + (e?.message || "unknown"));
    } finally {
      setRmBgLoading(false);
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

          /* Background Remover Styles */
          .bg-remover-wrap { display: flex; gap: 20px; align-items: flex-start; }
          .bg-remover-card { flex: 1; background: #fff; border-radius: 20px; border: 1px solid #eee; padding: 20px; position: relative; min-height: 300px; display: flex; align-items: center; justify-content: center; flex-direction: column; overflow: hidden; }
          .bg-remover-preview { max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 12px; }
          .bg-check-pattern { background-image: linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; }
          
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
            
            .bg-remover-wrap { flex-direction: column; }
            .bg-remover-card { width: 100%; min-height: 250px; }
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

          {/* 5. [신규 섹션] AI 배경 제거 (업로드 방식) */}
          <div className="mt-20 pb-20">
            <div className="section-header">
              <div>
                <h2 className="section-title">AI 배경 제거 (Beta)</h2>
                <p className="section-desc">인물 사진을 업로드하면 배경을 투명하게 만들어드립니다.</p>
              </div>
            </div>

            <div className="bg-remover-wrap">
              {/* 왼쪽: 입력 카드 */}
              <div className="bg-remover-card">
                {rmBgImage ? (
                  <img src={rmBgImage} alt="Original" className="bg-remover-preview" />
                ) : (
                  <div className="text-center p-8">
                    <div className="text-4xl mb-4">🖼️</div>
                    <p className="text-gray-400 font-medium">이미지를 업로드해주세요</p>
                  </div>
                )}
                <div className="mt-6 flex gap-2">
                  <label className="btn-outline-black cursor-pointer">
                    이미지 선택
                    {/* 업로드 방식 구현 */}
                    <input type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />
                  </label>
                  {rmBgImage && (
                    <button className="btn-black" onClick={handleRemoveBackground} disabled={rmBgLoading}>
                      {rmBgLoading ? "제거 중..." : "배경 제거 실행"}
                    </button>
                  )}
                </div>
              </div>

              {/* 오른쪽: 결과 카드 */}
              <div className="bg-remover-card bg-check-pattern">
                {rmBgResult ? (
                  <img src={rmBgResult} alt="Result" className="bg-remover-preview" />
                ) : (
                  <div className="text-center p-8 opacity-40">
                    <div className="text-4xl mb-4">✨</div>
                    <p className="font-medium">결과가 여기에 표시됩니다</p>
                  </div>
                )}
                {rmBgResult && (
                  <div className="mt-6">
                    <button className="btn-black" onClick={() => rmBgBlob && saveAs(rmBgBlob, `nana_bg_removed_${nowStamp()}.png`)}>
                      다운로드 (PNG)
                    </button>
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
