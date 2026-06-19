import Navigation from "@/components/Navigation";
import { ImagePlus } from "lucide-react";
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

export default function UploadDetailPage() {
  const [detailImages, setDetailImages] = useState<UploadedDetailImage[]>([]);
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
    event.target.value = "";
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

          <div className="mt-8">
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
          </div>
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
