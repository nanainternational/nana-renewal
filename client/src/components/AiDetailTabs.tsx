type AiDetailTab = "vvic" | "1688" | "upload";

export default function AiDetailTabs({ active }: { active: AiDetailTab }) {
  const tabs: Array<{ key: AiDetailTab; label: string; href: string }> = [
    { key: "vvic", label: "VVIC", href: "/ai-detail/vvic" },
    { key: "1688", label: "1688", href: "/ai-detail/1688" },
    { key: "upload", label: "직접 업로드", href: "/ai-detail/upload" },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="상세페이지 이미지 소스 선택">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`rounded-full border px-4 py-2 text-sm font-extrabold transition ${
            active === tab.key
              ? "border-black bg-black text-white shadow-lg"
              : "border-black/10 bg-white/75 text-[#333] hover:bg-white hover:text-black"
          }`}
          onClick={() => {
            window.location.href = tab.href;
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
