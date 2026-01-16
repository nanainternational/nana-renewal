import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
// [핵심] 고성능 배경 제거 라이브러리 (imgly)
import removeBackground from "@imgly/background-removal";

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
  const [rmBgImage, setRmBgImage] = useState<string | null>(null);
  const [rmBgResult, setRmBgResult] = useState<string | null>(null);
  const [rmBgLoading, setRmBgLoading] = useState(false);
  const [rmBgStatus, setRmBgStatus] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  async function downloadDataUrlToPng(dataUrl: string, filename: string) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      saveAs(blob, filename);
    } catch {
      saveAs(dataUrl as any, filename);
    }
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
    if (file) {
      const url = URL.createObjectURL(file);
      setRmBgImage(url);
      setRmBgResult(null); // 이전 결과 초기화
      setRmBgStatus("업로드 완료. 배경 제거 실행을 눌러주세요.");
    }
  };

  // [변경완료] 고성능 AI 배경 제거 함수 (imgly 사용)
  async function handleRemoveBackground() {
    if (!rmBgImage) {
      setStatus("이미지를 업로드해주세요.");
      return;
    }
    setRmBgLoading(true);
    setTopBusyText("고화질 배경 제거 중... (최초 1회 모델 다운로드)");
    setStatus("AI가 이미지를 분석 중입니다...");
    setRmBgStatus("처리 중... 잠시만 기다려주세요.");
    setRmBgResult(null);

    try {
      // 1. Blob 이미지 준비 (imgly는 URL도 받지만, Blob이 더 안정적)
      const response = await fetch(rmBgImage);
      const blob = await response.blob();

      // 2. imgly 라이브러리 실행 (자동으로 wasm 모델 로드 및 처리)
      // publicPath는 기본적으로 unpkg CDN을 사용하므로 별도 설정 불필요
      const pngBlob = await removeBackground(blob, {
        progress: (key: string, current: number, total: number) => {
           // 진행률 업데이트 (모델 다운로드 시 유용)
           const percent = Math.round((current / total) * 100);
           setRmBgStatus(`AI 모델 로딩/처리 중... ${percent}%`);
        }
      });

      // 3. 결과 변환
      const dataUrl = URL.createObjectURL(pngBlob);
      setRmBgResult(dataUrl);
      setStatus("배경 제거가 완료되었습니다.");
      setRmBgStatus("완료! 결과를 확인하세요.");

    } catch (e: any) {
      console.error("배경 제거 에러:", e);
      setStatus("배경 제거 실패: " + (e?.message || "알 수 없는 오류"));
      setRmBgStatus("실패했습니다. 다시 시도해주세요.");
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

          {/* 5. [신규 섹션] AI 배경 제거 (High Quality) */}
          <div className="mt-20 pb-20">
            <div className="section-header">
              <div>
                <h2 className="section-title">AI 배경 제거 (High Quality)</h2>
                <p className="section-desc">고성능 AI 모델을 사용하여 깔끔하게 배경을 지워드립니다. (최초 실행 시 모델 다운로드에 시간이 걸릴 수 있습니다)</p>
              </div>
            </div>

            <div className="bg-remover-wrap">
              {rmBgStatus && <div className="bg-remover-status mb-4 font-bold text-blue-600">{rmBgStatus}</div>}
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
                    <input type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />
                  </label>
                  <button className="btn-black" onClick={handleRemoveBackground} disabled={rmBgLoading || !rmBgImage}>
                      {rmBgLoading ? "처리 중..." : "배경 제거 실행"}
                    </button>
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
                    <button className="btn-black" onClick={() => downloadDataUrlToPng(rmBgResult, `nana_bg_removed_${nowStamp()}.png`)}>
                      다운로드 (PNG)
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* 캔버스 (숨김 - 호환성 유지용) */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

        </div>
      </main>

      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}