import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE } from "@/lib/queryClient";

type FormSettings = {
  admin_emails: string;
  enable_user_receipt: boolean;
  rate_limit_per_hour: number;
};

type Submission = {
  id: string;
  name: string;
  phone: string;
  region: string;
  expected_sales: string;
  created_at: string;
};

export default function AdminFormmail() {
  const [settings, setSettings] = useState<FormSettings>({
    admin_emails: "",
    enable_user_receipt: false,
    rate_limit_per_hour: 30,
  });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, listRes] = await Promise.all([
        fetch(`${API_BASE}/api/formmail/settings`, { credentials: "include" }),
        fetch(`${API_BASE}/api/formmail/submissions?limit=50`, { credentials: "include" }),
      ]);

      const sData = await sRes.json();
      const lData = await listRes.json();

      if (!sRes.ok || !sData?.ok) throw new Error(sData?.message || "설정 조회 실패");
      if (!listRes.ok || !lData?.ok) throw new Error(lData?.message || "신청 목록 조회 실패");

      setSettings({
        admin_emails: sData.settings.admin_emails || "",
        enable_user_receipt: Boolean(sData.settings.enable_user_receipt),
        rate_limit_per_hour: Number(sData.settings.rate_limit_per_hour || 30),
      });
      setSubmissions(Array.isArray(lData.submissions) ? lData.submissions : []);
    } catch (e: any) {
      setMessage(e?.message || "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/formmail/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          adminEmails: settings.admin_emails,
          enableUserReceipt: settings.enable_user_receipt,
          rateLimitPerHour: settings.rate_limit_per_hour,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || "저장 실패");
      setMessage("저장되었습니다.");
      await load();
    } catch (e: any) {
      setMessage(e?.message || "저장 실패");
    }
  };

  const csvData = useMemo(() => {
    const header = ["이름", "연락처", "거주지역", "희망매출", "접수시간"];
    const rows = submissions.map((s) => [s.name, s.phone, s.region, s.expected_sales, s.created_at]);
    return [header, ...rows]
      .map((row) => row.map((v) => `"${String(v || "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
  }, [submissions]);

  const downloadCsv = () => {
    const blob = new Blob(["\ufeff" + csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formmail-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-28 space-y-6">
        <h1 className="text-3xl font-bold">폼메일 관리자</h1>

        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div>
            <p className="text-sm mb-1">수신 이메일 목록(콤마 구분)</p>
            <Input
              value={settings.admin_emails}
              onChange={(e) => setSettings((prev) => ({ ...prev, admin_emails: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={settings.enable_user_receipt}
              onCheckedChange={(v) => setSettings((prev) => ({ ...prev, enable_user_receipt: Boolean(v) }))}
            />
            <span>사용자 접수완료 메일 발송</span>
          </div>

          <div>
            <p className="text-sm mb-1">시간당 제한</p>
            <Input
              type="number"
              min={1}
              value={settings.rate_limit_per_hour}
              onChange={(e) => setSettings((prev) => ({ ...prev, rate_limit_per_hour: Number(e.target.value || 1) }))}
              className="max-w-[200px]"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={save}>설정 저장</Button>
            <Button variant="outline" onClick={load}>새로고침</Button>
          </div>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </div>

        <div className="bg-white rounded-xl border p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">최근 신청 50건</h2>
            <Button variant="outline" onClick={downloadCsv}>CSV 다운로드</Button>
          </div>
          {loading ? (
            <p>불러오는 중...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-2">이름</th>
                    <th className="text-left p-2">연락처</th>
                    <th className="text-left p-2">지역</th>
                    <th className="text-left p-2">희망매출</th>
                    <th className="text-left p-2">시간</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="p-2">{s.name}</td>
                      <td className="p-2">{s.phone}</td>
                      <td className="p-2">{s.region}</td>
                      <td className="p-2">{s.expected_sales}</td>
                      <td className="p-2">{new Date(s.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
