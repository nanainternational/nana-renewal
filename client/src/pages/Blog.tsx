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
    slug: "china-purchase-cost-guide-2026",
    title: "2026 중국사입 원가 구조 가이드",
    subtitle: "마진을 남기는 사입 계산법",
    excerpt: "제품 단가만 보면 손해를 보기 쉽습니다. 총원가 기준으로 계산하는 실무 방식을 정리했습니다.",
    author: "NANA Editorial Team",
    date: "March 15, 2026",
  },
  {
    slug: "1688-vvic-sourcing-checklist",
    title: "1688 · VVIC 소싱 체크리스트",
    subtitle: "실패 없는 셀렉 기준",
    excerpt: "MOQ, 품질 편차, 납기 리스크까지 실무자가 체크해야 할 기준을 정리했습니다.",
    author: "NANA Editorial Team",
    date: "March 10, 2026",
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
    <div className="min-h-screen bg-white text-[#404040]" style={{ fontFamily: "'Lora', 'Noto Sans KR', serif" }}>
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
