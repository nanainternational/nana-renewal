import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";

type CartItemPayload = {
  id?: number;
  url?: string;
  productName?: string;
  mainImage?: string;
  price?: number | string;
  currency?: string;
  optionRaw?: string;
  quantity?: number;
  // ✅ 1688 주문목록(라인아이템) 그대로 보존
  orderLines?: any[];
  domain?: string;
  serverId?: string | null;
};

type CartRow = {
  id: string;
  item: CartItemPayload;
  created_at: string;
};

function clampQty(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// 1688(alicdn) 이미지 핫링크 차단(403) 대응: 1688 페이지와 동일하게 프록시 사용
const API_BASE =
  (import.meta as any)?.env?.VITEITE_API_BASE ||
  (import.meta as any)?.env?.VITE_API_BASE ||
  "";

function apiUrl(p: string) {
  const base = String(API_BASE || "")
    .trim()
    .replace(/\/$/, "");
  if (!base) return p;
  return base + (p.startsWith("/") ? p : "/" + p);
}

function normalizeImageUrl(u: string) {
  const s = String(u || "").trim();
  if (!s) return s;
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;
  if (s.startsWith("//")) return "https:" + s;
  return s;
}

function proxyImageUrl(u: string) {
  const s = normalizeImageUrl(u);
  if (!s) return s;
  if (!/^https?:\/\//i.test(s)) return s;
  return apiUrl(`/api/1688/proxy/image?url=${encodeURIComponent(s)}`);
}

// ✅ 1688 주문목록 텍스트를 다시 만들어서 서버(단일 item 저장 구조)와 동기화
function buildOrderLinesText(lines: any[]) {
  if (!Array.isArray(lines) || !lines.length) return "";
  return lines
    .map((l, i) => {
      const sku = l?.sku && typeof l.sku === "object" ? l.sku : null;
      const opt = sku ? Object.values(sku).filter(Boolean).join(" / ") : String(l?.text || "").trim();
      const q = Math.max(1, Number(l?.qty || l?.quantity) || 1);
      return `${i + 1}) ${opt || "옵션없음"} / 수량: ${q}`;
    })
    .join("\n");
}

function sumLinesQty(lines: any[]) {
  if (!Array.isArray(lines) || !lines.length) return 0;
  return lines.reduce((acc, cur) => acc + Math.max(1, Number(cur?.qty) || 1), 0);
}

// optionRaw에서 주문목록 라인을 추출(서버가 orderLines를 저장하지 않는 경우 대비)
function parseOrderLinesFromOptionRaw(raw: string) {
  const s = String(raw || "").trim();
  if (!s) return [] as any[];
  const lines = s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const hasNumbered = /\d+\)\s*/.test(s);
  if (lines.length === 1 && !hasNumbered) return [] as any[]; // 단일 옵션 텍스트면 기존 UI 유지
  const out: any[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*(\d+)\)\s*(.+?)\s*\/\s*수량\s*[:：]\s*(\d+)\s*$/);
    if (m) out.push({ id: `p_${i}`, text: m[2].trim(), qty: Math.max(1, Number(m[3]) || 1) });
    else out.push({ id: `p_${i}`, text: line, qty: 1 });
  }
  return out;
}

