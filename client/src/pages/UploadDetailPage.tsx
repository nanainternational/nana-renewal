import Navigation from "@/components/Navigation";
import { ArrowDown, ArrowUp, Download, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";

type UploadedDetailImage = {
  id: string;
  name: string;
  previewUrl: string;
  size: number;
};

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

export default function UploadDetailPage() {
  const [detailImages, setDetailImages] = useState<UploadedDetailImage[]>([]);
  const [mergeStatus, setMergeStatus] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
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
          </div>
          {mergeStatus && (
            <p className="mt-4 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              {mergeStatus}
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
      </main>
    </div>
  );
}
