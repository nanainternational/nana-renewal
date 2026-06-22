import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import ScrollToTop from "@/components/ScrollToTop";
import { API_BASE } from "@/lib/queryClient";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";

type UploadedDetailImage = {
  id: string;
  name: string;
  previewUrl: string;
  size: number;
};

type ProductInfoRow = {
  label: string;
  vals: string[];
  active: number;
};

type OptionalBottomBlockKey = "topSize" | "bottomSize" | "washingTip";

const AI_IMAGE_LIMIT = 3;
const MAX_AI_DATA_URL_LENGTH = Math.floor(1.5 * 1024 * 1024);
const AI_COMPRESSION_STEPS = [
  { maxSize: 1024, quality: 0.76 },
  { maxSize: 800, quality: 0.68 },
  { maxSize: 640, quality: 0.6 },
];
const TOP_ITEMS = ["어깨", "가슴단면", "암홀", "소매길이", "소매통", "소매끝단면", "총장"];
const BOTTOM_ITEMS = ["허리단면", "힙단면", "허벅지단면", "밑위단면", "밑단단면", "총장"];
const PRODUCT_INFO_ROWS: ProductInfoRow[] = [
  { label: "비침", vals: ["없음", "약간", "있음"], active: 0 },
  { label: "신축성", vals: ["없음", "약간", "좋음"], active: 1 },
  { label: "두께감", vals: ["얇음", "보통", "두꺼움"], active: 1 },
  { label: "안감", vals: ["없음", "있음"], active: 0 },
];
const DEFAULT_WASHING_TIP = "모든 의류의 첫 세탁은 드라이 크리닝을 권장합니다.";
const MAX_CANVAS_HEIGHT = 60000;
const MAX_CANVAS_PIXELS = 80000000;
const DOWNLOAD_FILE_NAME = "upload-detail-page.png";

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024)).toLocaleString()}KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function createInitialSizeValues(items: string[], mode = "FREE") {
  const colCount = sizeColumnsFromMode(mode).length;
  return items.reduce<Record<string, string[]>>((acc, item) => {
    acc[item] = Array.from({ length: colCount }, () => "");
    return acc;
  }, {});
}

function cloneProductInfoRows() {
  return PRODUCT_INFO_ROWS.map((row) => ({ ...row, vals: [...row.vals] }));
}

function sizeColumnsFromMode(mode: string): string[] {
  if (mode === "FREE") return ["FREE"];
  const sizeCount = Math.max(1, Math.min(5, Number(mode) || 1));
  return ["S", "M", "L", "XL", "2XL"].slice(0, sizeCount);
}

function loadImageForCanvas(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다. 업로드한 이미지를 확인해주세요."));
    image.src = src;
  });
}

function normalizeKeywords(value: unknown) {
  return Array.isArray(value)
    ? value.map((keyword) => String(keyword || "").trim()).filter(Boolean).slice(0, 5)
    : [];
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
  const words = text.replace(/\r/g, "").split(/(\s+|\n)/);
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    if (word === "\n") {
      if (!measureOnly) ctx.fillText(line.trim(), x, currentY);
      line = "";
      currentY += lineHeight;
      return;
    }

    const testLine = `${line}${word}`;
    if (ctx.measureText(testLine).width > maxWidth && line.trim()) {
      if (!measureOnly) ctx.fillText(line.trim(), x, currentY);
      line = word.trimStart();
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line.trim()) {
    if (!measureOnly) ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

function pathRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tl: number,
  tr = tl,
  br = tl,
  bl = tl
) {
  const clamp = (v: number) => Math.max(0, Math.min(v, Math.min(w, h) / 2));
  const rtl = clamp(tl);
  const rtr = clamp(tr);
  const rbr = clamp(br);
  const rbl = clamp(bl);

  ctx.beginPath();
  ctx.moveTo(x + rtl, y);
  ctx.lineTo(x + w - rtr, y);
  if (rtr) ctx.quadraticCurveTo(x + w, y, x + w, y + rtr);
  else ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - rbr);
  if (rbr) ctx.quadraticCurveTo(x + w, y + h, x + w - rbr, y + h);
  else ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + rbl, y + h);
  if (rbl) ctx.quadraticCurveTo(x, y + h, x, y + h - rbl);
  else ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + rtl);
  if (rtl) ctx.quadraticCurveTo(x, y, x + rtl, y);
  else ctx.lineTo(x, y);
  ctx.closePath();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string
) {
  pathRoundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function getTopSvgString() {
  return `<svg viewBox="0 0 240 240" width="240" height="240" xmlns="http://www.w3.org/2000/svg">
    <path d="M 70 50 Q 120 75 170 50 L 220 90 L 195 130 L 175 110 L 175 200 L 65 200 L 65 110 L 45 130 L 20 90 Z" fill="#fff" stroke="#ccc" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 90 50 Q 120 80 150 50" fill="none" stroke="#ccc" stroke-width="2"/>
    <line x1="70" y1="35" x2="170" y2="35" stroke="#ff6b6b" stroke-width="1.5" stroke-dasharray="4"/><circle cx="70" cy="35" r="3" fill="#ff6b6b"/><circle cx="170" cy="35" r="3" fill="#ff6b6b"/><text x="120" y="28" font-size="11" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#ff6b6b">어깨</text>
    <line x1="65" y1="120" x2="175" y2="120" stroke="#4dabf7" stroke-width="1.5" stroke-dasharray="4"/><text x="120" y="115" font-size="11" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#4dabf7">가슴단면</text>
    <line x1="185" y1="50" x2="185" y2="200" stroke="#20c997" stroke-width="1.5" stroke-dasharray="4"/><circle cx="185" cy="50" r="3" fill="#20c997"/><circle cx="185" cy="200" r="3" fill="#20c997"/><text x="210" y="130" font-size="11" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#20c997">총장</text>
    <line x1="170" y1="50" x2="220" y2="90" stroke="#fcc419" stroke-width="1.5" stroke-dasharray="4"/><text x="215" y="65" font-size="11" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#fcc419">소매</text>
  </svg>`;
}

function getBottomSvgString() {
  return `<svg viewBox="0 0 240 240" width="240" height="240" xmlns="http://www.w3.org/2000/svg">
    <path d="M 60 40 L 180 40 L 190 200 L 130 200 L 120 100 L 110 200 L 50 200 Z" fill="#fff" stroke="#ccc" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 60 55 Q 120 65 180 55" fill="none" stroke="#ccc" stroke-width="1"/>
    <line x1="60" y1="25" x2="180" y2="25" stroke="#ff6b6b" stroke-width="1.5" stroke-dasharray="4"/><text x="120" y="18" font-size="11" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#ff6b6b">허리단면</text>
    <line x1="55" y1="80" x2="185" y2="80" stroke="#4dabf7" stroke-width="1.5" stroke-dasharray="4"/><text x="120" y="75" font-size="11" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#4dabf7">힙단면</text>
    <line x1="53" y1="110" x2="118" y2="110" stroke="#fcc419" stroke-width="1.5" stroke-dasharray="4"/><text x="85" y="105" font-size="11" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#fcc419">허벅지</text>
    <line x1="200" y1="40" x2="200" y2="200" stroke="#20c997" stroke-width="1.5" stroke-dasharray="4"/><circle cx="200" cy="40" r="3" fill="#20c997"/><circle cx="200" cy="200" r="3" fill="#20c997"/><text x="225" y="125" font-size="11" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#20c997">총장</text>
  </svg>`;
}

function drawSvgToCanvas(
  canvasCtx: CanvasRenderingContext2D,
  svgString: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvasCtx.drawImage(img, x, y, w, h);
      URL.revokeObjectURL(blobUrl);
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve();
    };

    img.src = blobUrl;
  });
}

