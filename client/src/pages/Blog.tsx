import { FormEvent, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE, apiRequest } from "@/lib/queryClient";

type BlogPost = {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  author: string;
  date: string;
  body: string[];
  links?: { label: string; href: string; external?: boolean }[];
};

type BlogComment = {
  id: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

const posts: BlogPost[] = [
  {
    slug: "vvic-guide-extension-usage-2026",
    title: "VVIC 가이드 버튼 사용법 (처음부터 3분 완성)",
    subtitle: "nanainter 확장프로그램 페이지에서 바로 따라하는 실전 튜토리얼",
    excerpt: "확장프로그램 설치부터 VVIC 가이드 진입, 실사용 체크포인트까지 한 번에 정리했습니다.",
    author: "NANA Editorial Team",
    date: "April 3, 2026",
    body: [
      "안녕하세요, NANA 팀입니다. https://nanainter.com/extension 페이지의 'VVIC 가이드' 버튼을 처음 사용하시는 분들을 위해 가장 빠른 사용 순서를 정리했습니다.",
      "1) 먼저 확장프로그램 페이지에서 '확장프로그램 다운로드'를 눌러 ZIP 파일을 내려받고, 크롬 확장프로그램 관리(chrome://extensions)에서 개발자 모드를 켠 뒤 '압축해제된 확장프로그램 로드'로 설치합니다.",
      "2) 다시 확장프로그램 페이지로 돌아와 'VVIC 가이드' 버튼을 클릭하면, VVIC 상세페이지 자동화 가이드 화면으로 이동합니다. 여기서 상품 링크 입력 → 데이터 불러오기 → 상세페이지 편집 흐름으로 이어집니다.",
      "3) 가이드 화면에서는 대표 이미지/상세 이미지 정리, 옵션/사이즈 정보 점검, 상품명/키워드 보정 같은 실무 단계들을 순서대로 진행하면 됩니다.",
      "4) 마지막으로 중국사입 페이지와 연결해 가져오기까지 완료하면, 수작업 대비 상세페이지 제작 시간을 크게 줄일 수 있습니다.",
      "TIP: 처음에는 샘플 상품 1개로 전체 플로우를 테스트한 뒤, 팀 공용 템플릿(문구/사이즈표/세탁 안내)을 고정하면 운영 속도가 훨씬 빨라집니다.",
    ],
    links: [
      { label: "확장프로그램 페이지 바로가기", href: "https://nanainter.com/extension", external: true },
      { label: "VVIC 가이드 열기", href: "/ai-detail/vvic" },
    ],
  },
  {
    slug: "china-purchase-cost-guide-2026",
    title: "☔ [이커머스 실전] 장마철 '시즌성 아이템' 마진율 분석! 우산 하나 팔면 진짜 얼마 남을까?",
    subtitle: "feat. 쿠팡 소싱 & 수익 구조 최적화",
    excerpt: "제품 단가만 보면 손해를 보기 쉽습니다. 총원가 기준으로 계산하는 실무 방식을 정리했습니다.",
    author: "NANA Editorial Team",
    date: "March 15, 2026",
    body: [
      "☔ [이커머스 실전] 장마철 '시즌성 아이템' 마진율 분석! 우산 하나 팔면 진짜 얼마 남을까? (feat. 쿠팡 소싱 & 수익 구조 최적화)",
      "안녕하세요! 이커머스 셀러 여러분. 오늘은 특정 시기에 폭발적인 수요를 일으키는 시즌성(Seasonality) 아이템의 소싱과 마진 분석에 대해 이야기해 보려고 합니다.",
      "곧 다가올 장마철을 대비해 많은 분들이 우산, 장화 등의 아이템을 눈여겨보고 계실 텐데요. 오늘은 '나나인터내셔널 MJ' 채널의 영상을 바탕으로, 쿠팡에서 잘 팔리는 우산을 중국에서 사입해 팔았을 때 실제 순이익률(Net Margin)이 얼마나 되는지 데이터를 기반으로 분석합니다.",
      "🔗 참고 영상: “우산 하나로 5천원? 곧 장마인데 진짜 마진 계산해봤습니다”",
      "1) 프라이싱(Pricing) 전략과 사입가 비교: 쿠팡 상위권 3단 자동 우산 판매가 9,900원(무료배송), 알리바바 사입가 약 8.5위안(한화 약 1,870원). 9,900원은 심리적 저항선을 깨는 대표적인 단수 가격 책정 전략입니다.",
      "핵심은 매출이 아니라 순수익입니다. 매출원가(COGS)만 보면 갭이 커 보이지만, 물류비/수수료/관부가세를 합친 뒤의 실질 이익을 봐야 합니다.",
      "2) 크로스보더 물류 최적화: 우산 1개 규격(6cm x 6cm x 32cm) 기준 해운 운송비는 약 86~98원. 부피가 작고 접을 수 있는 상품일수록 물류비가 낮아져 마진 방어가 유리합니다.",
      "3) 수익 구조(Profit Structure) 분석: 실질 판매가(객단가) 7,900원(9,900원 - 국내배송비 2,000원 가정), 지출 항목은 제품 원가 + 중국 사입 수수료 + 물류비 + 관부가세(약 8~10%) + 쿠팡 판매 수수료(약 12%).",
      "💰 예상 순이익(Net Profit): 5,416원 / 📈 순이익률(Net Margin): 약 67.6%. 우산 1개 판매로 5,400원 이상이 남는 구조이며, 광고비 집행(CPC/ROAS) 시에도 버틸 수 있는 공헌이익을 확보할 수 있습니다.",
      "4) 마케팅 인사이트: (a) 시장 조사 기반 의사결정, (b) 소싱 전 마진 시뮬레이션으로 ROI 검증, (c) 제품 수명 주기(PLC)와 타이밍 선점. 시즌성 상품은 수요 폭발 전 재고와 상세페이지 SEO를 미리 완료해야 기회비용을 줄일 수 있습니다.",
      "마무리: 비즈니스의 본질은 마진입니다. 감이 아닌 숫자로 판단하고, 승산 있는 상품에만 집중하면 안정적인 수익 파이프라인을 만들 수 있습니다. 다가오는 장마철, 데이터 기반 전략으로 대박 매출 만드시길 응원합니다! 🌧️💸",
    ],
  },
  {
    slug: "1688-vvic-sourcing-checklist",
    title: "1688 · VVIC 소싱 체크리스트",
    subtitle: "실패 없는 셀렉 기준",
    excerpt: "MOQ, 품질 편차, 납기 리스크까지 실무자가 체크해야 할 기준을 정리했습니다.",
    author: "NANA Editorial Team",
    date: "March 10, 2026",
    body: [
      "소싱 전 체크리스트를 기반으로 MOQ, 리드타임, 원단/마감 품질을 검증하세요.",
      "샘플 단계에서 불량률/색상 편차를 기록하면 대량 발주 리스크를 크게 줄일 수 있습니다.",
    ],
  },
];

const parseComment = (row: any): BlogComment => ({
  id: String(row?.id || ""),
  parentId: row?.parent_id ? String(row.parent_id) : null,
  authorId: String(row?.user_id || ""),
  authorName: String(row?.author_name || "사용자"),
  content: String(row?.content || ""),
  createdAt: String(row?.created_at || new Date().toISOString()),
});

export default function BlogPage() {
  const { user } = useAuth();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isDetail, params] = useRoute<{ slug: string }>("/blog/:slug");
  const currentPost = isDetail ? posts.find((post) => post.slug === params?.slug) : null;

  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingInput, setEditingInput] = useState("");
  const [visitTotal, setVisitTotal] = useState(0);
  const [visitToday, setVisitToday] = useState(0);

  useEffect(() => {
    if (!user) {
      setCurrentUserId("");
      return;
    }
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
        const data = await response.json();
        setCurrentUserId(String(data?.user_id || ""));
      } catch {
        setCurrentUserId("");
      }
    })();
  }, [user]);

  useEffect(() => {
    const pageSlug = currentPost?.slug || "blog";
    const visitorKey = localStorage.getItem("nana_blog_visitor_key") || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("nana_blog_visitor_key", visitorKey);

    void (async () => {
      try {
        await apiRequest("POST", "/api/blog/visits", { pageSlug, visitorKey });
      } catch (error) {
        console.error("blog visit track failed", error);
      }
    })();

    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/blog/visits/summary?days=7`, { credentials: "include" });
        const data = await response.json();
        setVisitTotal(Number(data?.total || 0));
        setVisitToday(Number(data?.today || 0));
      } catch (error) {
        console.error("blog visit summary failed", error);
      }
    })();
  }, [currentPost?.slug]);

  useEffect(() => {
    if (!currentPost) return;
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/blog/comments?postSlug=${encodeURIComponent(currentPost.slug)}`, {
          credentials: "include",
        });
        const data = await response.json();
        setComments(Array.isArray(data?.comments) ? data.comments.map(parseComment) : []);
      } catch (error) {
        console.error("blog comment fetch failed", error);
      }
    })();
  }, [currentPost?.slug]);

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !currentPost) return;
    const content = commentInput.trim();
    if (!content) return;

    const response = await apiRequest("POST", "/api/blog/comments", {
      postSlug: currentPost.slug,
      authorName: user.name || user.email || "사용자",
      content,
    });

    const data = await response.json();
    setComments((prev) => [parseComment(data?.comment), ...prev]);
    setCommentInput("");
  };

  const submitReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !currentPost || !replyTargetId) return;
    const content = replyInput.trim();
    if (!content) return;

    const response = await apiRequest("POST", "/api/blog/comments", {
      postSlug: currentPost.slug,
      parentId: replyTargetId,
      authorName: user.name || user.email || "사용자",
      content,
    });

    const data = await response.json();
    setComments((prev) => [parseComment(data?.comment), ...prev]);
    setReplyTargetId(null);
    setReplyInput("");
  };

  const saveEdit = async (commentId: string) => {
    const content = editingInput.trim();
    if (!content) return;
    const response = await apiRequest("PATCH", `/api/blog/comments/${commentId}`, { content });
    const data = await response.json();
    const updated = parseComment(data?.comment);
    setComments((prev) => prev.map((item) => (item.id === commentId ? updated : item)));
    setEditingId(null);
    setEditingInput("");
  };

  const removeComment = async (commentId: string) => {
    await apiRequest("DELETE", `/api/blog/comments/${commentId}`);
    setComments((prev) => prev.filter((item) => item.id !== commentId && item.parentId !== commentId));
  };

  const topLevelComments = comments.filter((comment) => !comment.parentId);
  const childComments = (parentId: string) =>
    comments
      .filter((comment) => comment.parentId === parentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const isOwner = (comment: BlogComment) => {
    if (currentUserId && currentUserId === comment.authorId) return true;
    const userName = String(user?.name || "").trim();
    const userEmail = String(user?.email || "").trim();
    const authorName = String(comment.authorName || "").trim();
    return Boolean(authorName && (authorName === userName || authorName === userEmail));
  };

  return (
    <div className="min-h-screen bg-white text-[#404040]" style={{ fontFamily: "'ChosunIlboMyungjo', 'Noto Sans KR', serif" }}>
      <Navigation />
      <ScrollToTop />

      <main className="pt-24 md:pt-28">
        <section className="relative mb-10 h-[360px] overflow-hidden md:h-[460px]">
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
          <div className="absolute left-6 top-6 text-white md:left-10 md:top-10">
            <p className="text-lg font-semibold tracking-tight md:text-xl">
              오늘 {visitToday.toLocaleString()} · 전체 {visitTotal.toLocaleString()}
            </p>
          </div>
        </section>

        {!currentPost ? (
          <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              {posts.map((post) => (
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
                <div className="flex flex-wrap gap-2 text-xs text-[#666]">
                  {['중국사입','1688','VVIC','상세페이지','3PL','창업'].map((tag) => (
                    <span key={tag} className="rounded border border-[#ddd] px-2.5 py-1">{tag}</span>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        ) : (
          <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <article>
              <Link href="/blog" className="text-sm text-[#337ab7] hover:underline">← Home</Link>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-[#222] md:text-5xl">{currentPost.title}</h2>
              <h3 className="mt-3 text-xl font-semibold text-[#777] md:text-2xl">{currentPost.subtitle}</h3>
              <p className="mt-5 text-sm text-[#777]">Posted by {currentPost.author} on {currentPost.date}</p>

              <div className="mt-8 space-y-4 text-[17px] leading-8 text-[#404040]">
                {currentPost.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {currentPost.links?.length ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  {currentPost.links.map((link) => (
                    <a
                      key={`${link.label}-${link.href}`}
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="rounded-full border border-[#337ab7] px-4 py-2 text-sm font-semibold text-[#337ab7] hover:bg-[#f1f7ff]"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}

              <section className="mt-12">
                <h4 className="text-xl font-bold text-[#222]">댓글</h4>
                {user ? (
                  <form onSubmit={submitComment} className="mt-4 space-y-3">
                    <textarea
                      value={commentInput}
                      onChange={(event) => setCommentInput(event.target.value)}
                      placeholder="댓글을 입력하세요"
                      className="min-h-[120px] w-full rounded border border-[#ddd] px-3 py-2 text-sm"
                    />
                    <button type="submit" className="rounded bg-[#337ab7] px-4 py-2 text-sm font-semibold text-white">댓글 달기</button>
                  </form>
                ) : (
                  <p className="mt-4 text-sm text-[#666]">댓글을 작성하려면 <Link href="/login" className="text-[#337ab7]">로그인</Link>이 필요합니다.</p>
                )}

                <div className="mt-8 space-y-4">
                  {topLevelComments.length === 0 ? (
                    <p className="text-sm text-[#777]">아직 댓글이 없습니다.</p>
                  ) : (
                    topLevelComments.map((comment) => (
                      <article key={comment.id} className="rounded border border-[#e8e8e8] bg-[#fafafa] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#222]">{comment.authorName}</p>
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-[#888]">{new Date(comment.createdAt).toLocaleString()}</p>
                            {isOwner(comment) && (
                              <>
                                <button type="button" onClick={() => { setEditingId(comment.id); setEditingInput(comment.content); }} className="text-xs text-[#337ab7]">수정</button>
                                <button type="button" onClick={() => removeComment(comment.id)} className="text-xs text-[#b73333]">삭제</button>
                              </>
                            )}
                            {user && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyTargetId(comment.id);
                                  setReplyInput("");
                                }}
                                className="text-xs text-[#337ab7]"
                              >
                                답장
                              </button>
                            )}
                          </div>
                        </div>
                        {editingId === comment.id ? (
                          <div className="mt-3 space-y-2">
                            <textarea value={editingInput} onChange={(event) => setEditingInput(event.target.value)} className="min-h-[90px] w-full rounded border border-[#ddd] px-3 py-2 text-sm" />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => saveEdit(comment.id)} className="rounded bg-[#337ab7] px-3 py-1.5 text-xs text-white">저장</button>
                              <button type="button" onClick={() => { setEditingId(null); setEditingInput(""); }} className="rounded border border-[#ccc] px-3 py-1.5 text-xs">취소</button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#555]">{comment.content}</p>
                        )}

                        {replyTargetId === comment.id && user && (
                          <form onSubmit={submitReply} className="mt-3 space-y-2 border-l-2 border-[#d7e4f5] pl-3">
                            <textarea
                              value={replyInput}
                              onChange={(event) => setReplyInput(event.target.value)}
                              placeholder="답장을 입력하세요"
                              className="min-h-[80px] w-full rounded border border-[#ddd] px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                              <button type="submit" className="rounded bg-[#337ab7] px-3 py-1.5 text-xs text-white">답장 등록</button>
                              <button type="button" onClick={() => { setReplyTargetId(null); setReplyInput(""); }} className="rounded border border-[#ccc] px-3 py-1.5 text-xs">취소</button>
                            </div>
                          </form>
                        )}

                        {childComments(comment.id).length > 0 && (
                          <div className="mt-4 space-y-3 border-l-2 border-[#e5e7eb] pl-4">
                            {childComments(comment.id).map((reply) => (
                              <article key={reply.id} className="rounded border border-[#ececec] bg-white p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-[#222]">{reply.authorName}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[11px] text-[#888]">{new Date(reply.createdAt).toLocaleString()}</p>
                                    {isOwner(reply) && (
                                      <>
                                        <button type="button" onClick={() => { setEditingId(reply.id); setEditingInput(reply.content); }} className="text-[11px] text-[#337ab7]">수정</button>
                                        <button type="button" onClick={() => removeComment(reply.id)} className="text-[11px] text-[#b73333]">삭제</button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {editingId === reply.id ? (
                                  <div className="mt-2 space-y-2">
                                    <textarea value={editingInput} onChange={(event) => setEditingInput(event.target.value)} className="min-h-[70px] w-full rounded border border-[#ddd] px-3 py-2 text-xs" />
                                    <div className="flex gap-2">
                                      <button type="button" onClick={() => saveEdit(reply.id)} className="rounded bg-[#337ab7] px-2.5 py-1 text-[11px] text-white">저장</button>
                                      <button type="button" onClick={() => { setEditingId(null); setEditingInput(""); }} className="rounded border border-[#ccc] px-2.5 py-1 text-[11px]">취소</button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#555]">{reply.content}</p>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </section>
            </article>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
