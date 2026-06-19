import Navigation from "@/components/Navigation";

export default function UploadDetailPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 pt-28 pb-16 md:px-8 md:pt-32">
        <section className="rounded-2xl border bg-card p-8 shadow-sm md:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            직접 업로드
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
            국내 도매, 동대문, 거래처, 카카오톡 등에서 받은 상세페이지 이미지를 업로드하는 기능은 다음 단계에서 추가됩니다.
          </p>
        </section>
      </main>
    </div>
  );
}