export default function UploadDetailPage() {
  const [detailImages, setDetailImages] = useState<UploadedDetailImage[]>([]);
  const [mergeStatus, setMergeStatus] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [aiProductName, setAiProductName] = useState("");
  const [aiEditor, setAiEditor] = useState("");
  const [aiCoupangKeywords, setAiCoupangKeywords] = useState<string[]>([]);
  const [aiAblyKeywords, setAiAblyKeywords] = useState<string[]>([]);
  const [newCoupangKeyword, setNewCoupangKeyword] = useState("");
  const [newAblyKeyword, setNewAblyKeyword] = useState("");
  const [optionalBottomBlocks, setOptionalBottomBlocks] = useState({
    topSize: false,
    bottomSize: false,
    washingTip: false,
  });
  const [topSizeMode, setTopSizeMode] = useState("FREE");
  const [bottomSizeMode, setBottomSizeMode] = useState("FREE");
  const [topSizeValues, setTopSizeValues] = useState(() => createInitialSizeValues(TOP_ITEMS));
  const [bottomSizeValues, setBottomSizeValues] = useState(() => createInitialSizeValues(BOTTOM_ITEMS));
  const [topProductInfoRows, setTopProductInfoRows] = useState<ProductInfoRow[]>(cloneProductInfoRows);
  const [bottomProductInfoRows, setBottomProductInfoRows] = useState<ProductInfoRow[]>(cloneProductInfoRows);
  const [washingTipText, setWashingTipText] = useState(DEFAULT_WASHING_TIP);
  const objectUrlsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  const handleDetailImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length === 0) {
      event.target.value = "";
      return;
    }

    const uploadedImages = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(previewUrl);

      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        previewUrl,
        size: file.size,
      };
    });

    setDetailImages((currentImages) => [...currentImages, ...uploadedImages]);
    setMergeStatus(null);
    setAiStatus(null);
    event.target.value = "";
  };

  const revokeDetailImageUrl = (previewUrl: string) => {
    URL.revokeObjectURL(previewUrl);
    objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== previewUrl);
  };

  const handleDeleteDetailImage = (imageId: string) => {
    const imageToDelete = detailImages.find((image) => image.id === imageId);
    if (imageToDelete) {
      revokeDetailImageUrl(imageToDelete.previewUrl);
    }

    setDetailImages((currentImages) =>
      currentImages.filter((image) => image.id !== imageId)
    );
    setMergeStatus(null);
    setAiStatus(null);
  };

  const handleMoveDetailImage = (index: number, direction: "up" | "down") => {
    setDetailImages((currentImages) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= currentImages.length) {
        return currentImages;
      }

      const nextImages = [...currentImages];
      [nextImages[index], nextImages[targetIndex]] = [
        nextImages[targetIndex],
        nextImages[index],
      ];

      return nextImages;
    });
    setMergeStatus(null);
    setAiStatus(null);
  };

  const handleResetUploadPage = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = "";
    setDetailImages([]);
    setMergeStatus(null);
    setAiStatus(null);
    setAiProductName("");
    setAiEditor("");
    setAiCoupangKeywords([]);
    setAiAblyKeywords([]);
    setNewCoupangKeyword("");
    setNewAblyKeyword("");
    setOptionalBottomBlocks({ topSize: false, bottomSize: false, washingTip: false });
    setTopSizeMode("FREE");
    setBottomSizeMode("FREE");
    setTopSizeValues(createInitialSizeValues(TOP_ITEMS));
    setBottomSizeValues(createInitialSizeValues(BOTTOM_ITEMS));
    setTopProductInfoRows(cloneProductInfoRows());
    setBottomProductInfoRows(cloneProductInfoRows());
    setWashingTipText(DEFAULT_WASHING_TIP);
  };

  const compressImageToJpegDataUrl = async (
    previewUrl: string,
    maxSize: number,
    quality: number
  ) => {
    const image = await loadImageForCanvas(previewUrl);
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;

    if (imageWidth <= 0 || imageHeight <= 0) {
      throw new Error("AI 분석용 이미지 크기를 확인하지 못했습니다.");
    }

    const scale = Math.min(1, maxSize / Math.max(imageWidth, imageHeight));
    const targetWidth = Math.max(1, Math.round(imageWidth * scale));
    const targetHeight = Math.max(1, Math.round(imageHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("AI 분석용 이미지를 압축할 수 없습니다.");
    }

    context.fillStyle = "#fff";
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL("image/jpeg", quality);
  };

  const buildCompressedAiImageUrls = async (images: UploadedDetailImage[]) => {
    let lastCompressedDataUrls: string[] = [];

    for (const step of AI_COMPRESSION_STEPS) {
      const compressedDataUrls = await Promise.all(
        images.map((image) =>
          compressImageToJpegDataUrl(image.previewUrl, step.maxSize, step.quality)
        )
      );
      const totalLength = compressedDataUrls.reduce(
        (sum, dataUrl) => sum + dataUrl.length,
        0
      );

      lastCompressedDataUrls = compressedDataUrls;
      if (totalLength <= MAX_AI_DATA_URL_LENGTH) {
        return compressedDataUrls;
      }
    }

    const finalLength = lastCompressedDataUrls.reduce(
      (sum, dataUrl) => sum + dataUrl.length,
      0
    );
    throw new Error(
      `이미지 용량이 커서 AI 분석이 어렵습니다. 현재 압축 후 용량은 약 ${(
        finalLength /
        1024 /
        1024
      ).toFixed(1)}MB입니다. 이미지 수를 줄이거나 더 작은 이미지로 다시 업로드해주세요.`
    );
  };

  const handleGenerateAiMarketing = async () => {
    if (detailImages.length === 0 || aiLoading) return;

    const aiTargetImages = detailImages.slice(0, AI_IMAGE_LIMIT);
    const sourceUrl = `upload://detail/${aiTargetImages
      .map((image) => encodeURIComponent(image.id))
      .join("-")}`;

    setAiLoading(true);
    setAiStatus(null);

    try {
      const imageUrls = await buildCompressedAiImageUrls(aiTargetImages);
      const response = await fetch(`${API_BASE}/api/vvic/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image_urls: imageUrls, source_url: sourceUrl }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        if (response.status === 401) {
          throw new Error("로그인 후 이용 가능합니다.");
        }
        if (response.status === 402) {
          throw new Error("크레딧이 부족합니다.");
        }
        if (response.status === 413) {
          throw new Error("이미지 용량이 커서 AI 분석이 어렵습니다.");
        }

        throw new Error(data?.error || "AI 생성에 실패했습니다.");
      }

      setAiProductName(data.product_name || "");
      setAiEditor(data.editor || "");

      if (Array.isArray(data.coupang_keywords)) {
        setAiCoupangKeywords(normalizeKeywords(data.coupang_keywords));
      }

      if (Array.isArray(data.ably_keywords)) {
        setAiAblyKeywords(normalizeKeywords(data.ably_keywords));
      }

      setAiStatus("AI 생성 완료");
    } catch (error) {
      setAiStatus(
        error instanceof Error
          ? error.message
          : "AI 생성 중 오류가 발생했습니다."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setAiStatus(successMessage);
    } catch {
      setAiStatus("복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
    }
  };

  const addKeyword = (
    value: string,
    keywords: string[],
    setKeywords: (value: string[]) => void,
    setInput: (value: string) => void
  ) => {
    const keyword = value.trim();
    if (!keyword) return;
    if (keywords.includes(keyword)) {
      setInput("");
      return;
    }
    setKeywords([...keywords, keyword].slice(0, 5));
    setInput("");
    setAiStatus(null);
  };

  const removeKeyword = (
    keyword: string,
    keywords: string[],
    setKeywords: (value: string[]) => void
  ) => {
    setKeywords(keywords.filter((item) => item !== keyword));
    setAiStatus(null);
  };

  const toggleOptionalBottomBlock = (key: OptionalBottomBlockKey) => {
    setOptionalBottomBlocks((current) => ({ ...current, [key]: !current[key] }));
  };

  const updateSizeMode = (section: "top" | "bottom", mode: string) => {
    const columns = sizeColumnsFromMode(mode);
    const items = section === "top" ? TOP_ITEMS : BOTTOM_ITEMS;
    const setMode = section === "top" ? setTopSizeMode : setBottomSizeMode;
    const setValues = section === "top" ? setTopSizeValues : setBottomSizeValues;

    setMode(mode);
    setValues((currentValues) =>
      items.reduce<Record<string, string[]>>((acc, item) => {
        const current = currentValues[item] || [];
        acc[item] = columns.map((_, index) => current[index] || "");
        return acc;
      }, {})
    );
  };

  const updateSizeValue = (
    section: "top" | "bottom",
    item: string,
    index: number,
    value: string
  ) => {
    const setValues = section === "top" ? setTopSizeValues : setBottomSizeValues;
    setValues((currentValues) => ({
      ...currentValues,
      [item]: (currentValues[item] || []).map((currentValue, valueIndex) =>
        valueIndex === index ? value : currentValue
      ),
    }));
  };

  const updateProductInfoActive = (
    section: "top" | "bottom",
    rowIndex: number,
    active: number
  ) => {
    const setRows = section === "top" ? setTopProductInfoRows : setBottomProductInfoRows;
    setRows((rows) =>
      rows.map((row, index) => (index === rowIndex ? { ...row, active } : row))
    );
  };

  const drawSizeBlock = async (
    ctx: CanvasRenderingContext2D,
    yStart: number,
    isTop: boolean,
    mode: string,
    items: string[],
    values: Record<string, string[]>,
    rows: ProductInfoRow[]
  ) => {
    const W = 1000;
    const P = 40;
    const sizeBlockH = 820;
    const panelX = P;
    const panelW = W - P * 2;
    const rowH = 44;
    const cols = sizeColumnsFromMode(mode);
    const infoY = yStart + 480;
    const leftW = 280;
    const tableX = panelX + leftW + 40;
    const tableW = panelW - leftW - 64;

    drawRoundedRect(ctx, panelX, yStart, panelW, sizeBlockH, 16, "#fff");
    ctx.strokeStyle = "#e9e9e9";
    ctx.strokeRect(panelX, yStart, panelW, sizeBlockH);

    ctx.fillStyle = "#111";
    ctx.font = "700 30px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${isTop ? "상의" : "하의"} SIZE INFO`, panelX + 16, yStart + 46);

    drawRoundedRect(ctx, panelX + 24, yStart + 90, leftW, 360, 12, "#fafafa");
    await drawSvgToCanvas(ctx, isTop ? getTopSvgString() : getBottomSvgString(), panelX + 52, yStart + 124, 220, 220);

    ctx.fillStyle = "#888";
    ctx.font = "400 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("* 측정 방법에 따라 오차가 발생할 수 있습니다.", panelX + 24 + leftW / 2, yStart + 430);
    ctx.textAlign = "left";

    const labelW = 180;
    const cellW = (tableW - labelW) / cols.length;
    ctx.fillStyle = "#666";
    ctx.font = "600 18px sans-serif";
    ctx.fillText("사이즈 (단위:cm)", tableX, yStart + 90);
    cols.forEach((c, i) => {
      ctx.textAlign = "center";
      ctx.fillText(c, tableX + labelW + i * cellW + cellW / 2, yStart + 90);
    });
    ctx.textAlign = "left";
    ctx.strokeStyle = "#222";
    ctx.beginPath();
    ctx.moveTo(tableX, yStart + 108);
    ctx.lineTo(tableX + tableW, yStart + 108);
    ctx.stroke();

    items.forEach((item, rowIndex) => {
      const rowY = yStart + 108 + rowH * rowIndex;
      ctx.strokeStyle = "#ececec";
      ctx.beginPath();
      ctx.moveTo(tableX, rowY + rowH);
      ctx.lineTo(tableX + tableW, rowY + rowH);
      ctx.stroke();
      ctx.fillStyle = "#444";
      ctx.font = "600 16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(item, tableX + 4, rowY + 29);
      cols.forEach((_, index) => {
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.fillText((values[item] || [])[index] || "-", tableX + labelW + index * cellW + cellW / 2, rowY + 29);
      });
    });

    ctx.textAlign = "left";
    ctx.fillStyle = "#111";
    ctx.font = "700 24px sans-serif";
    ctx.fillText("PRODUCT INFO", tableX, infoY);
    const infoRowH = 52;
    const labelColW = 120;
    const infoColW = (tableW - labelColW) / 4;
    rows.forEach((row, rowIndex) => {
      const rowY = infoY + 20 + rowIndex * infoRowH;
      ctx.fillStyle = "#f7f7f7";
      ctx.fillRect(tableX, rowY, labelColW, infoRowH);
      ctx.fillStyle = "#666";
      ctx.font = "600 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(row.label, tableX + labelColW / 2, rowY + 33);
      row.vals.forEach((value, colIndex) => {
        const cx = tableX + labelColW + colIndex * infoColW + infoColW / 2;
        if (colIndex === row.active) drawRoundedRect(ctx, cx - 28, rowY + 14, 56, 24, 12, "#111");
        ctx.fillStyle = colIndex === row.active ? "#fff" : "#333";
        ctx.font = colIndex === row.active ? "600 12px sans-serif" : "500 13px sans-serif";
        ctx.fillText(value, cx, rowY + 31);
      });
      ctx.strokeStyle = "#e8e8e8";
      ctx.beginPath();
      ctx.moveTo(tableX, rowY + infoRowH);
      ctx.lineTo(tableX + tableW, rowY + infoRowH);
      ctx.stroke();
    });

    ctx.textAlign = "left";
  };

  const drawWashingTipBlock = (ctx: CanvasRenderingContext2D, bottomY: number) => {
    const W = 1000;
    const P = 40;
    const washH = 1120;
    const x = P;
    const w = W - P * 2;

    drawRoundedRect(ctx, x, bottomY, w, washH, 16, "#111");
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "700 40px sans-serif";
    ctx.fillText("FABRIC WASHING TIP", W / 2, bottomY + 82);
    ctx.fillStyle = "#f0c37b";
    ctx.font = "700 21px sans-serif";
    ctx.fillText(washingTipText || DEFAULT_WASHING_TIP, W / 2, bottomY + 132);
    ctx.fillStyle = "#cfcfcf";
    ctx.font = "400 15px sans-serif";
    ctx.fillText("데님 및 색원단 제품은 이염 가능성이 있어 주의 부탁드립니다.", W / 2, bottomY + 162);

    const fabrics: [string, string, string][] = [
      ["COTTON", "면 (Cotton)", "드라이 세제 또는 울세제로 잠깐 담궜다가\n단독손세탁을 권장합니다."],
      ["RAYON", "레이온 (Rayon)", "레이온 소재 특성상 물에 약한 소재이므로\n첫 세탁은 드라이 크리닝 권장."],
      ["DENIM", "데님 (Denim)", "데님은 물빠짐이 있을 수 있어 첫 세탁은\n드라이 크리닝을 추천합니다."],
      ["POLY", "폴리 (Poly)", "중성세제를 이용해 미온수 손세탁을 권장하며\n건조 시 비틀어 짜지 마세요."],
      ["LINEN", "린넨 (Linen)", "색원단 물빠짐이 있을 수 있어\n단독 손세탁 또는 드라이 크리닝 권장."],
      ["ACRYLIC", "아크릴 (Acrylic)", "30도 이하 미지근한 물 손세탁 권장,\n정전기 방지를 위해 섬유유연제 사용."],
      ["WOOL", "울 (Wool)", "원형 보존을 위해 드라이 크리닝이 좋으며\n잦은 세탁은 수명을 단축시킬 수 있습니다."],
      ["TENCEL", "텐셀 (Tencel)", "물에 약해 변형 방지를 위해 드라이 크리닝 권장,\n보풀/늘어짐 주의."],
      ["NYLON", "나일론 (Nylon)", "장시간 물에 담그지 말고 빠르게 세탁,\n표백세제 사용은 피해주세요."],
      ["LEATHER", "가죽 (Leather)", "물에 약해 드라이 크리닝 권장,\n전용 크림 사용 및 통풍 보관이 좋습니다."],
    ];

    const gridX = x + 56;
    const gridY = bottomY + 210;
    const colW = (w - 112 - 30) / 2;
    const rowH = 160;

    fabrics.forEach(([code, title, desc], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cardX = gridX + col * (colW + 30);
      const cardY = gridY + row * rowH;
      drawRoundedRect(ctx, cardX, cardY, colW, 126, 14, "#1f1f1f");
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.strokeRect(cardX, cardY, colW, 126);
      ctx.textAlign = "left";
      ctx.fillStyle = "#f0c37b";
      ctx.font = "800 13px sans-serif";
      ctx.fillText(code, cardX + 22, cardY + 28);
      ctx.fillStyle = "#fff";
      ctx.font = "700 18px sans-serif";
      ctx.fillText(title, cardX + 22, cardY + 56);
      ctx.fillStyle = "#cfcfcf";
      ctx.font = "400 14px sans-serif";
      desc.split("\n").forEach((line, lineIndex) => {
        ctx.fillText(line, cardX + 22, cardY + 84 + lineIndex * 22);
      });
    });
    ctx.textAlign = "left";
  };

  const handleCreateDetailPage = async () => {
    if (detailImages.length === 0 || isMerging) return;

    setIsMerging(true);
    setMergeStatus("상세페이지 만드는 중...");

    try {
      const W = 1000;
      const P = 40;
      const maxW = W - P * 2;
      const imageItems = detailImages.slice(0, 100);
      const loadedImages: { image: HTMLImageElement; drawW: number; drawH: number }[] = [];

      for (const item of imageItems) {
        const image = await loadImageForCanvas(item.previewUrl);
        const imageWidth = image.naturalWidth || image.width;
        const imageHeight = image.naturalHeight || image.height;

        if (imageWidth <= 0 || imageHeight <= 0) {
          throw new Error("상세페이지에 넣을 이미지 크기를 확인하지 못했습니다.");
        }

        const targetW = imageWidth > maxW ? maxW : imageWidth;
        const drawW = Math.max(1, Math.round(targetW));
        const drawH = Math.max(1, Math.round((imageHeight * drawW) / imageWidth));
        loadedImages.push({ image, drawW, drawH });
      }

      const probeCanvas = document.createElement("canvas");
      probeCanvas.width = W;
      probeCanvas.height = 2000;
      const probeCtx = probeCanvas.getContext("2d");
      if (!probeCtx) throw new Error("Canvas를 만들 수 없습니다.");

      let y = P;
      if (aiProductName.trim()) {
        probeCtx.fillStyle = "#111";
        probeCtx.font = "900 34px sans-serif";
        probeCtx.textAlign = "center";
        y = wrapText(probeCtx, aiProductName.trim(), W / 2, y + 34, W - P * 2, 44, true);
        y += 6;
      }

      if (aiEditor.trim()) {
        const boxWidth = W - P * 2;
        probeCtx.font = "500 20px sans-serif";
        probeCtx.textAlign = "center";
        const measuredY = wrapText(probeCtx, aiEditor.trim(), W / 2, 0, boxWidth - 80, 32, true);
        y += measuredY + 100 + 60;
      }

      if (aiProductName.trim() || aiEditor.trim()) {
        y += 26;
      }

      loadedImages.forEach(({ drawH }) => {
        y += drawH + 18;
      });

      const sizeBlockH = 820;
      const washH = 1120;
      const blockGap = 28;
      const enabledCount =
        (optionalBottomBlocks.topSize ? 1 : 0) +
        (optionalBottomBlocks.bottomSize ? 1 : 0) +
        (optionalBottomBlocks.washingTip ? 1 : 0);
      if (enabledCount > 0) {
        y += 30;
        if (optionalBottomBlocks.topSize) y += sizeBlockH;
        if (optionalBottomBlocks.bottomSize) y += sizeBlockH;
        if (optionalBottomBlocks.washingTip) y += washH;
        y += blockGap * Math.max(0, enabledCount - 1);
      }

      const finalHeight = Math.max(1, Math.ceil(y + P));
      if (finalHeight > MAX_CANVAS_HEIGHT || W * finalHeight > MAX_CANVAS_PIXELS) {
        throw new Error(
          `상세페이지 이미지가 너무 깁니다. 최대 높이 ${MAX_CANVAS_HEIGHT.toLocaleString()}px 또는 총 픽셀 ${MAX_CANVAS_PIXELS.toLocaleString()}px 이하로 줄인 뒤 다시 시도해주세요.`
        );
      }

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = finalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas를 만들 수 없습니다.");

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      let yy = P;

      if (aiProductName.trim()) {
        ctx.save();
        ctx.fillStyle = "#111";
        ctx.font = "900 34px sans-serif";
        ctx.textAlign = "center";
        yy = wrapText(ctx, aiProductName.trim(), W / 2, yy + 34, W - P * 2, 44);
        ctx.restore();
        yy += 6;
      }

      if (aiEditor.trim()) {
        const boxWidth = W - P * 2;
        ctx.font = "500 20px sans-serif";
        ctx.textAlign = "center";
        const measuredY = wrapText(ctx, aiEditor.trim(), W / 2, 0, boxWidth - 80, 32, true);
        const boxHeight = measuredY + 100;

        drawRoundedRect(ctx, P, yy, boxWidth, boxHeight, 20, "#F8F9FA");
        drawRoundedRect(ctx, P, yy, 6, boxHeight, 20, "#FEE500");
        ctx.fillStyle = "#111";
        ctx.font = "900 16px sans-serif";
        ctx.fillText("MD'S COMMENT", W / 2, yy + 45);
        ctx.fillStyle = "#444";
        ctx.font = "500 20px sans-serif";
        yy = wrapText(ctx, aiEditor.trim(), W / 2, yy + 85, boxWidth - 60, 32);
        yy += 60;
      }

      if (aiProductName.trim() || aiEditor.trim()) {
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(P, yy);
        ctx.lineTo(W - P, yy);
        ctx.stroke();
        yy += 24;
      }

      for (const { image, drawW, drawH } of loadedImages) {
        const x = Math.round((W - drawW) / 2);
        ctx.drawImage(image, x, yy, drawW, drawH);
        yy += drawH + 18;
      }

      if (enabledCount > 0) yy += 30;
      if (optionalBottomBlocks.topSize) {
        await drawSizeBlock(ctx, yy, true, topSizeMode, TOP_ITEMS, topSizeValues, topProductInfoRows);
        yy += sizeBlockH + blockGap;
      }
      if (optionalBottomBlocks.bottomSize) {
        await drawSizeBlock(ctx, yy, false, bottomSizeMode, BOTTOM_ITEMS, bottomSizeValues, bottomProductInfoRows);
        yy += sizeBlockH + blockGap;
      }
      if (optionalBottomBlocks.washingTip) {
        drawWashingTipBlock(ctx, yy);
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("상세페이지 PNG를 생성하지 못했습니다."));
        }, "image/png");
      });

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = DOWNLOAD_FILE_NAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setMergeStatus("상세페이지 다운로드를 시작했습니다.");
    } catch (error) {
      setMergeStatus(
        error instanceof Error
          ? error.message
          : "상세페이지 생성 중 오류가 발생했습니다."
      );
    } finally {
      setIsMerging(false);
    }
  };

  const renderKeywordCard = (
    title: string,
    keywords: string[],
    inputValue: string,
    setInputValue: (value: string) => void,
    setKeywords: (value: string[]) => void,
    copyMessage: string
  ) => (
    <div className="bento keyword-card">
      <div className="bento-title">
        <span>{title}</span>
        <button
          type="button"
          className="bento-copy dark"
          onClick={() => copyText(keywords.join(", "), copyMessage)}
          disabled={keywords.length === 0}
        >
          전체 복사
        </button>
      </div>
      <div className="keyword-tags">
        {keywords.length > 0 ? (
          keywords.map((keyword) => (
            <button
              key={keyword}
              type="button"
              className="tag"
              onClick={() => removeKeyword(keyword, keywords, setKeywords)}
              title="클릭하면 삭제됩니다."
            >
              {keyword} ×
            </button>
          ))
        ) : (
          <span className="keyword-empty">키워드를 추가하거나 AI 생성으로 받아보세요.</span>
        )}
      </div>
      <div className="keyword-add-row">
        <input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addKeyword(inputValue, keywords, setKeywords, setInputValue);
            }
          }}
          className="kw-input"
          placeholder="키워드 추가"
        />
        <button
          type="button"
          className="kw-add-btn"
          onClick={() => addKeyword(inputValue, keywords, setKeywords, setInputValue)}
        >
          추가
        </button>
      </div>
    </div>
  );

  const renderSizeEditor = (
    section: "top" | "bottom",
    mode: string,
    items: string[],
    values: Record<string, string[]>,
    rows: ProductInfoRow[],
    isEnabled: boolean
  ) => {
    const cols = sizeColumnsFromMode(mode);
    return (
      <div className={`optional-editor ${!isEnabled ? "is-disabled" : ""}`}>
        <div className="optional-editor-head">
          <div>
            <div className="optional-editor-title">{section === "top" ? "상의" : "하의"} SIZE INFO</div>
            <p>{section === "top" ? "상의" : "하의"} 측정값과 상품 정보를 입력하세요.</p>
          </div>
          <div className="segmented-control">
            {["FREE", "2", "3", "4", "5"].map((item) => (
              <button
                key={item}
                type="button"
                className={`segmented-item ${mode === item ? "active" : ""}`}
                onClick={() => updateSizeMode(section, item)}
              >
                {item === "FREE" ? "FREE" : `S~${sizeColumnsFromMode(item).at(-1)}`}
              </button>
            ))}
          </div>
        </div>
        <div className="size-editor-body">
          <div className="measure-guide" dangerouslySetInnerHTML={{ __html: section === "top" ? getTopSvgString() : getBottomSvgString() }} />
          <div className="optional-size-grid">
            <table>
              <thead>
                <tr>
                  <th>항목</th>
                  {cols.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item}>
                    <th>{item}</th>
                    {cols.map((col, index) => (
                      <td key={`${item}-${col}`}>
                        <input
                          value={(values[item] || [])[index] || ""}
                          onChange={(event) => updateSizeValue(section, item, index, event.target.value)}
                          placeholder="-"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="product-info-options">
          {rows.map((row, rowIndex) => (
            <div key={row.label} className="product-info-row">
              <span>{row.label}</span>
              <div>
                {row.vals.map((value, valueIndex) => (
                  <button
                    key={value}
                    type="button"
                    className={`pi-pill ${row.active === valueIndex ? "active" : ""}`}
                    onClick={() => updateProductInfoActive(section, rowIndex, valueIndex)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="upload-detail-page">
      <Navigation />
      <main className="upload-main">
        <section className="hero-wrap">
          <div className="hero-content">
            <h1 className="hero-title">이미지 업로드로 끝내는{`\n`}상세페이지 매직.</h1>
            <p className="hero-desc">
              국내 도매, 동대문, 거래처, 카카오톡 등에서 받은 상세페이지 이미지를 업로드해 편집하고 상세페이지를 완성하세요.
            </p>
            <div className="hero-actions">
              <label htmlFor="detail-image-upload" className="hero-btn primary">
                <ImagePlus size={18} />
                상세 이미지 업로드
              </label>
              <button type="button" className="hero-btn secondary" onClick={handleResetUploadPage}>
                <RotateCcw size={18} />
                초기화
              </button>
            </div>
            <input
              ref={fileInputRef}
              id="detail-image-upload"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handleDetailImageUpload}
            />
          </div>
        </section>

        {(mergeStatus || aiStatus) && (
          <div className="status-banner">{aiStatus || mergeStatus}</div>
        )}

        <section className="content-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">상세 이미지</h2>
              <p className="section-desc">업로드된 모든 이미지는 현재 표시 순서대로 상세페이지 만들기에 포함됩니다.</p>
            </div>
            <div className="section-actions">
              <span className="image-count">{detailImages.length.toLocaleString()}장 업로드됨</span>
              <button
                type="button"
                className="btn-black"
                onClick={handleCreateDetailPage}
                disabled={detailImages.length === 0 || isMerging}
              >
                {isMerging ? <Loader2 className="spin-icon" size={16} /> : null}
                {isMerging ? "상세페이지 만드는 중..." : "상세페이지 만들기"}
              </button>
              <button
                type="button"
                className="btn-outline-black"
                onClick={handleGenerateAiMarketing}
                disabled={detailImages.length === 0 || aiLoading}
              >
                {aiLoading ? <Loader2 className="spin-icon" size={16} /> : <Sparkles size={16} />}
                {aiLoading ? "AI 생성 중..." : "AI 생성"}
              </button>
            </div>
          </div>

          {detailImages.length === 0 ? (
            <div className="empty-card">아직 업로드된 상세페이지 이미지가 없습니다.</div>
          ) : (
            <div className="grid-container">
              {detailImages.map((image, index) => (
                <article className="media-card" key={image.id}>
                  <div className="card-topline">
                    <span className="card-badge">DETAIL {String(index + 1).padStart(2, "0")}</span>
                    <div className="card-tools">
                      <button
                        type="button"
                        className="card-mini-btn"
                        onClick={() => handleMoveDetailImage(index, "up")}
                        disabled={index === 0}
                        aria-label={`상세 이미지 ${index + 1} 위로 이동`}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="card-mini-btn"
                        onClick={() => handleMoveDetailImage(index, "down")}
                        disabled={index === detailImages.length - 1}
                        aria-label={`상세 이미지 ${index + 1} 아래로 이동`}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="card-mini-btn danger"
                        onClick={() => handleDeleteDetailImage(image.id)}
                        aria-label={`상세 이미지 ${index + 1} 삭제`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="media-thumb">
                    <img src={image.previewUrl} alt={`업로드된 상세 이미지 ${index + 1}`} />
                  </div>
                  <div className="media-meta">
                    <strong title={image.name}>{image.name}</strong>
                    <span>{formatFileSize(image.size)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="content-section ai-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">AI 마케팅</h2>
              <p className="section-desc">현재 상세 이미지 순서 기준 앞 {AI_IMAGE_LIMIT}장을 분석해 문구와 키워드를 생성합니다.</p>
            </div>
          </div>
          <div className="bento-grid">
            <div className="bento bright product-card">
              <div className="bento-title">
                <span>PRODUCT NAME</span>
                <button type="button" className="bento-copy" onClick={() => copyText(aiProductName, "상품명을 복사했습니다.")} disabled={!aiProductName}>
                  <Copy size={13} /> 복사
                </button>
              </div>
              <input
                value={aiProductName}
                onChange={(event) => setAiProductName(event.target.value)}
                className="bento-input"
                placeholder="AI 생성 후 상품명이 표시됩니다."
              />
            </div>
            <div className="bento bright editor-card">
              <div className="bento-title">
                <span>EDITOR'S NOTE</span>
                <button type="button" className="bento-copy" onClick={() => copyText(aiEditor, "에디터 문구를 복사했습니다.")} disabled={!aiEditor}>
                  <Copy size={13} /> 복사
                </button>
              </div>
              <textarea
                value={aiEditor}
                onChange={(event) => setAiEditor(event.target.value)}
                className="bento-textarea"
                placeholder="AI 생성 후 에디터 문구가 표시됩니다."
              />
            </div>
            {renderKeywordCard("COUPANG KEYWORDS", aiCoupangKeywords, newCoupangKeyword, setNewCoupangKeyword, setAiCoupangKeywords, "쿠팡 키워드를 복사했습니다.")}
            {renderKeywordCard("ABLY KEYWORDS", aiAblyKeywords, newAblyKeyword, setNewAblyKeyword, setAiAblyKeywords, "에이블리 키워드를 복사했습니다.")}
          </div>
        </section>

        <section className="content-section optional-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">하단 섹션 노출 설정</h2>
              <p className="section-desc">사용함으로 설정한 블록만 최종 상세페이지 PNG 하단에 포함됩니다.</p>
            </div>
          </div>

          <div className="optional-blocks">
            <div className="optional-card">
              <div>
                <h3 className="optional-title">상의 사이즈 섹션</h3>
                <p className="optional-desc">상의 측정 가이드와 사이즈 정보를 추가합니다.</p>
              </div>
              <button type="button" className={`toggle-btn ${optionalBottomBlocks.topSize ? "active" : ""}`} onClick={() => toggleOptionalBottomBlock("topSize")}>
                {optionalBottomBlocks.topSize ? "사용함" : "사용안함"}
              </button>
              {renderSizeEditor("top", topSizeMode, TOP_ITEMS, topSizeValues, topProductInfoRows, optionalBottomBlocks.topSize)}
            </div>

            <div className="optional-card">
              <div>
                <h3 className="optional-title">하의 사이즈 섹션</h3>
                <p className="optional-desc">하의 측정 가이드와 사이즈 정보를 추가합니다.</p>
              </div>
              <button type="button" className={`toggle-btn ${optionalBottomBlocks.bottomSize ? "active" : ""}`} onClick={() => toggleOptionalBottomBlock("bottomSize")}>
                {optionalBottomBlocks.bottomSize ? "사용함" : "사용안함"}
              </button>
              {renderSizeEditor("bottom", bottomSizeMode, BOTTOM_ITEMS, bottomSizeValues, bottomProductInfoRows, optionalBottomBlocks.bottomSize)}
            </div>

            <div className="optional-card washing-card">
              <div>
                <h3 className="optional-title">원단별 세탁 가이드</h3>
                <p className="optional-desc">FABRIC WASHING TIP 문구를 편집합니다.</p>
              </div>
              <button type="button" className={`toggle-btn ${optionalBottomBlocks.washingTip ? "active" : ""}`} onClick={() => toggleOptionalBottomBlock("washingTip")}>
                {optionalBottomBlocks.washingTip ? "사용함" : "사용안함"}
              </button>
              <div className={`washing-editor ${!optionalBottomBlocks.washingTip ? "is-disabled" : ""}`}>
                <textarea
                  value={washingTipText}
                  onChange={(event) => setWashingTipText(event.target.value)}
                  className="optional-tip-input"
                  placeholder="세탁 가이드 안내 문구를 입력하세요."
                />
                <div className="washing-preview">
                  <strong>FABRIC WASHING TIP</strong>
                  <span>{washingTipText || DEFAULT_WASHING_TIP}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <ScrollToTop />

      <style>{`
        .upload-detail-page { min-height: 100vh; background: #f7f8fb; color: #111; }
        .upload-main { max-width: 1180px; margin: 0 auto; padding: 112px 20px 72px; }
        .hero-wrap { position: relative; display: flex; align-items: center; min-height: 520px; overflow: hidden; border-radius: 36px; padding: 80px 70px; background: radial-gradient(circle at 82% 20%, rgba(254,229,0,0.28), transparent 30%), linear-gradient(135deg, #08111f 0%, #17233c 48%, #0c1324 100%); box-shadow: 0 24px 60px rgba(8,17,31,0.24); }
        .hero-wrap::after { content: ""; position: absolute; inset: auto -80px -140px auto; width: 440px; height: 440px; border-radius: 999px; background: rgba(255,255,255,0.08); }
        .hero-content { position: relative; z-index: 1; width: 100%; max-width: 650px; background: rgba(255,255,255,0.88); backdrop-filter: blur(3px); border-radius: 20px; padding: 30px; box-shadow: 0 14px 30px rgba(0,0,0,0.12); }
        .hero-title { white-space: pre-wrap; font-size: 52px; font-weight: 900; line-height: 1.15; letter-spacing: -1.5px; margin: 0 0 24px; color: #080808; }
        .hero-desc { margin: 0 0 32px; font-size: 18px; line-height: 1.75; color: rgba(0,0,0,0.62); font-weight: 600; }
        .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; }
        .hero-btn { display: inline-flex; align-items: center; justify-content: center; gap: 9px; border: 0; border-radius: 14px; padding: 15px 24px; font-size: 15px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .hero-btn.primary { background: #fee500; color: #111; box-shadow: 0 14px 24px rgba(0,0,0,0.16); }
        .hero-btn.secondary { background: #111; color: #fff; box-shadow: 0 14px 24px rgba(0,0,0,0.16); }
        .hero-btn:hover { transform: translateY(-1px); box-shadow: 0 18px 28px rgba(0,0,0,0.2); }
        .status-banner { margin: 22px 4px 0; border-radius: 16px; background: #111; color: #fff; padding: 16px 18px; font-size: 14px; font-weight: 700; }
        .content-section { margin-top: 42px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; padding: 0 4px; }
        .section-title { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
        .section-desc { margin: 4px 0 0; font-size: 15px; color: #888; font-weight: 600; }
        .section-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 10px; }
        .image-count { font-size: 13px; font-weight: 800; color: #666; }
        .btn-black, .btn-outline-black { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; padding: 12px 20px; font-size: 14px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .btn-black { background: #111; color: #fff; border: 0; }
        .btn-outline-black { background: transparent; color: #111; border: 2px solid #111; }
        .btn-black:disabled, .btn-outline-black:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin-icon { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-card { border: 2px dashed #ddd; border-radius: 24px; padding: 48px 24px; text-align: center; color: #888; background: #fff; font-weight: 700; }
        .grid-container { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }
        .media-card { overflow: hidden; border: 1px solid #eee; border-radius: 22px; background: #fff; box-shadow: 0 6px 20px rgba(0,0,0,0.04); transition: 0.2s; }
        .media-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: #fee500; }
        .card-topline { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #111; }
        .card-badge { font-size: 11px; font-weight: 900; color: #ddd; letter-spacing: 0.6px; }
        .card-tools { display: flex; gap: 6px; }
        .card-mini-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.12); color: #fff; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .card-mini-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .card-mini-btn.danger { color: #ffb4b4; }
        .media-thumb { aspect-ratio: 3 / 4; background: #f2f3f5; display: flex; align-items: center; justify-content: center; }
        .media-thumb img { width: 100%; height: 100%; object-fit: contain; }
        .media-meta { padding: 14px; display: flex; flex-direction: column; gap: 5px; }
        .media-meta strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
        .media-meta span { font-size: 12px; color: #888; font-weight: 700; }
        .bento-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        .bento { border-radius: 24px; padding: 24px; min-height: 190px; box-shadow: 0 12px 35px rgba(0,0,0,0.06); }
        .bento.bright { background: #fff; border: 1px solid #eee; }
        .keyword-card { background: #111; color: #fff; }
        .editor-card { min-height: 260px; }
        .bento-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.72; }
        .bento-copy { display: inline-flex; align-items: center; gap: 4px; border: 0; border-radius: 999px; background: rgba(0,0,0,0.06); color: rgba(0,0,0,0.72); padding: 7px 11px; font-size: 12px; font-weight: 900; cursor: pointer; }
        .bento-copy.dark { background: rgba(255,255,255,0.12); color: #fff; }
        .bento-copy:disabled { opacity: 0.45; cursor: not-allowed; }
        .bento-input, .bento-textarea { width: 100%; border: 0; outline: none; background: transparent; color: #111; font-weight: 900; letter-spacing: -0.3px; }
        .bento-input { font-size: 26px; line-height: 1.25; }
        .bento-textarea { min-height: 155px; resize: vertical; font-size: 18px; line-height: 1.55; font-weight: 700; }
        .keyword-tags { display: flex; flex-wrap: wrap; gap: 9px; min-height: 50px; }
        .tag { border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.12); color: #fff; padding: 8px 12px; border-radius: 999px; font-size: 13px; font-weight: 800; cursor: pointer; }
        .keyword-empty { color: rgba(255,255,255,0.56); font-size: 13px; font-weight: 700; }
        .keyword-add-row { display: flex; gap: 8px; margin-top: 18px; }
        .kw-input { width: 180px; max-width: 100%; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.06); color: #fff; padding: 10px 12px; border-radius: 12px; outline: none; font-size: 13px; font-weight: 800; }
        .kw-input::placeholder { color: rgba(255,255,255,0.48); }
        .kw-add-btn { border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color: #fff; padding: 10px 12px; border-radius: 12px; font-size: 13px; font-weight: 900; cursor: pointer; }
        .optional-blocks { display: grid; gap: 20px; }
        .optional-card { position: relative; border: 1px solid #eee; border-radius: 24px; background: #fff; padding: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
        .optional-title { margin: 0; font-size: 17px; font-weight: 900; color: #111; }
        .optional-desc { margin: 4px 0 0; font-size: 13px; color: #888; font-weight: 600; }
        .toggle-btn { position: absolute; top: 22px; right: 24px; border: 0; border-radius: 999px; background: #eee; color: #555; padding: 9px 16px; font-weight: 900; cursor: pointer; }
        .toggle-btn.active { background: #111; color: #fff; }
        .optional-editor, .washing-editor { margin-top: 22px; opacity: 0.45; pointer-events: none; transition: 0.2s; }
        .optional-editor:not(.is-disabled), .washing-editor:not(.is-disabled) { opacity: 1; pointer-events: auto; }
        .optional-editor-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
        .optional-editor-title { font-size: 14px; font-weight: 900; color: #333; text-transform: uppercase; }
        .optional-editor-head p { margin: 4px 0 0; color: #888; font-size: 13px; font-weight: 600; }
        .segmented-control { display: flex; flex-wrap: wrap; gap: 4px; background: #f2f3f5; border-radius: 12px; padding: 4px; }
        .segmented-item { border: 0; background: transparent; cursor: pointer; padding: 8px 12px; font-size: 13px; font-weight: 800; color: #777; border-radius: 8px; }
        .segmented-item.active { background: #111; color: #fff; }
        .size-editor-body { display: flex; gap: 22px; align-items: flex-start; }
        .measure-guide { flex: 0 0 240px; border-radius: 18px; background: #fafafa; border: 1px solid #eee; padding: 16px; }
        .measure-guide svg { width: 100%; height: auto; display: block; }
        .optional-size-grid { flex: 1; overflow-x: auto; }
        .optional-size-grid table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .optional-size-grid th { font-size: 13px; font-weight: 800; color: #555; padding: 14px 10px; border-bottom: 2px solid #eee; text-align: center; white-space: nowrap; }
        .optional-size-grid th:first-child { text-align: left; color: #111; }
        .optional-size-grid td { padding: 10px; border-bottom: 1px solid #f5f5f5; text-align: center; }
        .optional-size-grid td input { width: 100%; max-width: 90px; border: 1px solid transparent; background: #f9fafb; border-radius: 10px; padding: 10px; font-size: 14px; text-align: center; }
        .product-info-options { margin-top: 22px; display: grid; gap: 10px; }
        .product-info-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; border-top: 1px solid #f1f1f1; padding-top: 10px; }
        .product-info-row > span { font-size: 13px; font-weight: 900; color: #555; }
        .product-info-row > div { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
        .pi-pill { background: #fff; border: 1px solid #e0e0e0; border-radius: 99px; padding: 8px 18px; font-size: 13px; font-weight: 700; color: #555; cursor: pointer; }
        .pi-pill.active { background: #111; color: #fff; border-color: #111; }
        .optional-tip-input { width: 100%; min-height: 110px; border: 1px solid #eee; background: #f9fafb; border-radius: 12px; padding: 16px; font-size: 14px; resize: vertical; }
        .washing-preview { margin-top: 16px; border-radius: 20px; background: #111; color: #fff; padding: 24px; text-align: center; display: grid; gap: 8px; }
        .washing-preview strong { font-size: 24px; letter-spacing: 0.5px; }
        .washing-preview span { color: #f0c37b; font-weight: 800; }
        @media (max-width: 960px) {
          .hero-wrap { padding: 56px 28px; min-height: 430px; border-radius: 26px; }
          .hero-title { font-size: 38px; }
          .grid-container, .bento-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .section-header, .optional-editor-head, .size-editor-body { flex-direction: column; align-items: stretch; }
          .measure-guide { flex-basis: auto; max-width: 280px; }
          .toggle-btn { position: static; margin-top: 16px; width: fit-content; }
        }
        @media (max-width: 640px) {
          .upload-main { padding: 96px 14px 52px; }
          .hero-wrap { padding: 32px 18px; text-align: center; }
          .hero-content { padding: 22px; }
          .hero-title { font-size: 31px; }
          .hero-desc { font-size: 15px; }
          .hero-actions, .section-actions { flex-direction: column; align-items: stretch; }
          .hero-btn, .btn-black, .btn-outline-black { width: 100%; }
          .grid-container, .bento-grid { grid-template-columns: 1fr; }
          .product-info-row { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
