import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";

const CART_KEY = "NANA_CART_V1";
const CART_KEY_LEGACY = "nana_sample_cart";

type CartItem = {
  id: number;
  url: string;
  productName: string;
  mainImage?: string;
  price?: number;
  currency?: string;
  optionRaw?: string;
  quantity?: number;
  domain?: string;
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
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  useEffect(() => {
    const raw = localStorage.getItem(CART_KEY) || localStorage.getItem(CART_KEY_LEGACY);
    const list = safeJsonParse<CartItem[]>(raw);
    setItems(Array.isArray(list) ? list : []);
  }, []);

  const totalQty = useMemo(
    () => items.reduce((sum, x) => sum + (Number(x.quantity) || 0), 0),
    [items]
  );

  const handleClear = () => {
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(CART_KEY_LEGACY);
    setItems([]);
  };

  const handleRemove = (id: number) => {
    const next = items.filter((x) => x.id !== id);
    setItems(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    localStorage.setItem(CART_KEY_LEGACY, JSON.stringify(next));
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
                1688 페이지에서 “장바구니에 담기”한 항목들이 여기에 표시됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-muted-foreground">담긴 항목이 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      총 {items.length}개 / 총 수량: <span className="font-semibold text-foreground">{totalQty}</span>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {items.map((it) => (
                      <div key={it.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{it.productName || "상품명 없음"}</div>
                            <div className="text-xs text-muted-foreground break-all">{it.url}</div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleRemove(it.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            삭제
                          </Button>
                        </div>

                        <div className="text-sm mt-2">
                          <span className="text-muted-foreground">옵션:</span> {it.optionRaw || "-"}
                        </div>
                        <div className="text-sm mt-1">
                          <span className="text-muted-foreground">수량:</span> {it.quantity ?? 1}
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
