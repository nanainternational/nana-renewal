import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { API_BASE } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AdminOrderItem = {
  id: string;
  title: string;
  name?: string | null;
  seller?: string | null;
  thumb?: string | null;
  option?: string | null;
  amount?: string | number | null;
  product_url: string | null;
  quantity: number;
  price: string | number | null;
  options?: Record<string, any> | null;
};

type AdminOrder = {
  id: string;
  order_no: string;
  user_email: string | null;
  status: string;
  created_at: string;
  items?: AdminOrderItem[];
  item_count?: number;
  total_quantity?: number;
};

type AdminInvite = {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "VIEWER";
  is_active: boolean;
};



function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function resolveImgSrc(src?: string | null) {
  const u = String(src || "").trim();
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function getOptionLabel(item: AdminOrderItem) {
  if (item.option) return item.option;
  const opts = item.options;
  if (!opts || typeof opts !== "object") return "기본";
  const values = Object.values(opts).map((v) => String(v || "").trim()).filter(Boolean);
  return values.join(" ") || "기본";
}

function getOrderTotalAmount(order: AdminOrder) {
  const items = Array.isArray(order.items) ? order.items : [];
  const total = items.reduce((sum, item) => {
    const price = Number(item.price ?? item.amount ?? 0);
    const qty = Number(item.quantity ?? 0);
    if (!Number.isFinite(price) || !Number.isFinite(qty)) return sum;
    return sum + price * qty;
  }, 0);
  return total.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [accessReason, setAccessReason] = useState("");
  const [loginEmail, setLoginEmail] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "ADMIN" | "VIEWER">("VIEWER");

  const canEditInvite = role === "OWNER";
  const canAdvanceOrder = role === "OWNER" || role === "ADMIN";
  const FIRST_STATUS = "PENDING_PAYMENT";
  const FINAL_STATUS = "KR_CENTER_RECEIVED";

  const statusLabel = useMemo(() => {
    return {
      PENDING_PAYMENT: "입금전",
      PAYMENT_CONFIRMED: "입금확인",
      CN_CENTER_INBOUND: "중국센터 입고중",
      CN_CENTER_RECEIVED: "중국센터 입고완료",
      KR_CENTER_INBOUND: "한국센터 입고중",
      KR_CENTER_RECEIVED: "한국센터 입고완료",
    } as Record<string, string>;
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    setError("");
    setAccessReason("");
    setLoginEmail("");
    try {
      const [ordersRes, invitesRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/orders`, { credentials: "include" }),
        fetch(`${API_BASE}/api/admin/invites`, { credentials: "include" }),
      ]);

      if (!ordersRes.ok) {
        const json = await ordersRes.json().catch(() => ({}));
        const reason = String(json?.error || "");
        const currentEmail = String(json?.email || "");
        setAccessReason(reason);
        setLoginEmail(currentEmail);
        const emailHint = currentEmail ? ` (로그인 이메일: ${currentEmail})` : "";
        const reasonMessage =
          reason === "not_logged_in"
            ? "로그인이 필요합니다."
            : reason === "missing_email"
              ? "로그인 계정의 이메일 정보를 확인할 수 없습니다."
              : reason === "not_invited"
                ? "현재 로그인한 이메일은 관리자 목록에 없습니다."
                : reason === "inactive"
                  ? "관리자 계정이 비활성화 상태입니다."
                  : "관리자 권한이 없거나 로그인 상태가 아닙니다.";
        throw new Error(`${reasonMessage}${emailHint}`);
      }
      if (!invitesRes.ok) throw new Error("관리자 목록을 불러오지 못했습니다.");

      const ordersJson = await ordersRes.json();
      const invitesJson = await invitesRes.json();

      setRole(String(ordersJson?.role || invitesJson?.role || ""));
      setOrders(Array.isArray(ordersJson?.rows) ? ordersJson.rows : []);
      setInvites(Array.isArray(invitesJson?.rows) ? invitesJson.rows : []);
    } catch (e: any) {
      setError(e?.message || "관리자 데이터를 불러오지 못했습니다.");
      setOrders([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  const advance = async (orderId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/advance`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "상태 변경 실패");
      }
      await loadAdminData();
    } catch (e: any) {
      alert(e?.message || "상태 변경 실패");
    }
  };



  const revert = async (orderId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/revert`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "이전 단계 변경 실패");
      }
      await loadAdminData();
    } catch (e: any) {
      alert(e?.message || "이전 단계 변경 실패");
    }
  };

  const toggleOrderItems = (orderId: string) => {
    setExpandedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const addInvite = async () => {
    if (!inviteEmail.trim()) return alert("이메일을 입력하세요.");
    try {
      const res = await fetch(`${API_BASE}/api/admin/invites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, is_active: true }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "관리자 추가 실패");
      }
      setInviteEmail("");
      await loadAdminData();
    } catch (e: any) {
      alert(e?.message || "관리자 추가 실패");
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-800">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 pt-32 pb-10 space-y-6">
        <h1 className="text-2xl font-bold">관리자 주문 페이지</h1>
        <p className="text-sm text-slate-600">접속 경로: <code>/admin</code> (로그인 + 관리자 권한 필요)</p>

        {error ? <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div> : null}

        {accessReason === "not_invited" ? (
          <Card className="p-4 border-amber-300 bg-amber-50">
            <h3 className="font-semibold text-amber-800">어디에 이메일을 추가하나요?</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 space-y-1">
              <li>아래 <b>관리자 이메일 지정</b> 칸은 <b>OWNER 권한 계정</b>으로 로그인해야 입력할 수 있습니다.</li>
              <li>현재 로그인 이메일: <b>{loginEmail || "(확인 불가)"}</b></li>
              <li>OWNER에게 위 이메일을 관리자 목록에 추가해달라고 요청하세요.</li>
              <li>최초 OWNER가 없는 상태라면 서버 환경변수 <code>ADMIN_OWNER_EMAILS</code>에 이메일을 넣고 서버를 재시작해야 합니다.</li>
            </ul>
          </Card>
        ) : null}

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">주문 목록</h2>
            <div className="text-sm">내 역할: <b>{role || "UNKNOWN"}</b></div>
          </div>
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="rounded border p-3 flex items-center justify-between gap-2">
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <b>{o.order_no}</b>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => toggleOrderItems(o.id)}
                    >
                      발주내역
                      {expandedOrderIds[o.id] ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                    </Button>
                  </div>
                  <div>{o.user_email || "(email 없음)"}</div>
                  <div className="text-slate-500">{new Date(o.created_at).toLocaleString()} · {statusLabel[o.status] || o.status}</div>
                  {expandedOrderIds[o.id] && !!o.items?.length && (
                    <div className="rounded border border-gray-200 bg-white overflow-hidden mt-2">
                      <div className="grid grid-cols-12 gap-2 bg-[#FAFAFA] py-3 px-4 text-xs text-gray-500 font-medium border-b border-gray-200 text-center">
                        <div className="col-span-6 text-left pl-2">상품정보</div>
                        <div className="col-span-2">옵션</div>
                        <div className="col-span-2">수량</div>
                        <div className="col-span-2">금액(위안)</div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {o.items.map((item) => (
                          <div key={item.id} className="grid grid-cols-12 gap-2 p-4 items-center hover:bg-[#FFFDFB] transition-colors group">
                            <div className="col-span-6 flex gap-4 text-left">
                              <div className="relative shrink-0 border border-gray-200 rounded-sm overflow-hidden w-20 h-20 bg-gray-50">
                                {resolveImgSrc(item.thumb) ? (
                                  <img src={resolveImgSrc(item.thumb)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                  <div className="flex items-center justify-center w-full h-full text-xs text-gray-300">No Img</div>
                                )}
                              </div>
                              <div className="flex flex-col justify-center gap-1 pr-4">
                                <div className="text-xs text-[#FF5000] font-medium">{item.seller || "1688 Seller"}</div>
                                <a href={item.product_url || "#"} target="_blank" rel="noreferrer" className="text-sm text-gray-800 line-clamp-2 leading-snug hover:text-[#FF5000] hover:underline underline-offset-2 transition-colors">
                                  {item.name || item.title || "상품명 정보 없음"}
                                </a>
                              </div>
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1.5 rounded text-center break-keep leading-tight">
                                {getOptionLabel(item)}
                              </div>
                            </div>
                            <div className="col-span-2 text-center text-sm font-medium text-gray-700">{item.quantity ?? 1}</div>
                            <div className="col-span-2 text-center">
                              <span className="text-sm font-bold text-[#FF5000]">¥ {formatPrice(item.amount ?? item.price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-[#FAFAFA] border-t border-gray-200 p-4 flex items-center justify-end gap-8">
                        <div className="text-sm text-gray-500">선택 상품 <span className="text-[#FF5000] font-bold mx-1">{o.total_quantity ?? o.item_count ?? o.items.length}</span>종</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-gray-600">총 결제예정 금액:</span>
                          <span className="text-3xl font-bold text-[#FF5000] font-mono tracking-tight whitespace-nowrap tabular-nums">
                            <span className="text-lg mr-1">¥</span>{getOrderTotalAmount(o)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={!canAdvanceOrder || o.status === FIRST_STATUS}
                    onClick={() => revert(o.id)}
                  >
                    이전
                  </Button>
                  <Button
                    disabled={!canAdvanceOrder || o.status === FINAL_STATUS}
                    onClick={() => advance(o.id)}
                  >
                    다음
                  </Button>
                </div>
              </div>
            ))}
            {!orders.length && !loading ? <div className="text-sm text-slate-500">주문이 없습니다.</div> : null}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">관리자 이메일 지정 (OWNER 전용)</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <input
              className="border rounded px-3 py-2 text-sm w-64"
              placeholder="admin@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={!canEditInvite}
            />
            <select
              className="border rounded px-3 py-2 text-sm"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              disabled={!canEditInvite}
            >
              <option value="OWNER">OWNER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="VIEWER">VIEWER</option>
            </select>
            <Button onClick={addInvite} disabled={!canEditInvite}>추가/갱신</Button>
          </div>
          <div className="space-y-1 text-sm">
            {invites.map((inv) => (
              <div key={inv.id} className="rounded border p-2 flex justify-between">
                <span>{inv.email}</span>
                <span>{inv.role} · {inv.is_active ? "active" : "inactive"}</span>
              </div>
            ))}
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
