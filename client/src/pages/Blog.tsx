import { Link, useRoute } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

type BlogPost = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  readingTime: string;
  coverImage: string;
  content: string[];
};

const blogPosts: BlogPost[] = [
  {
    slug: "china-purchase-cost-guide-2026",
    title: "2026 중국사입 원가 구조 가이드: 마진을 남기는 계산법",
    summary:
      "제품 단가 외에 꼭 반영해야 할 국제배송비, 통관, 검수, 패키징까지 한 번에 정리합니다.",
    category: "중국사입",
    date: "2026-03-15",
    readingTime: "6 min read",
    coverImage:
      "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1600&q=80",
    content: [
      "중국사입의 핵심은 제품 단가가 아니라 총원가(Total Landed Cost)를 정확히 계산하는 데 있습니다.",
      "나나인터내셔널은 사입 단계에서 발생하는 운임, 검수, 포장, 부가 작업비를 분리해 관리하도록 권장합니다.",
      "SKU별 최소 수량과 회전율 데이터를 함께 보면 무리한 발주를 줄이고, 재고 리스크를 크게 낮출 수 있습니다.",
    ],
  },
  {
    slug: "1688-vvic-sourcing-checklist",
    title: "1688 · VVIC 소싱 체크리스트: 실패 없는 셀렉 기준",
    summary:
      "상세페이지 품질, MOQ, 색상 편차, 공급 안정성까지 실무에서 쓰는 체크 항목을 공유합니다.",
    category: "1688/VVIC",
    date: "2026-03-10",
    readingTime: "5 min read",
    coverImage:
      "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?auto=format&fit=crop&w=1600&q=80",
    content: [
      "1688과 VVIC는 품목 특성과 공급 형태가 다르기 때문에, 같은 기준으로 소싱하면 손실이 발생할 수 있습니다.",
      "샘플 검수 단계에서 원단/마감/실측 오차를 기록해두면 대량 발주 시 클레임을 줄일 수 있습니다.",
      "특히 시즌성 상품은 리드타임과 재입고 가능성을 동시에 확인해야 판매 공백을 피할 수 있습니다.",
    ],
  },
  {
    slug: "detail-page-conversion-playbook",
    title: "AI 상세페이지 전환율 개선 플레이북",
    summary:
      "첫 화면 구성부터 사이즈/소재/세탁 정보 배치까지 구매전환을 높이는 구조를 소개합니다.",
    category: "상세페이지 제작",
    date: "2026-03-01",
    readingTime: "7 min read",
    coverImage:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
    content: [
      "상세페이지는 디자인보다 정보 전달 순서가 더 중요합니다.",
      "나나인터내셔널의 AI 상세페이지 툴은 핵심 USP, 사이즈 정보, 구매 유도 요소를 빠르게 정렬하도록 설계되어 있습니다.",
      "카테고리 특성에 맞춘 템플릿을 적용하면 제작 시간을 줄이면서도 브랜드 톤을 유지할 수 있습니다.",
    ],
  },
];

const blogCategories = ["전체", "중국사입", "1688/VVIC", "상세페이지 제작", "물류/3PL", "창업 팁"];

export default function BlogPage() {
  const [isDetail, params] = useRoute<{ slug: string }>("/blog/:slug");
  const currentPost = isDetail ? blogPosts.find((post) => post.slug === params?.slug) : null;

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#1f2d3d]" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Navigation />
      <ScrollToTop />

      <main className="pt-24 md:pt-28">
        <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-8">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#0f4c81] to-[#4b79a1] p-8 text-white shadow-lg md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">NANA INTERNATIONAL BLOG</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-5xl">
              중국사입부터 상세페이지까지,
              <br className="hidden md:block" />
              나나 실무 인사이트 아카이브
            </h1>
            <p className="mt-4 max-w-3xl text-sm text-blue-50 md:text-base">
              Huxpro 스타일을 기반으로 구성한 나나인터내셔널 블로그입니다. 실무자가 바로 적용할 수 있는 가이드와 체크리스트를
              정리합니다.
            </p>
          </div>
        </section>

        {currentPost ? (
          <section className="mx-auto w-full max-w-3xl px-4 pb-20 sm:px-8">
            <div className="mb-8">
              <Link href="/blog" className="text-sm font-semibold text-[#0f4c81] hover:underline">
                ← 블로그 목록으로
              </Link>
            </div>
            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
              <img src={currentPost.coverImage} alt={currentPost.title} className="h-64 w-full object-cover md:h-80" />
              <div className="p-6 md:p-10">
                <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{currentPost.category}</span>
                  <span>{currentPost.date}</span>
                  <span>·</span>
                  <span>{currentPost.readingTime}</span>
                </div>
                <h2 className="text-3xl font-extrabold leading-tight text-slate-900">{currentPost.title}</h2>
                <p className="mt-4 text-lg leading-relaxed text-slate-600">{currentPost.summary}</p>

                <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
                  {currentPost.content.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </article>
          </section>
        ) : (
          <>
            <section className="mx-auto w-full max-w-6xl px-4 sm:px-8">
              <div className="mb-10 flex flex-wrap gap-3">
                {blogCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-[#0f4c81] hover:text-[#0f4c81]"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </section>

            <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 pb-20 sm:px-8 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post) => (
                <article
                  key={post.slug}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <img src={post.coverImage} alt={post.title} className="h-48 w-full object-cover" />
                  <div className="p-5">
                    <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{post.category}</span>
                      <span>{post.date}</span>
                    </div>
                    <h3 className="text-xl font-bold leading-snug text-slate-900">{post.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{post.summary}</p>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="mt-5 inline-block text-sm font-semibold text-[#0f4c81] hover:underline"
                    >
                      Read More →
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
