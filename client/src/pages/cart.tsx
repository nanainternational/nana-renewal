import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";

const DRAFT_KEY = "NANA_1688_DRAFT_V1";

type SelectedOption = {
  optionId?: string;
  name: string;
  image?: string;
  price?: number;
  qty: number;
};

type OrderDraft = {
  v: number;
  ts: number;
  productUrl?: string;
  offerId?: string;
  productName?: string;
  selectedOptions?: SelectedOption[];
  memo?: string;
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
  const [draft, setDraft] = useState<OrderDraft | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  useEffect(() => {
    const d = safeJsonParse<OrderDraft>(localStorage.getItem(DRAFT_KEY));
    if (d) setDraft(d);
  }, []);

  const rows = useMemo(() => {
    return Array.isArray(draft?.selectedOptions) ? draft!.selectedOptions! : [];
  }, [draft]);

  const totalQty = useMemo(() => rows.reduce((sum, x) => sum + (Number(x.qty) || 0), 0), [rows]);
  const totalPrice = useMemo(
    () => rows.reduce((sum, x) => sum + (Number(x.qty) || 0) * (Number(x.price) || 0), 0),
    [rows]
  );

  const handleClear = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraft(null);
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
                현재는 1688 페이지에서 진행 중인 주문(임시저장 1건)을 장바구니로 보여줍니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!draft || rows.length === 0 ? (
                <div className="text-muted-foreground">담긴 항목이 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="font-semibold">{draft.productName || "상품명 없음"}</div>
                    {draft.productUrl ? (
                      <div className="text-sm text-muted-foreground break-all">{draft.productUrl}</div>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    {rows.map((x, idx) => (
                      <div
                        key={(x.optionId || "") + x.name + idx}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{x.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {x.price != null ? `가격: ${x.price}` : ""}
                          </div>
                        </div>
                        <div className="font-semibold">x {x.qty}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="text-sm text-muted-foreground">총 수량: <span className="font-semibold text-foreground">{totalQty}</span></div>
                    <div className="text-sm text-muted-foreground">총 금액: <span className="font-semibold text-foreground">{totalPrice}</span></div>
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
