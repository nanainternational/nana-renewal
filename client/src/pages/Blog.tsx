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
  postSlug: string;
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
    excerpt: "제품 단가, 배송비, 검수비, 반품 리스크까지 총원가 기준으로 운영하는 실무 가이드입니다.",
    author: "NANA Editorial Team",
    date: "March 15, 2026",
  },
  {
    slug: "1688-vvic-sourcing-checklist",
    title: "1688 · VVIC 소싱 체크리스트",
    subtitle: "실패 없는 셀렉 기준",
    excerpt: "MOQ, 품질 편차, 납기 리스크를 한 번에 점검하는 체크리스트입니다.",
    author: "NANA Editorial Team",
    date: "March 10, 2026",
  },
];

const fromApi = (row: any): BlogComment => ({
  id: String(row?.id || ""),
  postSlug: String(row?.post_slug || ""),
  authorId: String(row?.user_id || ""),
  authorName: String(row?.author_name || "사용자"),
  content: String(row?.content || ""),
  createdAt: String(row?.created_at || new Date().toISOString()),
});

export default function BlogPage() {
  const { user } = useAuth();
  const [isDetail, params] = useRoute<{ slug: string }>("/blog/:slug");
  const currentPost = isDetail ? posts.find((post) => post.slug === params?.slug) : null;

  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    if (!currentPost) return;
    setLoadingComments(true);
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/blog/comments?postSlug=${encodeURIComponent(currentPost.slug)}`, {
          credentials: "include",
        });
        const data = await res.json();
        setComments(Array.isArray(data?.comments) ? data.comments.map(fromApi) : []);
      } catch (error) {
        console.error("failed to fetch comments", error);
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    })();
  }, [currentPost?.slug]);

  const handleSubmitComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !currentPost) return;
    const content = commentInput.trim();
    if (!content) return;

    try {
      const res = await apiRequest("POST", "/api/blog/comments", {
        postSlug: currentPost.slug,
        authorName: user.name || user.email || "사용자",
        content,
      });
      const data = await res.json();
      const created = fromApi(data?.comment);
      setComments((prev) => [created, ...prev]);
      setCommentInput("");
    } catch (error) {
      console.error("failed to create comment", error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await apiRequest("DELETE", `/api/blog/comments/${commentId}`);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (error) {
      console.error("failed to delete comment", error);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    const content = editingText.trim();
    if (!content) return;

    try {
      const res = await apiRequest("PATCH", `/api/blog/comments/${commentId}`, { content });
      const data = await res.json();
      const updated = fromApi(data?.comment);
      setComments((prev) => prev.map((comment) => (comment.id === commentId ? updated : comment)));
      setEditingId(null);
      setEditingText("");
    } catch (error) {
      console.error("failed to update comment", error);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navigation />
      <ScrollToTop />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-8">
        {!currentPost ? (
          <section className="space-y-8">
            <h1 className="text-4xl font-bold">NANA Blog</h1>
            {posts.map((post) => (
              <article key={post.slug} className="border-b pb-6">
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="text-3xl font-semibold">{post.title}</h2>
                  <h3 className="mt-2 text-xl text-slate-500">{post.subtitle}</h3>
                  <p className="mt-3 text-slate-700">{post.excerpt}</p>
                  <p className="mt-3 text-sm text-slate-500">Posted by {post.author} on {post.date}</p>
                </Link>
              </article>
            ))}
          </section>
        ) : (
          <section>
            <Link href="/blog" className="text-sm text-blue-600 hover:underline">
              ← 블로그 목록
            </Link>
            <h1 className="mt-5 text-4xl font-bold">{currentPost.title}</h1>
            <h2 className="mt-2 text-2xl text-slate-500">{currentPost.subtitle}</h2>
            <p className="mt-3 text-sm text-slate-500">Posted by {currentPost.author} on {currentPost.date}</p>

            <section className="mt-14">
              <h3 className="text-2xl font-bold">댓글</h3>
              {user ? (
                <form onSubmit={handleSubmitComment} className="mt-4 space-y-3">
                  <textarea
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
                    className="min-h-[120px] w-full rounded border border-slate-300 px-3 py-2"
                    placeholder="댓글을 입력하세요"
                  />
                  <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                    댓글 달기
                  </button>
                </form>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  댓글 작성은 <Link href="/login" className="text-blue-600 hover:underline">로그인</Link> 후 가능합니다.
                </p>
              )}

              <div className="mt-8 space-y-4">
                {loadingComments ? (
                  <p className="text-sm text-slate-500">댓글 불러오는 중...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-slate-500">아직 댓글이 없습니다.</p>
                ) : (
                  comments.map((comment) => (
                    <article key={comment.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{comment.authorName}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString()}</p>
                          {user?.uid === comment.authorId && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(comment.id);
                                  setEditingText(comment.content);
                                }}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-xs text-red-600 hover:underline"
                              >
                                삭제
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {editingId === comment.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={editingText}
                            onChange={(event) => setEditingText(event.target.value)}
                            className="min-h-[90px] w-full rounded border border-slate-300 px-3 py-2"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(comment.id)}
                              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setEditingText("");
                              }}
                              className="rounded border border-slate-300 px-3 py-1.5 text-xs"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.content}</p>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
