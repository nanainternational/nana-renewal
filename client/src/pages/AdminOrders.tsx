import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { API_BASE } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AdminOrder = {
  id: string;
  order_no: string;
  user_email: string | null;
  status: string;
  created_at: string;
};

type AdminInvite = {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "VIEWER";
  is_active: boolean;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(false);
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
      <main className="mx-auto max-w-6xl px-4 py-10 space-y-6">
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
                <div className="text-sm">
                  <div><b>{o.order_no}</b></div>
                  <div>{o.user_email || "(email 없음)"}</div>
                  <div className="text-slate-500">{new Date(o.created_at).toLocaleString()} · {statusLabel[o.status] || o.status}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={!canAdvanceOrder || o.status === FIRST_STATUS}
                    onClick={() => revert(o.id)}
                  >
                    이전 단계(캔슬)
                  </Button>
                  <Button
                    disabled={!canAdvanceOrder || o.status === FINAL_STATUS}
                    onClick={() => advance(o.id)}
                  >
                    다음 단계
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
