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

// ✅ sku_groups 우선, 없으면 sku_props 변환, 그것도 없으면 sku_html(DOM)에서 최대한 파싱
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

    // 1) dl 구조 (dt=제목, dd=항목) 우선
    const dls = Array.from(root.querySelectorAll("dl"));
    for (const dl of dls) {
      const dt = dl.querySelector("dt");
      const title = (dt?.textContent || "").trim().replace(/[:：]\s*$/, "");
      if (!title) continue;

      const itemEls = Array.from(
        dl.querySelectorAll("li, button, a, [role='button'], [class*='item'], [class*='option']")
      );
      const items: any[] = [];
      const seen = new Set<string>();
      for (const el of itemEls) {
        const label = (el.textContent || "").trim().replace(/\s+/g, " ");
        const img =
          (el as any).querySelector?.("img")?.getAttribute?.("src") ||
          (el as any).querySelector?.("img")?.getAttribute?.("data-src") ||
          "";
        const key = (label || img || "").trim();
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({ label: label || key, img: img || undefined, disabled: false });
      }
      if (items.length >= 2) groups.push({ title, items });
    }

    if (groups.length) return groups;

    // 2) fallback: 제목 후보 + 항목 2개 이상인 컨테이너
    const containers = Array.from(root.querySelectorAll("div, section, ul")).slice(0, 200);
    for (const c of containers) {
      const titleEl =
        c.querySelector("[class*='title'], [class*='name'], dt, label, strong") || null;
      const title = (titleEl?.textContent || "").trim().replace(/[:：]\s*$/, "");
      if (!title || title.length > 20) continue;

      const itemEls = Array.from(
        c.querySelectorAll("li, button, a, [role='button'], [class*='item'], [class*='option']")
      ).filter((el) => {
        const t = (el.textContent || "").trim();
        const hasImg = !!(el as any).querySelector?.("img");
        return hasImg || (t.length > 0 && t.length <= 30);
      });

      if (itemEls.length < 2) continue;

      const items: any[] = [];
      const seen = new Set<string>();
      for (const el of itemEls) {
        const label = (el.textContent || "").trim().replace(/\s+/g, " ");
        const img =
          (el as any).querySelector?.("img")?.getAttribute?.("src") ||
          (el as any).querySelector?.("img")?.getAttribute?.("data-src") ||
          "";
        const key = (label || img || "").trim();
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({ label: label || key, img: img || undefined, disabled: false });
      }
      if (items.length >= 2) groups.push({ title, items });
      if (groups.length >= 6) break;
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



// [Assets & Constants]
const HERO_IMAGE_PRIMARY = "/attached_assets/generated_images/aipage.png";
const HERO_IMAGE_FALLBACK =
  "https://raw.githubusercontent.com/nanainternational/nana-renewal/refs/heads/main/attached_assets/generated_images/aipage.png";
const HERO_TEXT_FULL = "링크 하나로 끝내는\n상세페이지 매직.";

// [Extension Download]
const EXTENSION_DOWNLOAD_URL = "https://github.com/nanainternational/nana-renewal/releases/latest/download/nana-1688-extractor.zip";


// [Utility] Fetch & Blob
async function fetchSmartBlob(url: string, apiUrlStr: string): Promise<{ blob: Blob; ext: string } | null> {
  // 1) 서버 프록시로 먼저 시도(1688/alicdn 403 방지)
  try {
    const proxyRes = await fetch(`${apiUrlStr}?url=${encodeURIComponent(url)}`);
    if (proxyRes.ok) {
      const blob = await proxyRes.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      return { blob, ext };
    }
  } catch (e) {}

  // 2) 마지막으로 원본 URL 직접 시도
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      return { blob, ext: blob.type.includes("png") ? "png" : "jpg" };
    }
  } catch (e) {}

  return null;
}

// [Utility] Date stamp
function nowStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return yy + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes());
}

// [Utility] Copy
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

