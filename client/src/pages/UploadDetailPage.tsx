import Navigation from "@/components/Navigation";
import { ArrowDown, ArrowUp, Copy, Download, ImagePlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { API_BASE } from "@/lib/queryClient";
import { ChangeEvent, useEffect, useRef, useState } from "react";

type UploadedDetailImage = {
  id: string;
  name: string;
  previewUrl: string;
  size: number;
};

const AI_IMAGE_LIMIT = 3;
const MAX_AI_DATA_URL_LENGTH = Math.floor(1.5 * 1024 * 1024);
const AI_COMPRESSION_STEPS = [
  { maxSize: 1024, quality: 0.76 },
  { maxSize: 800, quality: 0.68 },
  { maxSize: 640, quality: 0.6 },
];

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024)).toLocaleString()}KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)}MB`;
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
  const objectUrlsRef = useRef<string[]>([]);

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

  const handleMergeDetailImages = async () => {
    if (detailImages.length === 0 || isMerging) return;

    setIsMerging(true);
    setMergeStatus(null);

    try {
      const loadedImages = await Promise.all(
        detailImages.map((image) => loadImageForCanvas(image.previewUrl))
      );
      const canvasWidth = Math.max(
        ...loadedImages.map((image) => image.naturalWidth || image.width)
      );

      if (!Number.isFinite(canvasWidth) || canvasWidth <= 0) {
        throw new Error("합칠 이미지 크기를 확인하지 못했습니다.");
      }

      const imageLayouts = loadedImages.map((image) => {
        const imageWidth = image.naturalWidth || image.width;
        const imageHeight = image.naturalHeight || image.height;

        if (imageWidth <= 0 || imageHeight <= 0) {
          throw new Error("합칠 이미지 크기를 확인하지 못했습니다.");
        }

        return {
          image,
          height: Math.round((imageHeight * canvasWidth) / imageWidth),
        };
      });
      const canvasHeight = imageLayouts.reduce(
        (totalHeight, layout) => totalHeight + layout.height,
        0
      );

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("이미지를 합칠 수 없습니다. 브라우저 캔버스를 사용할 수 없습니다.");
      }

      let currentY = 0;
      imageLayouts.forEach(({ image, height }) => {
        context.drawImage(image, 0, currentY, canvasWidth, height);
        currentY += height;
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
            return;
          }

          reject(new Error("합친 이미지를 PNG로 변환하지 못했습니다."));
        }, "image/png");
      });

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "upload-detail-page.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setMergeStatus("상세페이지 이미지 다운로드를 시작했습니다.");
    } catch (error) {
      setMergeStatus(
        error instanceof Error
          ? error.message
          : "이미지 로딩에 실패했습니다. 업로드한 이미지를 확인해주세요."
      );
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 pt-28 pb-16 md:px-8 md:pt-32">
        <section className="rounded-2xl border bg-card p-8 shadow-sm md:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            직접 업로드
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
            국내 도매, 동대문, 거래처, 카카오톡 등에서 받은 상세페이지 이미지를 업로드해주세요.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label
              htmlFor="detail-image-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <ImagePlus className="h-4 w-4" />
              상세 이미지 업로드
            </label>
            <input
              id="detail-image-upload"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handleDetailImageUpload}
            />
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleMergeDetailImages}
              disabled={detailImages.length === 0 || isMerging}
            >
              {isMerging ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isMerging ? "상세페이지 합치는 중..." : "상세페이지 합치기"}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleGenerateAiMarketing}
              disabled={detailImages.length === 0 || aiLoading}
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {aiLoading ? "AI 생성 중..." : "AI 생성"}
            </button>
          </div>
          {(mergeStatus || aiStatus) && (
            <p className="mt-4 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              {aiStatus || mergeStatus}
            </p>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-foreground">상세페이지 이미지 목록</h2>
            <span className="text-sm text-muted-foreground">
              {detailImages.length.toLocaleString()}장 업로드됨
            </span>
          </div>

          {detailImages.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              아직 업로드된 상세페이지 이미지가 없습니다.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {detailImages.map((image, index) => (
                <article
                  key={image.id}
                  className="overflow-hidden rounded-2xl border bg-card shadow-sm"
                >
                  <div className="aspect-[3/4] bg-muted">
                    <img
                      src={image.previewUrl}
                      alt={`업로드된 상세 이미지 ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="space-y-1 p-4">
                    <div className="text-sm font-semibold text-foreground">
                      상세 이미지 {index + 1}
                    </div>
                    <p className="truncate text-xs text-muted-foreground" title={image.name}>
                      {image.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(image.size)}
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-3">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-1 rounded-md border px-2 py-2 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => handleMoveDetailImage(index, "up")}
                        disabled={index === 0}
                        aria-label={`상세 이미지 ${index + 1} 위로 이동`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                        위로
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-1 rounded-md border px-2 py-2 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => handleMoveDetailImage(index, "down")}
                        disabled={index === detailImages.length - 1}
                        aria-label={`상세 이미지 ${index + 1} 아래로 이동`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                        아래로
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-1 rounded-md border border-destructive/40 px-2 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                        onClick={() => handleDeleteDetailImage(image.id)}
                        aria-label={`상세 이미지 ${index + 1} 삭제`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border bg-card p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">AI 마케팅</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                현재 상세 이미지 순서 기준 앞 3장을 분석해 상품명과 마케팅 문구를 생성합니다.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              분석 대상: 최대 {AI_IMAGE_LIMIT}장
            </span>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="ai-product-name" className="text-sm font-semibold">
                  상품명
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                  onClick={() => copyText(aiProductName, "상품명을 복사했습니다.")}
                  disabled={!aiProductName}
                >
                  <Copy className="h-3.5 w-3.5" />
                  복사
                </button>
              </div>
              <input
                id="ai-product-name"
                value={aiProductName}
                onChange={(event) => setAiProductName(event.target.value)}
                placeholder="AI 생성 후 상품명이 표시됩니다."
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="ai-editor" className="text-sm font-semibold">
                  에디터 문구
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                  onClick={() => copyText(aiEditor, "에디터 문구를 복사했습니다.")}
                  disabled={!aiEditor}
                >
                  <Copy className="h-3.5 w-3.5" />
                  복사
                </button>
              </div>
              <textarea
                id="ai-editor"
                value={aiEditor}
                onChange={(event) => setAiEditor(event.target.value)}
                placeholder="AI 생성 후 에디터 문구가 표시됩니다."
                rows={5}
                className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border bg-background p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">쿠팡 키워드</h3>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                    onClick={() =>
                      copyText(aiCoupangKeywords.join(", "), "쿠팡 키워드를 복사했습니다.")
                    }
                    disabled={aiCoupangKeywords.length === 0}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    전체 복사
                  </button>
                </div>
                {aiCoupangKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {aiCoupangKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">아직 생성된 키워드가 없습니다.</p>
                )}
              </div>

              <div className="rounded-xl border bg-background p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">에이블리 키워드</h3>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                    onClick={() =>
                      copyText(aiAblyKeywords.join(", "), "에이블리 키워드를 복사했습니다.")
                    }
                    disabled={aiAblyKeywords.length === 0}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    전체 복사
                  </button>
                </div>
                {aiAblyKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {aiAblyKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">아직 생성된 키워드가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
