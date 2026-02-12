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
  domain?: string;
  serverId?: string | null;
};

type CartRow = {
  id: string;
  item: CartItemPayload;
  created_at: string;
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
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
        setItems(j.items);
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
    () => items.reduce((sum, r) => sum + (Number(r?.item?.quantity) || 0), 0),
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

                  <div className="grid gap-3">
                    {items.map((r) => (
                      <div key={r.id} className="flex items-start justify-between gap-3 p-4 rounded-xl bg-muted/40">
                        <div className="min-w-0">
                          <div className="font-semibold break-words">{r.item?.productName || "상품명 없음"}</div>
                          {r.item?.url ? (
                            <div className="text-xs text-muted-foreground break-all mt-1">{r.item.url}</div>
                          ) : null}
                          <div className="text-sm mt-2">
                            {r.item?.optionRaw ? (
                              <div className="text-muted-foreground break-words">옵션: {r.item.optionRaw}</div>
                            ) : null}
                            <div className="text-muted-foreground">수량: {Number(r.item?.quantity) || 0}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleDeleteOne(r.id)}>
                            <Trash2 className="w-4 h-4" />
                            삭제
                          </Button>
                        </div>
                      </div>
                    ))}
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
