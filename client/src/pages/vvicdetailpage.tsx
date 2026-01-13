import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { useEffect, useMemo, useRef, useState } from "react";

type MediaItem = { type: "image" | "video"; url: string; checked?: boolean };
const HERO_IMAGE_PRIMARY = "/attached_assets/generated_images/aipage.png";
const HERO_IMAGE_FALLBACK = "https://raw.githubusercontent.com/nanainternational/nana-renewal/refs/heads/main/attached_assets/generated_images/aipage.png";
const HERO_HEADLINE = "링크만 넣으세요.";
const HERO_SUBLINE = "상품명·에디터·키워드가 자동으로 완성됩니다";
const HERO_TEXT_FULL = "링크만 넣으세요.\n상품명·에디터·키워드가 자동으로 완성됩니다";

function nowStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    "_" +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

function downloadText(text: string, filename: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  downloadBlob(blob, filename);
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

export default function VvicDetailPage() {
  const [urlInput, setUrlInput] = useState("");
  const [status, setStatus] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [topBusyText, setTopBusyText] = useState("");
  const progressTimerRef = useRef<number | null>(null);
  const [mainItems, setMainItems] = useState<MediaItem[]>([]);
  const [detailImages, setDetailImages] = useState<MediaItem[]>([]);
  const [detailVideos, setDetailVideos] = useState<MediaItem[]>([]);
  const [mainHtmlOut, setMainHtmlOut] = useState("");
  const [detailHtmlOut, setDetailHtmlOut] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [stitchLoading, setStitchLoading] = useState(false);
  const [aiProductName, setAiProductName] = useState("");
  const [aiEditor, setAiEditor] = useState("");
  const [aiCoupangKeywords, setAiCoupangKeywords] = useState<string[]>([]);
  const [aiAblyKeywords, setAiAblyKeywords] = useState<string[]>([]);

  // Hero typing animation + CTA scroll + image fallback
  const [heroTyped, setHeroTyped] = useState("");
  const [heroTypingOn, setHeroTypingOn] = useState(true);
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE_PRIMARY);

  // preload hero image; if not served (404), fallback to GitHub raw
  useEffect(() => {
    const img = new Image();
    img.onload = () => {};
    img.onerror = () => {
      if (heroImageSrc !== HERO_IMAGE_FALLBACK) setHeroImageSrc(HERO_IMAGE_FALLBACK);
    };
    img.src = heroImageSrc;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [heroImageSrc]);
  const urlCardRef = useRef<HTMLDivElement | null>(null);


function startProgress(steps: string[]) {
  stopProgress();
  if (!Array.isArray(steps) || steps.length === 0) return;
  let i = 0;
  setTopBusyText(steps[0]);
  progressTimerRef.current = window.setInterval(() => {
    i = (i + 1) % steps.length;
    setTopBusyText(steps[i]);
  }, 1100);
}

function stopProgress() {
  if (progressTimerRef.current) {
    window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
  }
  setTopBusyText("");
}


  const mainSelectedCount = useMemo(() => mainItems.filter((x) => x.checked).length, [mainItems]);
  const detailSelectedCount = useMemo(() => detailImages.filter((x) => x.checked).length, [detailImages]);

  useEffect(() => {
    if (!heroTypingOn) return;
    let i = 0;
    setHeroTyped("");
    const timer = window.setInterval(() => {
      i += 1;
      setHeroTyped(HERO_TEXT_FULL.slice(0, i));
      if (i >= HERO_TEXT_FULL.length) {
        window.clearInterval(timer);
        window.setTimeout(() => {
          setHeroTypingOn(false);
          window.setTimeout(() => setHeroTypingOn(true), 700);
        }, 900);
      }
    }, 45);
    return () => window.clearInterval(timer);
  }, [heroTypingOn]);

  function buildMainHtmlFromSelected(items?: MediaItem[]) {
    const sel = (items || mainItems).filter((x) => x.checked);
    const lines: string[] = [];
    lines.push('<div class="main-media">');
    for (const it of sel) {
      if (it.type === "video") {
        lines.push(
          '  <video src="' +
            it.url +
            '" controls playsinline style="max-width:100%;height:auto;"></video>'
        );
      } else {
        lines.push('  <img src="' + it.url + '" alt="">');
      }
    }
    lines.push("</div>");
    const out = lines.join("\n");
    setMainHtmlOut(out);
    return out;
  }

  function buildDetailHtmlFromSelected(items?: MediaItem[], videos?: MediaItem[]) {
    const sel = (items || detailImages).filter((x) => x.checked);
    const vids = videos || detailVideos;
    const lines: string[] = [];
    lines.push('<div class="detail-images">');
    for (const it of sel) lines.push('  <img src="' + it.url + '" alt="">');
    for (const v of vids)
      lines.push(
        '  <video src="' + v.url + '" controls playsinline style="max-width:100%;height:auto;"></video>'
      );
    lines.push("</div>");
    const out = lines.join("\n");
    setDetailHtmlOut(out);
    return out;
  }

  async function fetchUrlServer(url: string) {
    setStatus("서버로 URL 추출 요청 중...");
    const api = "/api/vvic/extract?url=" + encodeURIComponent(url);
    const res = await fetch(api);

    // 500 같은 에러일 때도 응답 바디에 error 메시지가 들어오니 최대한 읽어서 보여줌
    let data: any = null;
    const ct = res.headers.get("content-type") || "";
    try {
      if (ct.includes("application/json")) data = await res.json();
      else data = await res.text();
    } catch {
      // ignore
    }

    if (!res.ok) {
      const msg =
        (data && typeof data === "object" && (data.error || data.message)) ||
        (typeof data === "string" && data) ||
        "";
      throw new Error("서버 응답 오류: HTTP " + res.status + (msg ? "\n" + msg : ""));
    }

    if (ct.includes("application/json") && !data) data = await res.json();
    if (!data.ok) throw new Error(data.error || "서버 에러");

    const mm: MediaItem[] = (data.main_media || []).map((x: any) => ({
      type: (x.type || "image") === "video" ? "video" : "image",
      url: x.url,
      checked: true,
    }));

    const dm: MediaItem[] = (data.detail_media || []).map((x: any) => ({
      type: (x.type || "image") === "video" ? "video" : "image",
      url: x.url,
      checked: true,
    }));

    setMainItems(
      mm.length
        ? mm
        : (data.main_images || []).map((u: string) => ({ type: "image", url: u, checked: true }))
    );

    const imgs = dm.filter((x) => x.type !== "video").map((x) => ({ ...x, type: "image" as const }));
    const vids = dm.filter((x) => x.type === "video").map((x) => ({ ...x, type: "video" as const }));

    setDetailImages(imgs);
    setDetailVideos(vids);

    const mainImgCnt = mm.filter((x) => x.type !== "video").length || (data.main_images || []).length;
    const mainVidCnt = mm.filter((x) => x.type === "video").length;
    const detailImgCnt = imgs.length;
    const detailVidCnt = vids.length;

    setStatus(
      ["추출 완료", "- 대표: 이미지 " + mainImgCnt + "개 / 비디오 " + mainVidCnt + "개", "- 상세: 이미지 " + detailImgCnt + "개 / 비디오 " + detailVidCnt + "개"].join(
        "\n"
      )
    );
  }


  async function generateByAI() {
    const chosen = (mainItems || []).find((x) => x.checked && x.type === "image") || (mainItems || [])[0];
    const imgUrl = chosen?.url || "";
    if (!imgUrl) {
      setStatus("대표이미지를 먼저 가져오고, 최소 1개를 선택하세요.");
      return;
    }

    const steps = ["AI 분석 중...", "상품명 생성 중...", "에디터 작성 중...", "키워드 정리 중..."];
    setAiLoading(true);
    startProgress(steps);
    setStatus("AI 생성 중...");
    try {
      const api = "/api/vvic/ai";
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imgUrl, source_url: (urlInput || "").trim() }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok || !data?.ok) {
        const msg = data?.error || ("서버 응답 오류: HTTP " + res.status);
        throw new Error(msg);
      }

      setAiProductName(String(data.product_name || ""));
      setAiEditor(String(data.editor || ""));
      setAiCoupangKeywords(Array.isArray(data.coupang_keywords) ? data.coupang_keywords : []);
      setAiAblyKeywords(Array.isArray(data.ably_keywords) ? data.ably_keywords : []);

      setStatus(
        [
          "AI 생성 완료",
          "- 상품명: " + String(data.product_name || ""),
          "- 쿠팡키워드: " + (Array.isArray(data.coupang_keywords) ? data.coupang_keywords.join(", ") : ""),
          "- 에이블리키워드: " + (Array.isArray(data.ably_keywords) ? data.ably_keywords.join(", ") : ""),
        ].join("\n")
      );
    } catch (e: any) {
      setStatus("AI 생성 실패:\n" + String(e?.message || e));
    } finally {
      setAiLoading(false);
      stopProgress();
    }
  }


    async function stitchServer(urls: string[]) {
    if (!urls.length) {
      setStatus("선택된 상세이미지가 없습니다.");
      return;
    }
    try {
      setStitchLoading(true);
      setStatus("서버에서 이미지 합치는 중...");
      startProgress(["이미지 다운로드 중…", "세로 합치기 처리 중…", "파일 준비 중…"]);
      const api = "/api/vvic/stitch";
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (!res.ok) throw new Error("서버 응답 오류: HTTP " + res.status);
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json();
        throw new Error(j?.error || "서버 에러");
      }
      const blob = await res.blob();
      downloadBlob(blob, "stitched_" + nowStamp() + ".png");
      setStatus("다운로드 완료(서버)");
    } catch (e: any) {
      setStatus("서버 합치기 실패:
" + String(e?.message || e));
    } finally {
      setStitchLoading(false);
      stopProgress();
    }
  }}

  return (
    <div className="min-h-screen bg-[#FEE500] notranslate" translate="no">
      <Navigation />

      <main className="pt-[88px] text-black">

{topBusyText ? (
  <div className="top-statusbar" role="status" aria-live="polite">
    <span className="spinner" aria-hidden="true" />
    <span>{topBusyText}</span>
  </div>
) : null}

        <style>{`
          .wrap { max-width: 100%; margin: 0 auto; padding: 0 16px; }
          .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
          .card { border: 1px solid rgba(0,0,0,0.10); border-radius: 14px; padding: 12px; background: rgba(255,255,255,0.92); overflow: visible; max-height: none; }
          .card h3 { margin: 0 0 8px 0; font-size: 16px; font-weight: 700; }
          input[type="text"] { width: min(900px, 100%); padding: 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.18); background: rgba(255,255,255,0.90); color: #000; }
          textarea { width: 100%; height: 110px; padding: 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.18); background: rgba(255,255,255,0.90); color: #000; }
          button { padding: 8px 12px; cursor: pointer; border: 1px solid rgba(0,0,0,0.18); border-radius: 10px; background: #FEE500; color: #000; font-weight: 600; }
          button:hover { background: #fada00; }
          .muted { color: rgba(0,0,0,0.60); font-size: 12px; }
          .status { margin-top: 8px; font-size: 13px; white-space: pre-wrap; color: rgba(0,0,0,0.88); }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; margin-top: 12px; }
          .thumb { width: 100%; height: 110px; border-radius: 10px; background: rgba(255,255,255,0.85); object-fit: contain; }
          video.thumb { background: rgba(255,255,255,0.85); }
          .item { border: 1px solid rgba(0,0,0,0.10); border-radius: 12px; padding: 8px; display: flex; flex-direction: column; gap: 6px; background: rgba(255,255,255,0.78); }
          .small { font-size: 12px; color: rgba(0,0,0,0.68); word-break: break-all; }
          .controls { display: flex; gap: 6px; flex-wrap: wrap; }
          .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; border: 1px solid rgba(0,0,0,0.12); font-size: 12px; background: rgba(255,255,255,0.65); }
          .code { width: 100%; height: 180px; font-family: Consolas, monospace; }
          .title { font-size: 22px; font-weight: 800; margin: 10px 0 8px; }

          /* Hero (conversion) */
          .hero-ai { margin-top: 14px; }
          .hero-ai-inner { display: grid; grid-template-columns: 1fr; gap: 14px; align-items: stretch; }
          .hero-ai-left, /* .hero-ai-right removed */ .hero-ai-right {
            border: 1px solid rgba(0,0,0,0.10);
            border-radius: 16px;
            background: rgba(255,255,255,0.92);
          }
          .hero-ai-left { padding: 14px; overflow: hidden; }
          .hero-ai-kbd {
            width: min(720px, 100%);
            border-radius: 0px;
            background: transparent; /* no panel */
            border: 0;
            color: rgba(255,255,255,0.94);
            padding: 0;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }
          .hero-ai-kbd-top { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.62); }
          .hero-ai-dots { display: flex; gap: 6px; align-items: center; }
          .hero-ai-dot { width: 10px; height: 10px; border-radius: 50%; background: transparent; }
          .hero-ai-head { margin-top: 4px; }
          .hero-ai-h1 { font-size: 24px; font-weight: 900; letter-spacing: -0.3px; }
          .hero-ai-h2 { margin-top: 4px; font-size: 15px; color: rgba(255,255,255,0.82); }

          .hero-ai-code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 14px;
            line-height: 1.7;
            white-space: pre-wrap;
            word-break: keep-all;
            min-height: 54px;
          }
          .hero-ai-caret { display: inline-block; width: 10px; height: 16px; margin-left: 2px; vertical-align: -2px; background: rgba(254,229,0,0.95); animation: caretBlink 0.9s step-end infinite; }
          @keyframes caretBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }

          .hero-ai-bullets { margin-top: 6px; display: grid; gap: 4px; }
          .hero-ai-bullet { font-size: 13px; color: rgba(255,255,255,0.74); }

          .hero-ai-cta { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
          .hero-ai-btn { padding: 9px 12px; cursor: pointer; border: 1px solid transparent; border-radius: 12px; background: rgba(255,255,255,0.08); color: #fff; font-weight: 800; }
          .hero-ai-btn:hover { background: rgba(255,255,255,0.12); }
          .hero-ai-btn-primary { background: #FEE500; color: #000; border-color: transparent; }
          .hero-ai-btn-primary:hover { background: #fada00; }
          .hero-ai-trust { font-size: 12px; color: rgba(255,255,255,0.66); }

          /* .hero-ai-right removed */ .hero-ai-right { padding: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          /* .hero-ai-right removed */ .hero-ai-right img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }

          @media (max-width: 860px) {
            .hero-ai-inner { grid-template-columns: 1fr; }
            /* .hero-ai-right removed */ .hero-ai-right img { max-height: 360px; }
            .hero-ai-h1 { font-size: 22px; }
          }
        
          /* Hero MIN-FIX (commit 기준 최소 수정) */
          .hero-ai {
            position: relative;
            min-height: 520px;
            height: clamp(520px, 72vh, 780px);
            border-radius: 18px;
            overflow: hidden;
            border: 1px solid rgba(0,0,0,0.10);
          }
          .hero-ai-bg {
            position: absolute;
            inset: 0;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            transform: scale(1.02);
          }
          .hero-ai-bg-dim {
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg,
              rgba(0,0,0,0.78) 0%,
              rgba(0,0,0,0.56) 40%,
              rgba(0,0,0,0.12) 72%,
              rgba(0,0,0,0.00) 100%);
          }
          .hero-ai-overlay {
            position: relative;
            z-index: 2;
            height: 100%;
            display: flex;
            align-items: center;
            padding: 22px;
          }
          .hero-ai-left { border: 0 !important; background: transparent !important; padding: 0 !important; }
          .hero-ai-kbd { width: min(680px, 100%); border-radius: 16px; }

          @media (max-width: 860px) {
            .hero-ai { height: auto; min-height: 520px; }
            .hero-ai-overlay { padding: 14px; align-items: flex-start; }
            .hero-ai-bg-dim {
              background: linear-gradient(180deg,
                rgba(0,0,0,0.78) 0%,
                rgba(0,0,0,0.52) 46%,
                rgba(0,0,0,0.12) 100%);
            }
            .hero-ai-kbd { width: 100%; }
          }

        /* Hero overrides (image as full background, no frame) */
.hero-ai {
  position: relative;
  margin-top: 14px;
  border-radius: 18px;
  overflow: hidden;
  min-height: clamp(360px, 70vh, 620px);
  border: 0 !important;
  background: transparent !important;
}
.hero-ai-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transform: scale(1.02);
}
.hero-ai-bg-dim {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,
    rgba(0,0,0,0.55) 0%,
    rgba(0,0,0,0.38) 42%,
    rgba(0,0,0,0.08) 72%,
    rgba(0,0,0,0.00) 100%
  );
}
.hero-ai-overlay {
  position: relative;
  z-index: 2;
  height: 100%;
  padding: 18px;
  display: flex;
  align-items: center;
}

/* Left typing area should NOT be a black panel */
.hero-ai-left { border: 0 !important; background: transparent !important; padding: 0 !important; }
.hero-ai-kbd {
  width: min(720px, 100%);
  border-radius: 16px;
  background: transparent; /* transparent glass */
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border: 1px solid transparent;
  color: rgba(255,255,255,0.94);
  padding: 18px;
}
.hero-ai-kbd-top { color: rgba(255,255,255,0.78); }
.hero-ai-h1, .hero-ai-h2, .hero-ai-code, .hero-ai-bullet, .hero-ai-trust {
  text-shadow: 0 2px 18px rgba(0,0,0,0.35);
}
.hero-ai-btn { border: 1px solid rgba(255,255,255,0.22); background: transparent; }
.hero-ai-btn:hover { background: transparent; }
.hero-ai-btn-primary { background: #FEE500; color: #000; border-color: rgba(255,255,255,0.22); }
.hero-ai-btn-primary:hover { background: #fada00; }

@media (max-width: 860px) {
  .hero-ai { border-radius: 16px; min-height: 520px; }
  .hero-ai-overlay { padding: 14px; align-items: flex-start; }
  .hero-ai-bg-dim {
    background: linear-gradient(180deg,
      rgba(0,0,0,0.55) 0%,
      rgba(0,0,0,0.34) 52%,
      rgba(0,0,0,0.08) 100%
    );
  }
  .hero-ai-kbd { width: 100%; padding: 16px; }
}
        /* FINAL OVERRIDE: no translucency at all */
.hero-ai-kbd {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
        /* === FORCE BLACK TEXT FOR TYPING (FINAL) === */
.hero-ai-code,
.hero-ai-code * {
  color: #000 !important;
  text-shadow: none !important;
}
.hero-ai-caret {
  background: #000 !important;
}
        /* === FIX: remove dark dim so black text is readable === */
.hero-ai-bg-dim {
  background: transparent !important;
}
        /* === FIX LAYERING: ensure typing/content is ABOVE background image === */
.hero-ai-bg { z-index: 0; }
.hero-ai-bg-dim { z-index: 1; }
.hero-ai-inner { position: relative; z-index: 2; }
        
/* === Loading UI (button + top status line) === */
.btn-loading { display: inline-flex; align-items: center; gap: 8px; }
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0,0,0,0.18);
  border-top-color: rgba(0,0,0,0.75);
  border-radius: 999px;
  animation: spin 0.8s linear infinite;
  flex: 0 0 auto;
}
@keyframes spin { to { transform: rotate(360deg); } }
.top-statusbar{
  position: sticky;
  top: 88px;
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  margin: 0 auto;
  max-width: 1200px;
  font-size: 12px;
  color: #111;
  background: rgba(255,255,255,0.75);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  backdrop-filter: blur(6px);
}
        `}</style>

        <div className="wrap">
<div className="hero-ai">
            <div className="hero-ai-bg" style={{ backgroundImage: `url(${heroImageSrc})` }} />
            <div className="hero-ai-bg-dim" />
            <div className="hero-ai-inner">
              <div className="hero-ai-left">
                <div className="hero-ai-kbd">
                  <div className="hero-ai-kbd-top">
                    <div className="hero-ai-dots" aria-hidden="true">
                      <span className="hero-ai-dot" />
                      <span className="hero-ai-dot" />
                      <span className="hero-ai-dot" />
                    </div>
</div>

                  <div className="hero-ai-head">
                    <div className="hero-ai-h1">{HERO_HEADLINE}</div>
                    <div className="hero-ai-h2">{HERO_SUBLINE}</div>
                  </div>

                  <div className="hero-ai-code" aria-label="타이핑 애니메이션">
                    {heroTyped}
                    <span className="hero-ai-caret" aria-hidden="true" />
                  </div>

                  <div className="hero-ai-bullets">
                    <div className="hero-ai-bullet">• 대표이미지 1~5장 종합 분석</div>
                    <div className="hero-ai-bullet">• 컬러 언급 없이 상품명/에디터 생성</div>
                    <div className="hero-ai-bullet">• 쿠팡/에이블리 키워드 자동</div>
                  </div>

                  <div className="hero-ai-cta">
                    <button
                      className="hero-ai-btn hero-ai-btn-primary"
                      onClick={() => {
                        const el = urlCardRef.current;
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      지금 바로 만들어보기
                    </button>
                    <button
                      className="hero-ai-btn"
                      onClick={async () => {
                        try {
                          await copyText("https://www.vvic.com/item/");
                          setStatus("예시 링크(https://www.vvic.com/item/)가 클립보드에 복사됐어요.");
                        } catch {
                          setStatus("예시 링크 복사 실패");
                        }
                      }}
                    >
                      예시 링크 복사
                    </button>
                    <span className="hero-ai-trust">✓ 설치 없이 웹에서</span>
                  </div>
                </div>
              </div>
</div>
          </div>

          <div className="card" style={{ marginTop: 12 }} ref={urlCardRef}>
            <h3>1) URL 입력</h3>
            <div className="row">
              <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} type="text" placeholder="https://www.vvic.com/item/..." />
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button
                onClick={async () => {
                  const steps = ["이미지 가져오는 중...", "대표이미지 분석 중...", "정리 중..."];
                  setUrlLoading(true);
                  startProgress(steps);
                  try {
                    const u = (urlInput || "").trim();
                    if (!u) return setStatus("URL을 입력하세요.");
                    await fetchUrlServer(u);
                  } catch (e: any) {
                    setStatus("서버 URL 가져오기 실패:\n" + String(e?.message || e));
                  } finally {
                    setUrlLoading(false);
                    stopProgress();
                  }
                }}
                disabled={urlLoading}
                className="btn-loading"
              >
                {urlLoading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    이미지 가져오는 중...
                  </>
                ) : (
                  "이미지 가져오기"
                )}
              </button>
            </div>
            <div className="status">{status}</div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3>대표이미지</h3>
            <div className="muted">- 대표이미지는 폴더로 다운로드 됩니다다.</div>

            <div className="row" style={{ marginTop: 10 }}>
              <button onClick={() => setMainItems((prev) => prev.map((x) => ({ ...x, checked: true })))}>
                전체 선택
              </button>
              <button onClick={() => setMainItems((prev) => prev.map((x) => ({ ...x, checked: false })))}>
                전체 해제
              </button>
              <span className="pill">총 {mainItems.length}개</span>
              <span className="pill">선택 {mainSelectedCount}개</span>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button
                onClick={() => {
                  const out = buildMainHtmlFromSelected();
                  setStatus("HTML 코드 생성 완료 (대표 선택 " + mainSelectedCount + "개)");
                  setMainHtmlOut(out);
                }}
              >
                선택으로 HTML 코드 생성
              </button>
              <button
                onClick={async () => {
                  const text = mainHtmlOut || buildMainHtmlFromSelected();
                  await copyText(text);
                  setStatus("클립보드에 복사 완료");
                }}
              >
                HTML 코드 복사
              </button>
              <button
                onClick={() => {
                  const text = mainHtmlOut || buildMainHtmlFromSelected();
                  const full = ["<!doctype html>", "<html><head><title>selected_main_media</title></head><body>", text, "</body></html>"].join("\n");
                  downloadText(full, "selected_main_media_" + nowStamp() + ".html", "text/html");
                  setStatus("대표 HTML 파일 다운로드 완료");
                }}
              >
                HTML 파일 다운로드
              </button>
            </div>

            <textarea value={mainHtmlOut} onChange={(e) => setMainHtmlOut(e.target.value)} className="code" placeholder="여기에 생성된 대표 HTML 코드가 표시됩니다." />

            <div className="grid">
              {!mainItems.length ? (
                <div className="muted">대표이미지가 추출되지 않았습니다.</div>
              ) : (
                mainItems.map((it, idx) => (
                  <div className="item" key={it.url + idx}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div className="row" style={{ gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={!!it.checked}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setMainItems((prev) => prev.map((x, i) => (i === idx ? { ...x, checked: v } : x)));
                          }}
                        />
                        <span className="pill">#{idx + 1}</span>
                      </div>
                      <div className="controls">
                        <button
                          onClick={() => {
                            if (idx <= 0) return;
                            setMainItems((prev) => {
                              const a = [...prev];
                              const t = a[idx - 1];
                              a[idx - 1] = a[idx];
                              a[idx] = t;
                              return a;
                            });
                          }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => {
                            setMainItems((prev) => {
                              if (idx >= prev.length - 1) return prev;
                              const a = [...prev];
                              const t = a[idx + 1];
                              a[idx + 1] = a[idx];
                              a[idx] = t;
                              return a;
                            });
                          }}
                        >
                          ↓
                        </button>
                        <button onClick={() => window.open(it.url, "_blank")}>새창</button>
                      </div>
                    </div>

                    {it.type === "video" ? (
                      <video className="thumb" src={it.url} controls playsInline preload="metadata" />
                    ) : (
                      <img className="thumb" src={it.url} loading="lazy" />
                    )}
                    <div className="small">{it.url}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          
          <div className="card" style={{ marginTop: 12 }}>
            <h3>2) AI 결과</h3>
            <div className="muted">- 대표이미지(선택된 1개) 기준으로 상품명/에디터/키워드를 생성합니다.</div>

            <div className="row" style={{ marginTop: 10 }}>
              <button onClick={generateByAI} disabled={aiLoading} className="btn-loading">
                {aiLoading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  AI 생성 중...
                </>
              ) : (
                "AI로 상품명/에디터/키워드 생성"
              )}
              </button>
              <span className="pill">API: /api/vvic/ai</span>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <span className="pill">상품명</span>
            </div>
            <textarea
              value={aiProductName}
              onChange={(e) => setAiProductName(e.target.value)}
              className="code"
              style={{ height: 70 }}
              placeholder="AI가 생성한 상품명이 여기에 표시됩니다."
            />

            <div className="row" style={{ marginTop: 10 }}>
              <span className="pill">에디터(약 200자)</span>
              <button
                onClick={async () => {
                  const t = (aiEditor || "").trim();
                  if (!t) return setStatus("복사할 에디터가 없습니다.");
                  await copyText(t);
                  setStatus("에디터 복사 완료");
                }}
              >
                에디터 복사
              </button>
            </div>
            <textarea
              value={aiEditor}
              onChange={(e) => setAiEditor(e.target.value)}
              className="code"
              placeholder="AI가 생성한 에디터 문구가 여기에 표시됩니다."
            />

            <div className="row" style={{ marginTop: 10 }}>
              <span className="pill">쿠팡 키워드 5개</span>
              <button
                onClick={async () => {
                  const t = (aiCoupangKeywords || []).join(", ").trim();
                  if (!t) return setStatus("복사할 쿠팡키워드가 없습니다.");
                  await copyText(t);
                  setStatus("쿠팡키워드 복사 완료");
                }}
              >
                쿠팡키워드 복사
              </button>
            </div>
            <textarea
              value={(aiCoupangKeywords || []).join(", ")}
              onChange={(e) => setAiCoupangKeywords(String(e.target.value || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 5))}
              className="code"
              style={{ height: 80 }}
              placeholder="예) 키워드1, 키워드2, ..."
            />

            <div className="row" style={{ marginTop: 10 }}>
              <span className="pill">에이블리 키워드 5개</span>
              <button
                onClick={async () => {
                  const t = (aiAblyKeywords || []).join(", ").trim();
                  if (!t) return setStatus("복사할 에이블리키워드가 없습니다.");
                  await copyText(t);
                  setStatus("에이블리키워드 복사 완료");
                }}
              >
                에이블리키워드 복사
              </button>
            </div>
            <textarea
              value={(aiAblyKeywords || []).join(", ")}
              onChange={(e) => setAiAblyKeywords(String(e.target.value || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 5))}
              className="code"
              style={{ height: 80 }}
              placeholder="예) 키워드1, 키워드2, ..."
            />
          </div>

<div className="card" style={{ marginTop: 12 }}>
            <h3>상세이미지</h3>
            <div className="row">
              <button onClick={() => setDetailImages((prev) => prev.map((x) => ({ ...x, checked: true })))}>
                전체 선택
              </button>
              <button onClick={() => setDetailImages((prev) => prev.map((x) => ({ ...x, checked: false })))}>
                전체 해제
              </button>
              <span className="pill">총 {detailImages.length}개</span>
              <span className="pill">선택 {detailSelectedCount}개</span>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button
                onClick={() => {
                  const out = buildDetailHtmlFromSelected();
                  setStatus("HTML 코드 생성 완료 (상세 선택 " + detailSelectedCount + "개)");
                  setDetailHtmlOut(out);
                }}
              >
                선택으로 HTML 코드 생성
              </button>
              <button
                onClick={async () => {
                  const text = detailHtmlOut || buildDetailHtmlFromSelected();
                  await copyText(text);
                  setStatus("클립보드에 복사 완료");
                }}
              >
                HTML 코드 복사
              </button>
              <button
                onClick={() => {
                  const text = detailHtmlOut || buildDetailHtmlFromSelected();
                  const full = ["<!doctype html>", "<html><head><title>selected_detail_images</title></head><body>", text, "</body></html>"].join("\n");
                  downloadText(full, "selected_detail_images_" + nowStamp() + ".html", "text/html");
                  setStatus("HTML 파일 다운로드 완료");
                }}
              >
                HTML 파일 다운로드
              </button>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button
  disabled={stitchLoading}
  onClick={async () => {
    if (stitchLoading) return;
    const urls = detailImages.filter((x) => x.checked).map((x) => x.url);
    await stitchServer(urls);
  }}
>
  {stitchLoading ? (
    <span className="btn-loading">
      <span className="spinner" /> 합치는 중…
    </span>
  ) : (
    "선택 합치기"
  )}
</button>
            </div>

            <textarea value={detailHtmlOut} onChange={(e) => setDetailHtmlOut(e.target.value)} className="code" placeholder="여기에 생성된 HTML 코드가 표시됩니다." />
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3>상세이미지 순서조정</h3>
            <div className="muted">- ↑↓ 버튼으로 합치기/HTML 순서를 바꿀 수 있어요.</div>

            <div className="grid">
              {detailImages.map((it, idx) => (
                <div className="item" key={it.url + idx}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div className="row" style={{ gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!it.checked}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setDetailImages((prev) => prev.map((x, i) => (i === idx ? { ...x, checked: v } : x)));
                        }}
                      />
                      <span className="pill">#{idx + 1}</span>
                    </div>
                    <div className="controls">
                      <button
                        onClick={() => {
                          if (idx <= 0) return;
                          setDetailImages((prev) => {
                            const a = [...prev];
                            const t = a[idx - 1];
                            a[idx - 1] = a[idx];
                            a[idx] = t;
                            return a;
                          });
                        }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => {
                          setDetailImages((prev) => {
                            if (idx >= prev.length - 1) return prev;
                            const a = [...prev];
                            const t = a[idx + 1];
                            a[idx + 1] = a[idx];
                            a[idx] = t;
                            return a;
                          });
                        }}
                      >
                        ↓
                      </button>
                      <button onClick={() => window.open(it.url, "_blank")}>새창</button>
                    </div>
                  </div>
                  <img className="thumb" src={it.url} loading="lazy" />
                  <div className="small">{it.url}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3>동영상</h3>
            <div className="muted">- url에서 추출된 동영상(mp4 등)을 이미지 아래에 따로 표시합니다.</div>

            <div className="grid">
              {!detailVideos.length ? (
                <div className="muted">동영상이 없습니다.</div>
              ) : (
                detailVideos.map((it, idx) => (
                  <div className="item" key={it.url + idx}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="pill">VIDEO #{idx + 1}</span>
                      <button onClick={() => window.open(it.url, "_blank")}>새창</button>
                    </div>
                    <video className="thumb" src={it.url} controls playsInline preload="metadata" />
                    <div className="small">{it.url}</div>
                  </div>
                ))
              )}
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
