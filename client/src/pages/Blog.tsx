import { Link, useRoute } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

type BlogPost = {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  author: string;
  date: string;
  tags: string[];
};

const blogPosts: BlogPost[] = [
  {
    slug: "china-purchase-cost-guide-2026",
    title: "2026 중국사입 원가 구조 가이드",
    subtitle: "마진을 남기는 사입 계산법",
    excerpt:
      "제품 단가만 보면 항상 손해를 봅니다. 국제배송비, 통관, 검수, 부자재, 반품 리스크까지 포함한 총원가 기준으로 사입을 설계해야 실제 이익률이 보입니다.",
    author: "NANA Editorial Team",
    date: "March 15, 2026",
    tags: ["중국사입", "원가관리", "창업"],
  },
  {
    slug: "1688-vvic-sourcing-checklist",
    title: "1688 · VVIC 소싱 체크리스트",
    subtitle: "실패 없는 셀렉 기준",
    excerpt:
      "MOQ, 납기, 색상 편차, 원단 품질, 재입고 안정성 등 실무에서 바로 쓰는 체크포인트를 정리했습니다. 사입 초보도 검수 기준을 동일하게 맞출 수 있습니다.",
    author: "NANA Editorial Team",
    date: "March 10, 2026",
    tags: ["1688", "VVIC", "소싱"],
  },
  {
    slug: "detail-page-conversion-playbook",
    title: "AI 상세페이지 전환율 개선 플레이북",
    subtitle: "정보 배치만 바꿔도 구매율이 오른다",
    excerpt:
      "첫 화면 카피, 사이즈 표, 소재 설명, 세탁 가이드, CTA 위치까지. 실제 구매 전환에 영향을 주는 상세페이지 구성 순서를 나나 방식으로 소개합니다.",
    author: "NANA Editorial Team",
    date: "March 1, 2026",
    tags: ["상세페이지", "전환율", "AI"],
  },
  {
    slug: "logistics-3pl-onboarding-guide",
    title: "3PL 시작 전 반드시 확인할 7가지",
    subtitle: "입고부터 출고까지 운영 리스크 줄이기",
    excerpt:
      "보관비와 출고비만 비교하면 운영 사고가 납니다. SKU 규칙, 바코드 정책, CS 연결, 반품 동선까지 3PL 온보딩 전에 체크해야 할 기준을 정리했습니다.",
    author: "NANA Editorial Team",
    date: "February 24, 2026",
    tags: ["3PL", "물류", "운영"],
  },
];

const featuredTags = ["중국사입", "1688", "VVIC", "상세페이지", "3PL", "창업", "브랜딩", "운영" ];

export default function BlogPage() {
  const [isDetail, params] = useRoute<{ slug: string }>("/blog/:slug");
  const currentPost = isDetail ? blogPosts.find((post) => post.slug === params?.slug) : null;

  return (
    <div className="min-h-screen bg-white text-[#404040]" style={{ fontFamily: "'Lora', 'Noto Sans KR', serif" }}>
      <Navigation />
      <ScrollToTop />

      <main className="pt-24 md:pt-28">
        <section className="relative mb-10 h-[320px] overflow-hidden md:h-[420px]">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80"
            alt="Nana blog hero"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">NANA Blog</h1>
            <p className="mt-4 text-base italic md:text-xl">"실무를 바꾸는 중국사입 인사이트"</p>
          </div>
        </section>

        {currentPost ? (
          <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <article>
              <Link href="/blog" className="text-sm text-[#337ab7] hover:underline">
                ← Home
              </Link>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-[#222] md:text-5xl">{currentPost.title}</h2>
              <h3 className="mt-3 text-xl font-semibold text-[#777] md:text-2xl">{currentPost.subtitle}</h3>
              <p className="mt-5 text-sm text-[#777]">Posted by {currentPost.author} on {currentPost.date}</p>

              <div className="mt-10 space-y-6 text-[17px] leading-8 text-[#404040]">
                <p>{currentPost.excerpt}</p>
                <p>
                  나나인터내셔널은 중국사입, 상세페이지 자동화, 물류 운영까지 실제 커머스 업무 흐름 기준으로 가이드를 작성합니다.
                  이 글은 현업에서 바로 적용 가능한 체크리스트 중심으로 업데이트됩니다.
                </p>
                <p>
                  더 자세한 실무 상담이 필요하면 상단 메뉴의 중국사입/3PL 페이지를 통해 문의해 주세요. 운영 상황에 맞는 견적과
                  프로세스를 함께 제안드립니다.
                </p>
              </div>

              <div className="mt-10 border-t border-b border-[#eee] py-6">
                <p className="text-sm text-[#777]">Tagged: {currentPost.tags.join(" · ")}</p>
              </div>
            </article>

            <aside className="space-y-10 border-t border-[#eee] pt-8 lg:border-t-0 lg:pt-0">
              <section>
                <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[#555]">Featured Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {featuredTags.map((tag) => (
                    <span key={tag} className="rounded border border-[#ddd] px-2.5 py-1 text-xs text-[#666]">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[#555]">About Me</h4>
                <p className="text-sm leading-7 text-[#666]">
                  나나인터내셔널은 중국 도매 소싱부터 상세페이지 제작, 물류 운영까지 이커머스 밸류체인을 연결하는 파트너입니다.
                </p>
              </section>
            </aside>
          </section>
        ) : (
          <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              {blogPosts.map((post) => (
                <article key={post.slug} className="pb-10">
                  <Link href={`/blog/${post.slug}`} className="block">
                    <h2 className="text-3xl font-bold leading-tight text-[#222] md:text-4xl">{post.title}</h2>
                    <h3 className="mt-2 text-xl font-semibold text-[#777] md:text-2xl">{post.subtitle}</h3>
                    <p className="mt-4 text-[17px] leading-8 text-[#404040]">{post.excerpt}</p>
                  </Link>
                  <p className="mt-5 text-sm text-[#777]">Posted by {post.author} on {post.date}</p>
                  <hr className="mt-8 border-[#eee]" />
                </article>
              ))}
            </div>

            <aside className="space-y-10 border-t border-[#eee] pt-8 lg:border-t-0 lg:pt-0">
              <section>
                <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[#555]">Featured Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {featuredTags.map((tag) => (
                    <span key={tag} className="rounded border border-[#ddd] px-2.5 py-1 text-xs text-[#666]">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[#555]">About Me</h4>
                <p className="text-sm leading-7 text-[#666]">
                  "좋은 소싱은 좋은 데이터에서 시작된다"는 원칙으로, 실무에 바로 적용할 수 있는 글을 발행합니다.
                </p>
              </section>
            </aside>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