export default function CartPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [items, setItems] = useState<CartRow[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  async function fetchCart() {
    try {
      setRemoteLoading(true);
      const res = await fetch("/api/cart", { credentials: "include" });
      const j = await res.json().catch(() => null);

      if (res.ok && j?.ok && Array.isArray(j.items)) {
        // ✅ 서버가 orderLines를 저장하지 않는 경우 대비: 로컬(NANA_CART_V1)에서 매칭되는 주문목록을 보강
        try {
          const local = safeJsonParse<any[]>(localStorage.getItem("NANA_CART_V1")) || [];
          const localMap = new Map<string, any>();
          for (const x of local) {
            const key = `${String(x?.url || "").trim()}||${String(x?.optionRaw || "").trim()}||${Number(x?.quantity) || 0}`;
            localMap.set(key, x);
          }

          const merged = (j.items as CartRow[]).map((r) => {
            const it: any = r?.item || {};
            if (Array.isArray(it?.orderLines) && it.orderLines.length) return r;
            const key = `${String(it?.url || "").trim()}||${String(it?.optionRaw || "").trim()}||${Number(it?.quantity) || 0}`;
            const hit = localMap.get(key);
            if (hit && Array.isArray(hit?.orderLines) && hit.orderLines.length) {
              return { ...r, item: { ...it, orderLines: hit.orderLines } };
            }
            return r;
          });
          setItems(merged);
          return;
        } catch {
          setItems(j.items);
        }
        return;
      }

      // 서버가 아직 준비 안 된 경우(보험): 로컬 장바구니라도 보여주기
      const local = safeJsonParse<any[]>(localStorage.getItem("NANA_CART_V1")) || [];
      const fallback: CartRow[] = local.map((x, i) => ({
        id: String(x?.serverId || x?.id || i),
        item: x,
        created_at: new Date().toISOString(),
      }));
      setItems(fallback);
    } catch {
      const local = safeJsonParse<any[]>(localStorage.getItem("NANA_CART_V1")) || [];
      const fallback: CartRow[] = local.map((x, i) => ({
        id: String(x?.serverId || x?.id || i),
        item: x,
        created_at: new Date().toISOString(),
      }));
      setItems(fallback);
    } finally {
      setRemoteLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && user) fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const totalQty = useMemo(
    () =>
      items.reduce((sum, r) => {
        const it: any = r?.item || {};
        const lines = Array.isArray(it?.orderLines) && it.orderLines.length ? it.orderLines : null;
        const q = lines ? sumLinesQty(lines) : Number(it?.quantity) || 0;
        return sum + q;
      }, 0),
    [items]
  );

  const handleClear = async () => {
    try {
      await fetch("/api/cart/clear", { method: "POST", credentials: "include" });
    } catch {}
    localStorage.removeItem("NANA_CART_V1");
    setItems([]);
  };

  const handleDeleteOne = async (id: string) => {
    // 서버에 있는 id(uuid)이면 서버 삭제 시도
    try {
      await fetch(`/api/cart/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
    } catch {}

    // 로컬도 같이 정리(보험)
    try {
      const local = safeJsonParse<any[]>(localStorage.getItem("NANA_CART_V1")) || [];
      const filtered = local.filter((x) => String(x?.serverId || x?.id) !== String(id));
      localStorage.setItem("NANA_CART_V1", JSON.stringify(filtered));
    } catch {}

    fetchCart();
  };

  const updateQty = async (id: string, nextQty: number, extra?: Partial<CartItemPayload>) => {
    const qty = clampQty(nextQty);

    // UI 먼저 반영
    setItems((prev) =>
      prev.map((r) =>
        String(r.id) === String(id)
          ? { ...r, item: { ...r.item, quantity: qty, ...(extra || {}) } }
          : r
      )
    );

    // 로컬도 같이 반영(보험)
    try {
      const local = safeJsonParse<any[]>(localStorage.getItem("NANA_CART_V1")) || [];
      const mapped = local.map((x) =>
        String(x?.serverId || x?.id) === String(id) ? { ...x, quantity: qty, ...(extra || {}) } : x
      );
      localStorage.setItem("NANA_CART_V1", JSON.stringify(mapped));
    } catch {}

    // 서버 수량 업데이트 시도(서버가 아직 미지원이어도 UI는 유지)
    try {
      await fetch(`/api/cart/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity: qty, ...(extra || {}) }),
      });
    } catch {}
  };

  const updateOrderLinesForItem = async (id: string, lines: any[]) => {
    const nextLines = Array.isArray(lines) ? lines : [];
    const nextQty = Math.max(1, sumLinesQty(nextLines));
    const nextOptionRaw = buildOrderLinesText(nextLines);
    await updateQty(id, nextQty, { orderLines: nextLines, optionRaw: nextOptionRaw });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <h1 className="text-2xl font-bold">장바구니</h1>
            </div>

            <Button variant="outline" className="gap-2" onClick={() => setLocation("/mypage")}>
              <ArrowLeft className="w-4 h-4" />
              마이페이지
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>담은 상품</CardTitle>
              <CardDescription>
                1688 페이지에서 &quot;장바구니에 담기&quot;한 항목들이 여기에 표시됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {remoteLoading ? (
                <div className="text-muted-foreground">불러오는 중...</div>
              ) : items.length === 0 ? (
                <div className="text-muted-foreground">담긴 항목이 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    총 {items.length}개 / 총 수량: <span className="font-semibold text-foreground">{totalQty}</span>
                  </div>

                  {/* ✅ 1688 페이지의 "주문 목록" 스타일과 동일하게 */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3">
                      {items.map((r) => {
                        const it: any = r.item || {};
                        const thumb = (it?.mainImage || "").trim();
                        const linesRaw = Array.isArray(it?.orderLines) && it.orderLines.length
                          ? it.orderLines
                          : parseOrderLinesFromOptionRaw(String(it?.optionRaw || ""));
                        const lines = Array.isArray(linesRaw) ? linesRaw : [];
                        const hasLines = lines.length > 0;
                        const qty = clampQty(Number(it?.quantity) || (hasLines ? sumLinesQty(lines) : 1));

                        return (
                          <div
                            key={r.id}
                            className="group relative flex flex-col gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:border-black/30 transition-colors"
                          >
                            <div className="flex-shrink-0">
                              {thumb ? (
                                <img
                                  src={proxyImageUrl(thumb)}
                                  alt="opt"
                                  className="w-16 h-16 rounded-lg object-contain bg-gray-100 border border-gray-100"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-bold border border-gray-200">
                                  No Img
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 mb-1">옵션 상세</div>
                                {hasLines ? (
                                  <div className="flex flex-col gap-3">
                                    {lines.map((ln: any, idx: number) => {
                                      const opt = ln?.sku && typeof ln.sku === "object"
                                        ? Object.values(ln.sku).filter(Boolean).join(" / ")
                                        : String(ln?.text || "");
                                      const q = clampQty(Number(ln?.qty || 1));

                                      return (
                                        <div
                                          key={String(ln?.id || idx)}
                                          className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 bg-gray-50"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="text-xs text-gray-500 mb-1">옵션 상세</div>
                                            <div className="text-sm font-bold text-gray-900 break-words leading-snug">
                                              {opt || "기본 옵션"}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-3">
                                            <div className="flex items-center bg-white rounded-lg border border-gray-200 h-9">
                                              <button
                                                className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded-l-lg"
                                                onClick={() => {
                                                  const next = lines.map((x: any) => ({ ...x }));
                                                  next[idx] = { ...next[idx], qty: clampQty(q - 1) };
                                                  updateOrderLinesForItem(r.id, next);
                                                }}
                                                aria-label="수량 감소"
                                                type="button"
                                              >
                                                -
                                              </button>
                                              <span className="w-10 text-center text-sm font-bold">{q}</span>
                                              <button
                                                className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded-r-lg"
                                                onClick={() => {
                                                  const next = lines.map((x: any) => ({ ...x }));
                                                  next[idx] = { ...next[idx], qty: clampQty(q + 1) };
                                                  updateOrderLinesForItem(r.id, next);
                                                }}
                                                aria-label="수량 증가"
                                                type="button"
                                              >
                                                +
                                              </button>
                                            </div>

                                            <button
                                              type="button"
                                              className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                                              onClick={() => {
                                                const next = lines.filter((_, i2) => i2 !== idx);
                                                if (next.length === 0) handleDeleteOne(r.id);
                                                else updateOrderLinesForItem(r.id, next);
                                              }}
                                              title="삭제"
                                              aria-label="삭제"
                                            >
                                              <Trash2 className="w-5 h-5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-sm font-bold text-gray-900 break-words leading-snug">
                                    {(it?.optionRaw || "").trim() || "기본 옵션"}
                                  </div>
                                )}

                                <div className="text-xs text-gray-500 mt-2 break-words">
                                  {it?.productName || "상품명 없음"}
                                </div>
                                {it?.url ? (
                                  <div className="text-[11px] text-gray-400 break-all mt-1">{it.url}</div>
                                ) : null}
                              </div>

                              {!hasLines ? (
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                                  <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-9">
                                    <button
                                      className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded-l-lg"
                                      onClick={() => updateQty(r.id, qty - 1)}
                                      aria-label="수량 감소"
                                      type="button"
                                    >
                                      -
                                    </button>
                                    <span className="w-10 text-center text-sm font-bold">{qty}</span>
                                    <button
                                      className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded-r-lg"
                                      onClick={() => updateQty(r.id, qty + 1)}
                                      aria-label="수량 증가"
                                      type="button"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                                    onClick={() => handleDeleteOne(r.id)}
                                    title="삭제"
                                    aria-label="삭제"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={() => setLocation("/ai-detail/1688")}>1688로 돌아가기</Button>
                    <Button variant="outline" className="gap-2" onClick={handleClear}>
                      <Trash2 className="w-4 h-4" />
                      비우기
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
