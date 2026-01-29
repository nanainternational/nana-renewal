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
const HERO_IMAGE_FALLBACK =
  "https://raw.githubusercontent.com/nanainternational/nana-renewal/refs/heads/main/attached_assets/generated_images/aipage.png";
const HERO_TEXT_FULL = "링크 하나로 끝내는\n상세페이지 매직.";

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
      return { blob, ext: blob.type.includes("png") ? "png" : "jpg" };
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
      return { blob, ext: "png" };
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  measureOnly = false
) {
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

  // [State] Sample Order
  const [sampleTitle, setSampleTitle] = useState("");
  const [sampleImage, setSampleImage] = useState("");
  const [samplePrice, setSamplePrice] = useState("");
  const [sampleOption, setSampleOption] = useState("");
  const [sampleQty, setSampleQty] = useState(1);

  // [State] Hero UI
  const [heroTyped, setHeroTyped] = useState("");
  const [heroTypingOn, setHeroTypingOn] = useState(true);
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE_PRIMARY);

  const urlCardRef = useRef<HTMLDivElement | null>(null);
  const API_BASE = (import.meta as any)?.env?.VITEITE_API_BASE || (import.meta as any)?.env?.VITE_API_BASE || "";

  function apiUrl(p: string) {
    const base = String(API_BASE || "").trim().replace(/\/$/, "");
    if (!base) return p;
    return base + (p.startsWith("/") ? p : "/" + p);
  }

  // 1688(alicdn) 이미지 핫링크 차단(403) 대응: 서버에서 referer를 붙여 프록시
  const proxyImageUrl = (u: string) => {
    if (!u) return u;
    if (!/^https?:\/\//i.test(u)) return u;
    return apiUrl(`/api/1688/proxy/image?url=${encodeURIComponent(u)}`);
  };

  function loadImageSize(u: string, timeoutMs = 8000): Promise<{ w: number; h: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      const timer = window.setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeoutMs);

      function cleanup() {
        window.clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
      }

      img.onload = () => {
        const w = (img as any).naturalWidth || img.width || 0;
        const h = (img as any).naturalHeight || img.height || 0;
        cleanup();
        resolve({ w, h });
      };
      img.onerror = () => {
        cleanup();
        resolve(null);
      };

      img.src = proxyImageUrl(u); // ✅ 프록시로 로드해서 403/차단 회피
    });
  }

  async function filterLargeImages(items: MediaItem[], minSide = 200) {
    const checks = await Promise.all(
      (items || []).map(async (it) => {
        const s = await loadImageSize(it.url);
        if (!s) return true; // 로드 실패는 일단 살림(과도한 누락 방지)
        return s.w >= minSide && s.h >= minSide;
      })
    );
    return (items || []).filter((_, i) => checks[i]);
  }

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      const d: any = ev?.data;
      if (!d || d.type !== "VVIC_SAMPLE_ORDER") return;
      const p = d.payload || {};

      if (typeof p.title === "string" && p.title.trim()) setSampleTitle(p.title.trim());
      if (typeof p.main_image === "string" && p.main_image.trim()) setSampleImage(p.main_image.trim());

      const rawPrice = p.unit_price ?? p.unitPrice ?? p.price ?? p.wholesale_price ?? p.wholesalePrice ?? "";
      if (typeof rawPrice === "string" && rawPrice.trim()) {
        const num = rawPrice.replace(/[^0-9.]/g, "");
        if (num) setSamplePrice(num);
      } else if (typeof rawPrice === "number") {
        setSamplePrice(String(rawPrice));
      }

      const rawQty = p.quantity ?? p.qty;
      if (typeof rawQty === "number" && rawQty > 0) setSampleQty(rawQty);
      if (typeof rawQty === "string" && rawQty.trim()) {
        const n = parseInt(rawQty, 10);
        if (!Number.isNaN(n) && n > 0) setSampleQty(n);
      }

      const optText = p.option_text ?? p.options_raw ?? p.optionsRaw ?? p.optionText ?? "";
      if (typeof optText === "string" && optText.trim()) setSampleOption(optText.trim());

      setStatus("확장프로그램에서 주문 정보가 자동 입력되었습니다.");
    };

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {};
    img.onerror = () => {
      if (heroImageSrc !== HERO_IMAGE_FALLBACK) setHeroImageSrc(HERO_IMAGE_FALLBACK);
    };
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
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setTopBusyText("");
  }

  // [Func] Fetch URL Data
  async function fetchUrlServer(url: string) {
    const steps = ["데이터 불러오는 중...", "이미지 구성 중...", "최적화 중..."];
    setUrlLoading(true);
    startProgress(steps);
    try {
      const api = apiUrl("/api/1688/latest?_=" + Date.now());
      const res = await fetch(api, { cache: "no-store" });

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) {
        const t = await res.text();
        const head = t.slice(0, 200).replace(/\s+/g, " ").trim();
        throw new Error("서버가 JSON 대신 HTML을 반환했습니다: " + head);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "서버 에러");
      if (!data || !data.ok) {
        const msg =
          data?.message ||
          "저장된 데이터가 없습니다.\n\n1. 1688 상품 페이지로 이동하세요.\n2. 브라우저 우측 상단 'N' 확장프로그램 아이콘을 클릭하세요.\n3. 알림창이 뜨면 다시 '불러오기' 버튼을 눌러주세요.";
        throw new Error(msg);
      }

      if (data.url) setUrlInput(data.url);
      if (data.product_name) setAiProductName(data.product_name);

      const mm = (data.main_media || [])
        .map((x: any) => {
          if (!x) return null;
          const url = typeof x === "string" ? x : x.url;
          if (!url) return null;
          return { type: "image", url, checked: true };
        })
        .filter(Boolean);

      const dm = (data.detail_media || [])
        .map((x: any) => {
          if (!x) return null;
          const url = typeof x === "string" ? x : x.url;
          if (!url) return null;
          return { type: "image", url, checked: true };
        })
        .filter(Boolean);

      // ✅ 작은 아이콘/버튼 이미지 제거 (vvic처럼 '실제 상품 이미지' 위주로 정리)
      setStatus("이미지 정리 중... (작은 아이콘 제외)");
      const mm2 = await filterLargeImages(mm as any, 200);
      const dm2 = await filterLargeImages(dm as any, 200);

      setMainItems(mm2 as any);
      setDetailImages(dm2 as any);
      setDetailVideos([]); // 비디오는 현재 제외 (필요 시 추가)

      setStatus(`성공! 대표 ${mm2.length}장, 상세 ${dm2.length}장을 불러왔습니다.`);
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setUrlLoading(false);
      stopProgress();
    }
  }

  async function generateByAI() {
    const chosen = (mainItems || []).find((x) => x.checked && x.type === "image") || (mainItems || [])[0];
    if (!chosen) {
      setStatus("분석할 이미지가 없습니다.");
      return;
    }

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
    } catch (e) {
      setStatus("AI 생성 실패");
    } finally {
      setAiLoading(false);
      stopProgress();
    }
  }

  async function handleMergeAndDownloadZip() {
    const selectedDetailUrls = detailImages.filter((x) => x.checked).map((x) => x.url);
    const selectedMainItems = mainItems.filter((x) => x.checked && x.type === "image");

    if (!selectedDetailUrls.length && !selectedMainItems.length) {
      setStatus("선택된 이미지가 없습니다.");
      return;
    }

    const folderName = nowStamp();
    setStatus("다운로드 패키지 생성 중...");
    setTopBusyText("이미지 패키징 중...");

    try {
      const zip = new JSZip();

      if (selectedMainItems.length > 0) {
        for (let i = 0; i < selectedMainItems.length; i++) {
          const result = await fetchSmartBlob(selectedMainItems[i].url, apiUrl("/api/vvic/stitch"));
          if (result) zip.file(`main_${String(i + 1).padStart(2, "0")}.${result.ext}`, result.blob);
        }
      }

      if (selectedDetailUrls.length > 0) {
        for (let i = 0; i < selectedDetailUrls.length; i++) {
          const result = await fetchSmartBlob(selectedDetailUrls[i], apiUrl("/api/vvic/stitch"));
          if (result) zip.file(`detail_${String(i + 1).padStart(2, "0")}.${result.ext}`, result.blob);
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

  function handleAddToSampleList() {
    const chosenImage = mainItems.find((x) => x.checked && x.type === "image");
    if (!urlInput) {
      alert("URL이 필요합니다.");
      return;
    }
    if (!chosenImage) {
      alert("대표 이미지를 선택해주세요.");
      return;
    }
    if (!samplePrice) {
      alert("예상 단가를 입력해주세요.");
      return;
    }
    if (!sampleOption) {
      alert("옵션 내용을 입력해주세요.");
      return;
    }

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

      alert(`[중국사입] 리스트에 담겼습니다!\n\n상품: ${sampleItem.productName}\n옵션: ${sampleItem.optionRaw}\n수량: ${sampleItem.quantity}`);
    } catch (e) {
      alert("장바구니 저장 실패");
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
          }
        `}</style>

        <div className="layout-container">
          <div className="hero-wrap">
            <div className="hero-content">
              <h1 className="hero-title">
                {heroTyped}
                <span className="animate-pulse">|</span>
              </h1>
              <p className="hero-desc">
                1688 페이지에서 확장프로그램으로 추출 후<br />
                "불러오기" 버튼을 누르면 이미지가 들어옵니다.
              </p>

              <div className="hero-input-box" ref={urlCardRef}>
                <input
                  type="text"
                  className="hero-input"
                  placeholder="1688 상세페이지 URL (자동 입력됨)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchUrlServer(urlInput)}
                />
                <button className="hero-btn" onClick={() => fetchUrlServer(urlInput)} disabled={urlLoading}>
                  {urlLoading ? "불러오는 중..." : "방금 추출한 데이터 불러오기"}
                </button>
              </div>
              {status && <div className="mt-4 text-sm font-bold text-black/60 whitespace-pre-wrap">{status}</div>}
            </div>

            <div className="hidden lg:block absolute -right-10 top-10 opacity-90">
              <img src={heroImageSrc} className="w-[420px] rotate-[-5deg] drop-shadow-2xl rounded-2xl" />
            </div>
          </div>

          {/* Main Images */}
          <div className="mt-12">
            <div className="section-header">
              <div>
                <h2 className="section-title">대표 이미지</h2>
                <p className="section-desc">작은 아이콘/버튼 이미지는 자동 제외됩니다.</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-text" onClick={() => setMainItems((prev) => prev.map((it) => ({ ...it, checked: true })))}>
                  모두 선택
                </button>
                <button className="btn-text" onClick={() => setMainItems((prev) => prev.map((it) => ({ ...it, checked: false })))}>
                  해제
                </button>
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
                      onChange={() => setMainItems((prev) => prev.map((x, i) => (i === idx ? { ...x, checked: !x.checked } : x)))}
                    />
                    <img src={proxyImageUrl(it.url)} className="card-thumb" loading="lazy" />
                  </div>
                  <div className="card-actions">
                    <span className="card-badge">#{String(idx + 1).padStart(2, "0")}</span>
                    <div className="card-btn-group">
                      <button className="card-mini-btn" onClick={() => window.open(it.url)}>
                        ↗
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!mainItems.length && (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                  확장프로그램으로 추출 후 불러오세요.
                </div>
              )}
            </div>
          </div>

          {/* Detail Images */}
          <div className="mt-16">
            <div className="section-header">
              <div>
                <h2 className="section-title">상세 이미지</h2>
                <p className="section-desc">작은 아이콘/버튼 이미지는 자동 제외됩니다.</p>
              </div>
              <div className="flex gap-2 items-center">
                <button className="btn-text" onClick={() => setDetailImages((prev) => prev.map((it) => ({ ...it, checked: true })))}>
                  모두 선택
                </button>
                <button className="btn-text" onClick={() => setDetailImages((prev) => prev.map((it) => ({ ...it, checked: false })))}>
                  해제
                </button>
                <button className="btn-black" onClick={handleMergeAndDownloadZip}>
                  선택 이미지 ZIP 저장
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
                      onChange={() => setDetailImages((prev) => prev.map((x, i) => (i === idx ? { ...x, checked: !x.checked } : x)))}
                    />
                    <img src={proxyImageUrl(it.url)} className="card-thumb" loading="lazy" />
                  </div>
                  <div className="card-actions">
                    <span className="card-badge">DETAIL</span>
                    <div className="card-btn-group">
                      <button className="card-mini-btn" onClick={() => window.open(it.url)}>
                        ↗
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!detailImages.length && <div className="col-span-full py-10 text-center text-gray-300 text-sm">상세 이미지가 없습니다.</div>}
            </div>
          </div>

          {/* AI */}
          <div className="mt-20 pb-20">
            <div className="section-header">
              <div>
                <h2 className="section-title">AI 마케팅</h2>
                <p className="section-desc">대표 이미지를 분석하여 상품명/키워드를 제안합니다.</p>
              </div>
              <div className="flex gap-3">
                <button className="btn-outline-black" onClick={generateByAI} disabled={aiLoading}>
                  {aiLoading ? "AI 생각 중..." : "AI 생성"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-lg">상품명</div>
                <button className="btn-text" onClick={() => copyText(aiProductName)}>
                  COPY
                </button>
              </div>
              <textarea
                className="w-full mt-3 border border-gray-200 rounded-xl p-4 outline-none"
                placeholder="AI가 상품명을 제안합니다."
                value={aiProductName}
                onChange={(e) => setAiProductName(e.target.value)}
              />
            </div>

            <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-lg">에디터 문구</div>
                <button className="btn-text" onClick={() => copyText(aiEditor)}>
                  COPY
                </button>
              </div>
              <textarea
                className="w-full mt-3 border border-gray-200 rounded-xl p-4 outline-none"
                placeholder="AI가 에디터 문구를 제안합니다."
                value={aiEditor}
                onChange={(e) => setAiEditor(e.target.value)}
              />
            </div>

            <div className="mt-10 bg-white rounded-2xl border border-gray-200 p-6">
              <div className="font-extrabold text-lg mb-3">샘플 주문 담기</div>
              <button className="btn-black" onClick={handleAddToSampleList}>
                중국사입 리스트에 담기
              </button>
            </div>
          </div>
        </div>

        <ContactForm />
        <Footer />
        <ScrollToTop />
      </main>
    </div>
  );
}
