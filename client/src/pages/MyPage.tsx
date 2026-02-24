import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Mail, Phone, Calendar, Bell, LogOut, User, Copy, Check } from "lucide-react";
import { SiGoogle, SiKakaotalk } from "react-icons/si";

type MyOrderItem = {
  id: string;
  title: string;
  product_url: string | null;
  quantity: number;
  price: string | number | null;
  options?: Record<string, any> | null;
};

type MyOrder = {
  id: string;
  order_no: string;
  status:
    | "PENDING_PAYMENT"
    | "PAYMENT_CONFIRMED"
    | "CN_CENTER_INBOUND"
    | "CN_CENTER_RECEIVED"
    | "KR_CENTER_INBOUND"
    | "KR_CENTER_RECEIVED"
    | string;
  created_at: string;
  items?: MyOrderItem[];
  item_count?: number;
  total_quantity?: number;
};

const ORDER_STEPS = [
  "입금전",
  "입금확인",
  "중국센터 입고중",
  "중국센터 입고완료",
  "한국센터 입고중",
  "한국센터 입고완료",
] as const;

const ORDER_STATUS_TO_STEP_INDEX: Record<string, number> = {
  PENDING_PAYMENT: 0,
  PAYMENT_CONFIRMED: 1,
  CN_CENTER_INBOUND: 2,
  CN_CENTER_RECEIVED: 3,
  KR_CENTER_INBOUND: 4,
  KR_CENTER_RECEIVED: 5,
};



function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "가격 미기재";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function formatOrderNo(orderNo: string) {
  const normalized = String(orderNo || "").trim();
  const matched = normalized.match(/^CP(\d{8})(\d{4})$/);
  if (!matched) return normalized || "-";
  return `CP-${matched[1]}-${matched[2]}`;
}

export default function MyPage() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [accountId, setAccountId] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (loading || !user) return;

    (async () => {
      try {
        const r = await fetch("/api/wallet", { credentials: "include" });
        const j = await r.json();
        if (j?.ok && typeof j?.user_id === "string") {
          setAccountId(j.user_id);
        }
      } catch {
        // ignore
      }
    })();
  }, [user, loading]);

  useEffect(() => {
    if (loading || !user) return;

    (async () => {
      try {
        setOrdersLoading(true);
        const r = await fetch("/api/orders/my", { credentials: "include" });
        const j = await r.json();
        if (j?.ok && Array.isArray(j?.rows)) {
          setOrders(j.rows);
        }
      } catch {
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    })();
  }, [user, loading]);

  useEffect(() => {
    if (loading || !user) return;
    if (window.location.hash !== "#progress") return;

    const el = document.getElementById("progress");
    if (!el) return;
    window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [user, loading]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleCopy = async () => {
    if (!accountId) return;
    try {
      await navigator.clipboard.writeText(accountId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
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

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-32 pb-20 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl font-bold" data-testid="text-mypage-title">
                    마이페이지
                  </CardTitle>
                  <CardDescription data-testid="text-mypage-description">
                    회원 정보를 확인하고 관리하세요
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-6 mb-8">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user.profileImage} alt={user.name} />
                  <AvatarFallback className="text-2xl">{user.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold" data-testid="text-user-name">
                    {user.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {user.provider === "google" ? (
                      <Badge variant="secondary" className="gap-1" data-testid="badge-provider">
                        <SiGoogle className="w-3 h-3" />
                        Google
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-[#FEE500] text-[#3C1E1E]"
                        data-testid="badge-provider"
                      >
                        <SiKakaotalk className="w-3 h-3" />
                        Kakao
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">이메일</p>
                    <p className="font-medium" data-testid="text-user-email">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">계정 ID</p>
                      <p className="font-medium break-all" data-testid="text-user-id">
                        {accountId || "-"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleCopy}
                    disabled={!accountId}
                    data-testid="button-copy-user-id"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "복사됨" : "복사"}
                  </Button>
                </div>

                {user.phone && (
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">전화번호</p>
                      <p className="font-medium" data-testid="text-user-phone">
                        {user.phone}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">가입일</p>
                    <p className="font-medium" data-testid="text-user-created">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">마케팅 수신 동의</p>
                    <p className="font-medium" data-testid="text-user-marketing">
                      {user.agreeMarketing ? "동의함" : "동의하지 않음"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="progress">
            <CardHeader>
              <CardTitle className="text-xl font-bold">중국사입 진행상황</CardTitle>
              <CardDescription>
                단계별 진행상황을 확인하세요. 관리자 승인된 현재 단계는 깜빡이며 표시됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div id="order-history" className="space-y-3">
                {ordersLoading ? (
                  <p className="text-sm text-muted-foreground">진행상황을 불러오는 중입니다...</p>
                ) : orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    아직 접수된 중국사입 요청이 없습니다. 견적 요청 후 이곳에서 상태를 확인할 수 있습니다.
                  </p>
                ) : (
                  orders.map((order) => {
                    const activeStep = ORDER_STATUS_TO_STEP_INDEX[order.status] ?? 0;
                    return (
                      <div key={order.id} className="rounded-lg border p-4 bg-muted/30 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{formatOrderNo(order.order_no)}</p>
                          <Badge className="animate-pulse">{ORDER_STEPS[activeStep]}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">요청일: {formatDate(order.created_at)}</p>
                        <p className="text-sm text-muted-foreground">품목 {order.item_count ?? order.items?.length ?? 0}개 · 총 수량 {order.total_quantity ?? 0}</p>

                        {!!order.items?.length && (
                          <div className="rounded-md border bg-white p-2 space-y-2">
                            {order.items.map((item) => (
                              <div key={item.id} className="rounded border border-dashed p-2">
                                <p className="text-sm font-medium">{item.title || "상품명 없음"}</p>
                                <p className="text-xs text-muted-foreground">수량: {item.quantity ?? 0} · 단가: {formatPrice(item.price)}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {ORDER_STEPS.map((stepLabel, idx) => {
                            const isDone = idx < activeStep;
                            const isCurrent = idx === activeStep;
                            return (
                              <div
                                key={`${order.id}-${stepLabel}`}
                                className={[
                                  "rounded-md border px-2 py-2 text-xs text-center",
                                  isCurrent ? "border-blue-500 text-blue-700 bg-blue-50 animate-pulse" : "",
                                  !isCurrent && isDone ? "border-green-300 text-green-700 bg-green-50" : "",
                                  !isCurrent && !isDone ? "border-gray-200 text-gray-500 bg-white" : "",
                                ].join(" ")}
                              >
                                {stepLabel}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            size="lg"
            className="w-full justify-center gap-2"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