// [Utility] Canvas wrap text (현재는 유지)
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

  // [State] AI Data (✅ AI생성 안해도 직접 수정/기입 가능하게 유지)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProductName, setAiProductName] = useState("");
  const [aiEditor, setAiEditor] = useState("");
  const [aiCoupangKeywords, setAiCoupangKeywords] = useState<string[]>([]);
  const [aiAblyKeywords, setAiAblyKeywords] = useState<string[]>([]);

  // [State] Keyword Inputs
  const [newCoupangKw, setNewCoupangKw] = useState("");
  const [newAblyKw, setNewAblyKw] = useState("");

  // [State] Sample Order
  const [sampleTitle, setSampleTitle] = useState("");
  const [sampleImage, setSampleImage] = useState("");
  
  const [skuGroups, setSkuGroups] = useState<SkuGroup[]>([]);
  const [selectedSku, setSelectedSku] = useState<Record<string, string>>({});
const [samplePrice, setSamplePrice] = useState("");
  const [sampleOption, setSampleOption] = useState("");
  const [sampleQty, setSampleQty] = useState(1);

  // [State] Hero UI
  const [heroTyped, setHeroTyped] = useState("");
  const [heroTypingOn, setHeroTypingOn] = useState(true);
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE_PRIMARY);

  // ✅ 어떤 버튼을 눌러도 "아무 일도 안 일어나는" 느낌이 없게: 상태 메시지를 화면 하단 토스트로 보여줌
  const [toastText, setToastText] = useState("");
  const toastTimerRef = useRef<number | null>(null);

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
    if (!status) return;
    showToast(status);
  }, [status]);

  const urlCardRef = useRef<HTMLDivElement | null>(null);
  const API_BASE = (import.meta as any)?.env?.VITEITE_API_BASE || (import.meta as any)?.env?.VITE_API_BASE || "";

  function apiUrl(p: string) {
    const base = String(API_BASE || "")
      .trim()
      .replace(/\/$/, "");
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

function handleSelectSku(groupTitle: string, itemLabel: string) {
  setSelectedSku((prev) => {
    const next = { ...prev, [groupTitle]: itemLabel };
    const opt = Object.values(next).filter(Boolean).join(" / ");
    setSampleOption(opt);
    return next;
  });
}

  // (기존 유지) 확장프로그램 메시지 수신
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      const d: any = ev?.data;
      if (!d || d.type !== "VVIC_SAMPLE_ORDER") return;
      const p = d.payload || {};

      if (typeof p.url === "string" && p.url.trim()) setUrlInput(p.url.trim());

      if (typeof p.title === "string" && p.title.trim()) {
        const t = p.title.trim();
        setSampleTitle(t);
      }
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

  // 상태 변경 시 토스트 표시(짧은 메시지만 자동 숨김)
  useEffect(() => {
    if (!status) return;
    setToastText(status);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);

    const len = String(status).length;
    // 에러/안내문이 길면 자동으로 숨기지 않음
    if (len <= 140) {
      toastTimerRef.current = window.setTimeout(() => {
        setToastText("");
        toastTimerRef.current = null;
      }, 2400);
    }
  }, [status]);

  // [Func] Fetch URL Data (기존 유지: 최신 추출 데이터 불러오기)
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

      // ✅ 1688은 AI 안눌러도 사용자가 직접 수정 가능하므로, 서버에서 product_name 오면 기본값만 채움
      if (data.product_name && !aiProductName) setAiProductName(data.product_name);

      // ✅ 샘플 주문 담기 자동 입력(상품명/URL/단가/옵션)
      const savedUrl = String(data.url || "").trim();
      if (savedUrl) setUrlInput(savedUrl);
      const prodName = String(data.product_name || "").trim();
      if (prodName && !sampleTitle) setSampleTitle(prodName);
      const firstMain = (data.main_media || [])[0];
      const firstMainUrl = typeof firstMain === "string" ? firstMain : firstMain?.url;
      if (firstMainUrl && !sampleImage) setSampleImage(firstMainUrl);

      const rawUnit =
        data.price ??
        data.unit_price ??
        data.unitPrice ??
        data.min_price ??
        data.minPrice ??
        data.price_min ??
        data.priceMin ??
        (Array.isArray(data.price_range || data.priceRange) ? (data.price_range || data.priceRange)[0] : "") ??
        data.price_range ??
        data.priceRange ??
        "";

      if (!samplePrice) {
        if (typeof rawUnit === "number") setSamplePrice(String(rawUnit));
        else if (typeof rawUnit === "string" && rawUnit.trim()) {
          const num = rawUnit.replace(/[^0-9.]/g, "");
          if (num) setSamplePrice(num);
        }
      }

      // ✅ SKU 옵션 그룹 세팅 (sku_groups 우선, 없으면 sku_props/sku_html 파싱)
      const groups = getSkuGroupsFromData(data as any);
      if (Array.isArray(groups) && groups.length) {
        setSkuGroups(groups as any);

        // 초기값 세팅 (첫 번째 옵션 자동 선택)
        const init: Record<string, string> = {};
        for (const g of groups as any[]) {
          const first = g?.items?.find((it: any) => !it?.disabled) || g?.items?.[0];
          if (g?.title && first?.label) init[g.title] = first.label;
        }
        setSelectedSku(init);

        // 옵션 텍스트 input도 자동 채움 (비어있을 때만)
        const opt = Object.values(init).filter(Boolean).join(" / ");
        if (!sampleOption && opt) setSampleOption(opt);
      }

      let optText: any =
        data.option_text ??
        data.options_text ??
        data.options_raw ??
        data.optionsRaw ??
        data.optionText ??
        data.sku_text ??
        data.skuText ??
        data.sku_options ??
        data.skuOptions ??
        "";
      if (!optText && Array.isArray(data.skus)) {
        optText = data.skus
          .map((s: any) => {
            const name = s?.name || s?.title || "";
            const vals = Array.isArray(s?.values) ? s.values.join(", ") : s?.values || s?.value || "";
            const line = [name, vals].filter(Boolean).join(": ");
            return line || "";
          })
          .filter(Boolean)
          .join("\n");
      }
      if (!sampleOption && typeof optText === "string" && optText.trim()) setSampleOption(optText.trim());

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

      // ✅ 작은 아이콘/버튼 이미지 제거
      setStatus("이미지 정리 중... (작은 아이콘 제외)");
      const mm2 = await filterLargeImages(mm as any, 200);
      const dm2 = await filterLargeImages(dm as any, 200);

      setMainItems(mm2 as any);
      setDetailImages(dm2 as any);
      setDetailVideos([]);

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

  // ✅ 선택된 이미지들만 ZIP에 담아 다운로드
  async function handleMergeAndDownloadZip() {
    const selectedMainItems = mainItems.filter((x) => x.checked && x.type === "image");
    const selectedDetailItems = detailImages.filter((x) => x.checked);

    if (!selectedMainItems.length && !selectedDetailItems.length) {
      setStatus("선택된 이미지가 없습니다.");
      return;
    }

    const folderName = nowStamp();
    setStatus("다운로드 패키지 생성 중...");
    setTopBusyText("이미지 패키징 중...");

    try {
      const zip = new JSZip();

      for (let i = 0; i < selectedMainItems.length; i++) {
        const result = await fetchSmartBlob(selectedMainItems[i].url, apiUrl("/api/1688/proxy/image"));
        if (result) zip.file(`main_${String(i + 1).padStart(2, "0")}.${result.ext}`, result.blob);
      }

      for (let i = 0; i < selectedDetailItems.length; i++) {
        const result = await fetchSmartBlob(selectedDetailItems[i].url, apiUrl("/api/1688/proxy/image"));
        if (result) zip.file(`detail_${String(i + 1).padStart(2, "0")}.${result.ext}`, result.blob);
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

  // ✅ 1688처럼 "상세페이지 넣기" 버튼/기능: 선택된 상세 이미지를 localStorage에 저장 + IMG HTML 복사

  async function handlePutDetailPage() {
  const selectedDetailItems = detailImages.filter((x) => x.checked);
  if (!selectedDetailItems.length) {
    setStatus("상세페이지에 넣을 이미지가 없습니다. (상세 이미지에서 체크)");
    return;
  }

  // ✅ 안전장치: 이미지 최대 100장, 캔버스 높이 최대 100000px
  const limitedItems = selectedDetailItems.slice(0, 100);
  const MAX_HEIGHT = 100000;

  // ✅ draft 저장(기존 유지)
  const payload = {
    domain: "1688",
    source_url: urlInput.trim(),
    product_name: aiProductName,
    editor: aiEditor,
    coupang_keywords: aiCoupangKeywords,
    ably_keywords: aiAblyKeywords,
    detail_images: limitedItems.map((x) => x.url),
    created_at: Date.now(),
  };

  try {
    localStorage.setItem("nana_detail_draft", JSON.stringify(payload));
  } catch (e) {}

  // ✅ VVIC 방식: 캔버스에 상세페이지 이미지로 합성해서 다운로드
  setStatus("상세페이지 만들기 중...");
  startProgress(["상세페이지 구성 중...", "이미지 로딩 중...", "PNG 생성 중..."]);

  // ✅ roundRect 호환(타입/브라우저 이슈 방지)
  function pathRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    tl: number,
    tr: number = tl,
    br: number = tl,
    bl: number = tl
  ) {
    const clamp = (v: number) => Math.max(0, Math.min(v, Math.min(w, h) / 2));
    tl = clamp(tl);
    tr = clamp(tr);
    br = clamp(br);
    bl = clamp(bl);

    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    if (tr) ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    else ctx.lineTo(x + w, y);

    ctx.lineTo(x + w, y + h - br);
    if (br) ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    else ctx.lineTo(x + w, y + h);

    ctx.lineTo(x + bl, y + h);
    if (bl) ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    else ctx.lineTo(x, y + h);

    ctx.lineTo(x, y + tl);
    if (tl) ctx.quadraticCurveTo(x, y, x + tl, y);
    else ctx.lineTo(x, y);

    ctx.closePath();
  }

  function loadImg(u: string, timeoutMs = 15000): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = window.setTimeout(() => reject(new Error("이미지 로딩 타임아웃")), timeoutMs);

      img.crossOrigin = "anonymous";
      img.onload = () => {
        window.clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("이미지 로딩 실패"));
      };

      img.src = proxyImageUrl(u);
    });
  }

  try {
    const W = 1000;
    const P = 40;

    // 1) 상단 텍스트 높이 계산(미리 측정)
    const probeCanvas = document.createElement("canvas");
    probeCanvas.width = W;
    probeCanvas.height = 2000;
    const probeCtx = probeCanvas.getContext("2d");
    if (!probeCtx) throw new Error("Canvas를 만들 수 없습니다.");

    let y = P;

    if (aiProductName.trim()) {
      probeCtx.fillStyle = "#111";
      probeCtx.font = "900 34px Pretendard, sans-serif";
      y = wrapText(probeCtx, aiProductName.trim(), P, y + 34, W - P * 2, 44, true);
      y += 6;
    }
    // [MD 코멘트 섹션 디자인]
    if (aiEditor.trim()) {
      const boxWidth = W - P * 2;

      // 1) 텍스트 높이 미리 계산 (높이 가변 대응)
      probeCtx.font = "500 20px Pretendard, sans-serif";
      const editorLineHeight = 32;
      const tempY = wrapText(probeCtx, aiEditor.trim(), P + 40, 0, boxWidth - 80, editorLineHeight, true);
      const boxHeight = tempY + 100; // 여백 포함

      // box + 간격
      y += boxHeight + 60;
    }

    // 구분선 + 여백
    y += 2 + 24;

    // 2) 이미지 로딩 + 최종 높이 계산(100000px 제한)
    const maxW = W - P * 2;

    const loaded: { img: HTMLImageElement; drawH: number }[] = [];
    for (let i = 0; i < limitedItems.length; i++) {
      try {
        const img = await loadImg(limitedItems[i].url);
        const iw = (img as any).naturalWidth || img.width || 1;
        const ih = (img as any).naturalHeight || img.height || 1;

        const scale = maxW / iw;
        const drawH = Math.round(ih * scale);

        if (y + drawH + 18 + P > MAX_HEIGHT) {
          setStatus(`높이 제한(${MAX_HEIGHT}px) 때문에 ${i + 1}번째 이미지부터는 생략되었습니다. (최대 100장/100000px)`);
          break;
        }

        loaded.push({ img, drawH });
        y += drawH + 18;
      } catch (e) {
        // 로딩 실패는 스킵
        continue;
      }
    }

    const finalH = Math.min(MAX_HEIGHT, Math.max(y + P, 1200));

    // 3) 실제 그리기
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = finalH;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas를 만들 수 없습니다.");

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let yy = P;

    if (aiProductName.trim()) {
      ctx.save();
      ctx.fillStyle = "#111";
      ctx.font = "900 34px Pretendard, sans-serif";
      ctx.textAlign = "center";
      yy = wrapText(ctx, aiProductName.trim(), W / 2, yy + 34, W - P * 2, 44);
      ctx.restore();
      yy += 6;
    }
    // [MD 코멘트 섹션 디자인]
    if (aiEditor.trim()) {
      const boxWidth = W - (P * 2);

      // 1. 텍스트 높이 미리 계산 (높이 가변 대응)
      ctx.font = "500 20px Pretendard, sans-serif";
      const editorLineHeight = 32;
      ctx.textAlign = "center";
      const tempY = wrapText(ctx, aiEditor.trim(), W / 2, 0, boxWidth - 80, editorLineHeight, true);
      const boxHeight = tempY + 100; // 여백 포함

      // 2. 배경 라운드 박스 그리기
      ctx.fillStyle = "#F8F9FA"; // 연한 회색 배경
      pathRoundRect(ctx, P, yy, boxWidth, boxHeight, 20);
      ctx.fill();

      // 3. 왼쪽 포인트 바 (액센트 컬러)
      ctx.fillStyle = "#FEE500"; // 포인트 컬러 (노란색)
      pathRoundRect(ctx, P, yy, 6, boxHeight, 20, 0, 0, 20);
      ctx.fill();

      // 4. 타이틀 (MD'S COMMENT)
      ctx.fillStyle = "#111";
      ctx.font = "900 16px Pretendard, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MD'S COMMENT", W / 2, yy + 45);

      // 5. 본문 내용 그리기
      ctx.fillStyle = "#444";
      ctx.font = "500 20px Pretendard, sans-serif";
      yy = wrapText(ctx, aiEditor.trim(), W / 2, yy + 85, boxWidth - 60, editorLineHeight);
      ctx.textAlign = "left";

      yy += 60; // 섹션 간 간격
    }

    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(P, yy);
    ctx.lineTo(W - P, yy);
    ctx.stroke();
    yy += 24;

    for (let i = 0; i < loaded.length; i++) {
      const { img, drawH } = loaded[i];
      ctx.drawImage(img, P, yy, maxW, drawH);
      yy += drawH + 18;
    }

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
    if (!blob) throw new Error("PNG 생성 실패");

    const fileName = `${nowStamp()}_detailpage`;
    saveAs(blob, `${fileName}.png`);

    setStatus("상세페이지 넣기 완료! (VVIC 방식: PNG 다운로드 + draft 저장)");
  } catch (e: any) {
    setStatus("상세페이지 생성 실패: " + (e?.message || "오류"));
  } finally {
    stopProgress();
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
      alert("판매가를 입력해주세요.");
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

      alert(
        `[중국사입] 리스트에 담겼습니다!\n\n상품: ${sampleItem.productName}\n옵션: ${sampleItem.optionRaw}\n수량: ${sampleItem.quantity}`
      );
    } catch (e) {
      alert("장바구니 저장 실패");
    }
  }

  function addKw(setter: (v: any) => void, current: string[], raw: string) {
    const kw = String(raw || "").trim();
    if (!kw) return;
    if (current.includes(kw)) return;
    setter([...current, kw]);
  }

  function removeKw(setter: (v: any) => void, current: string[], kw: string) {
    setter(current.filter((x) => x !== kw));
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

        {toastText && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white border border-black/10 px-4 py-3 rounded-2xl shadow-xl text-sm font-extrabold text-black/70 whitespace-pre-wrap max-w-[92vw]">
              {toastText}
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

          /* AI Bento */
          .bento-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: auto auto; gap: 24px; }
          .bento-item { background: #F9F9FB; border-radius: 24px; padding: 32px; border: 1px solid rgba(0,0,0,0.03); }
          .bento-dark { background: #111; color: #fff; }
          .bento-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; opacity: 0.6; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
          .bento-content { font-size: 20px; font-weight: 800; line-height: 1.3; }
          .bento-sub { margin-top: 10px; font-size: 13px; color: rgba(0,0,0,0.55); font-weight: 500; }
          .bento-dark .bento-sub { color: rgba(255,255,255,0.55); }
          .bento-copy { font-size: 12px; font-weight: 800; cursor: pointer; padding: 6px 10px; border-radius: 999px; background: rgba(0,0,0,0.06); color: rgba(0,0,0,0.7); }
          .bento-dark .bento-copy { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.8); }
          .span-2 { grid-column: span 2; }
          .span-4 { grid-column: span 4; }

          .tag-wrap { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
          .tag { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.12); color: #fff; padding: 8px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; cursor: pointer; }
          .bento-item:not(.bento-dark) .tag { background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.06); color: #111; }
          .kw-input { width: 180px; max-width: 100%; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.06); color: #fff; padding: 10px 12px; border-radius: 12px; outline: none; font-size: 13px; font-weight: 700; }
          .bento-item:not(.bento-dark) .kw-input { border: 1px solid rgba(0,0,0,0.08); background: rgba(0,0,0,0.03); color: #111; }
          .kw-add-btn { border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color: #fff; padding: 10px 12px; border-radius: 12px; font-size: 13px; font-weight: 800; cursor: pointer; }
          .bento-item:not(.bento-dark) .kw-add-btn { border: 1px solid rgba(0,0,0,0.10); background: rgba(0,0,0,0.04); color: #111; }

          @media (max-width: 1024px) {
            .layout-container { padding: 0 24px 60px; }
            .hero-wrap { padding: 60px 30px; }
            .bento-grid { grid-template-columns: repeat(2, 1fr); }
            .span-2 { grid-column: span 2; }
            .span-4 { grid-column: span 2; }
          }
          @media (max-width: 768px) {
            .layout-container { padding: 0 16px 60px; }
            .hero-wrap { flex-direction: column; padding: 40px 24px; text-align: center; border-radius: 24px; }
            .hero-title { font-size: 32px; }
            .hero-input-box { flex-direction: column; padding: 12px; gap: 12px; width: 100%; }
            .hero-btn { width: 100%; }
            .grid-container { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .bento-grid { grid-template-columns: 1fr; }
            .span-2, .span-4 { grid-column: span 1; }
            .kw-input { width: 100%; }
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

                <a
                  href={EXTENSION_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-btn"
                  style={{
                    background: "#7C3AED",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                >
                  확장프로그램 다운로드
                </a>
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
                      checked={!!it.checked}
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
                      checked={!!it.checked}
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
                <p className="section-desc">AI 생성 안 해도 아래에서 직접 수정/기입 가능합니다.</p>
              </div>
              <div className="flex gap-3">
                <button className="btn-outline-black" onClick={generateByAI} disabled={aiLoading}>
                  {aiLoading ? "AI 생각 중..." : "AI 생성"}
                </button>
                <button className="btn-black" onClick={handlePutDetailPage}>
                  상세페이지 넣기
                </button>
              </div>
            </div>

            <div className="bento-grid">
              {/* PRODUCT NAME (editable) */}
              <div className="bento-item span-2">
                <div className="bento-title">
                  PRODUCT NAME
                  <span className="bento-copy" onClick={() => copyText(aiProductName)}>
                    COPY
                  </span>
                </div>
                <input
                  className="w-full border border-black/10 rounded-2xl px-4 py-3 text-[18px] font-extrabold outline-none bg-white"
                  value={aiProductName}
                  onChange={(e) => setAiProductName(e.target.value)}
                  placeholder="상품명 직접 입력 가능"
                />
                <div className="bento-sub">AI 생성 없이도 직접 입력/수정 가능합니다.</div>
              </div>

              {/* EDITOR (editable) */}
              <div className="bento-item span-2">
                <div className="bento-title">
                  EDITOR COPY
                  <span className="bento-copy" onClick={() => copyText(aiEditor)}>
                    COPY
                  </span>
                </div>
                <textarea
                  className="w-full border border-black/10 rounded-2xl px-4 py-3 text-[14px] font-semibold outline-none bg-white min-h-[160px]"
                  value={aiEditor}
                  onChange={(e) => setAiEditor(e.target.value)}
                  placeholder="에디터 문구 직접 입력 가능"
                />
                <div className="bento-sub">AI 생성 없이도 직접 입력/수정 가능합니다.</div>
              </div>

              {/* COUPANG KEYWORDS (editable tags) */}
              <div className="bento-item span-2 bento-dark">
                <div className="bento-title">
                  COUPANG KEYWORDS
                  <span className="bento-copy" onClick={() => copyText(aiCoupangKeywords.join(", "))}>
                    COPY
                  </span>
                </div>
                <div className="tag-wrap">
                  {aiCoupangKeywords.length > 0 ? (
                    aiCoupangKeywords.map((k, i) => (
                      <span key={i} className="tag" title="클릭하면 삭제" onClick={() => removeKw(setAiCoupangKeywords, aiCoupangKeywords, k)}>
                        #{k}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-300 text-sm">키워드 직접 추가 가능</span>
                  )}
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  <input
                    className="kw-input"
                    value={newCoupangKw}
                    onChange={(e) => setNewCoupangKw(e.target.value)}
                    placeholder="키워드 추가"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addKw(setAiCoupangKeywords, aiCoupangKeywords, newCoupangKw);
                        setNewCoupangKw("");
                      }
                    }}
                  />
                  <button
                    className="kw-add-btn"
                    onClick={() => {
                      addKw(setAiCoupangKeywords, aiCoupangKeywords, newCoupangKw);
                      setNewCoupangKw("");
                    }}
                  >
                    추가
                  </button>
                </div>
                <div className="bento-sub">태그 클릭 시 삭제됩니다.</div>
              </div>

              {/* ABLY KEYWORDS (editable tags) */}
              <div className="bento-item span-2 bento-dark">
                <div className="bento-title">
                  ABLY KEYWORDS
                  <span className="bento-copy" onClick={() => copyText(aiAblyKeywords.join(", "))}>
                    COPY
                  </span>
                </div>
                <div className="tag-wrap">
                  {aiAblyKeywords.length > 0 ? (
                    aiAblyKeywords.map((k, i) => (
                      <span key={i} className="tag" title="클릭하면 삭제" onClick={() => removeKw(setAiAblyKeywords, aiAblyKeywords, k)}>
                        #{k}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-300 text-sm">키워드 직접 추가 가능</span>
                  )}
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  <input
                    className="kw-input"
                    value={newAblyKw}
                    onChange={(e) => setNewAblyKw(e.target.value)}
                    placeholder="키워드 추가"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addKw(setAiAblyKeywords, aiAblyKeywords, newAblyKw);
                        setNewAblyKw("");
                      }
                    }}
                  />
                  <button
                    className="kw-add-btn"
                    onClick={() => {
                      addKw(setAiAblyKeywords, aiAblyKeywords, newAblyKw);
                      setNewAblyKw("");
                    }}
                  >
                    추가
                  </button>
                </div>
                <div className="bento-sub">태그 클릭 시 삭제됩니다.</div>
              </div>
            </div>

            {/* Sample Order */}
            <div className="mt-10 bg-white rounded-2xl border border-gray-200 p-6">
              <div className="font-extrabold text-lg mb-3">샘플 주문 담기</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="md:col-span-2">
                  <div className="text-sm font-bold mb-2">상품 URL</div>
                  <input
                    className="w-full border border-gray-200 rounded-xl p-3 outline-none bg-gray-50"
                    value={urlInput}
                    readOnly
                    placeholder="1688 상품 URL"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold mb-2">상품명</div>
                  <input
                    className="w-full border border-gray-200 rounded-xl p-3 outline-none"
                    value={sampleTitle}
                    onChange={(e) => setSampleTitle(e.target.value)}
                    placeholder="상품명"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold mb-2">판매가 (CNY)</div>
                  <input
                    className="w-full border border-gray-200 rounded-xl p-3 outline-none"
                    value={samplePrice}
                    onChange={(e) => setSamplePrice(e.target.value)}
                    placeholder="예: 29.9"
                  />
                </div>

                <div>
                  <div className="text-sm font-bold mb-2">수량</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-4 h-12 rounded-xl border border-gray-200 hover:border-black/40 bg-white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSampleQty((prev) => Math.max(1, (prev || 1) - 1));
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label="minus"
                    >
                      -
                    </button>

                    <input
                      inputMode="numeric"
                      className="flex-1 border border-gray-200 rounded-xl p-3 outline-none text-center"
                      value={sampleQty}
                      onChange={(e) => {
                        const raw = (e.target.value || "").replace(/[^0-9]/g, "");
                        const n = parseInt(raw || "1", 10);
                        setSampleQty(Math.max(1, Number.isFinite(n) ? n : 1));
                      }}
                    />

                    <button
                      type="button"
                      className="px-4 h-12 rounded-xl border border-gray-200 hover:border-black/40 bg-white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSampleQty((prev) => Math.max(1, (prev || 1) + 1));
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label="plus"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* ✅ 동적 옵션 UI (skuSelection 기반) */}
                {skuGroups.length ? (
                  <div className="md:col-span-2 rounded-xl border border-gray-200 p-4 bg-gray-50">
                    <div className="text-sm font-bold mb-3">옵션 선택</div>
                    <div className="grid grid-cols-1 gap-4">
                      {skuGroups.map((g) => (
                        <div key={g.title}>
                          <div className="text-xs font-bold mb-2">{g.title}</div>
                          <div className="flex flex-wrap gap-2">
                            {g.items.map((it) => {
                              const active = selectedSku[g.title] === it.label;
                              return (
                                <button
                                  type="button"
                                  key={g.title + "::" + it.label}
                                  disabled={!!it.disabled}
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectSku(g.title, it.label); }}
                                    onMouseDown={(e) => { e.preventDefault(); }}
                                  className={`px-3 py-2 rounded-xl border text-xs ${
                                    active ? "border-black" : "border-gray-200"
                                  } ${it.disabled ? "opacity-40 cursor-not-allowed" : "hover:border-black/40"} bg-white`}
                                >
                                  <div className="flex items-center gap-2">
                                    {it.img ? (
                                      <img src={proxyImageUrl(it.img)} alt="" className="w-6 h-6 rounded-lg object-cover" />
                                    ) : null}
                                    <span>{it.label}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="md:col-span-2">
                  <div className="text-sm font-bold mb-2">옵션</div>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl p-3 outline-none min-h-[120px]"
                    value={sampleOption}
                    onChange={(e) => setSampleOption(e.target.value)}
                    placeholder="예: 색상/사이즈 등 옵션 내용"
                  />
                </div>

                <div className="md:col-span-2 flex gap-2 justify-end">
                  <button className="btn-outline-black" onClick={handlePutDetailPage}>
                    상세페이지 넣기
                  </button>
                  <button className="btn-black" onClick={handleAddToSampleList}>
                    리스트에 담기
                  </button>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-400">
                * 상품명/키워드는 AI 생성 없이도 직접 입력해서 저장/복사/상세페이지 넣기까지 가능합니다.
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
