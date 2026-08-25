import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, LoaderCircle, MessageSquareText, RefreshCw, Smartphone, XCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE } from "@/lib/queryClient";

type Device = { deviceId: string; deviceName: string; online: boolean; lastSeenAt: string };
type JobStatus = "queued" | "processing" | "sent" | "failed";
const labels: Record<JobStatus, string> = { queued: "발송 대기", processing: "업무폰 처리 중", sent: "발송 성공", failed: "발송 실패" };

export default function CustomerManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sms/devices`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "업무폰 조회 실패");
      const next = Array.isArray(data.devices) ? data.devices : [];
      setAuthorized(true);
      setDevices(next);
      setDeviceId((current) => current && next.some((item: Device) => item.deviceId === current) ? current : (next.find((item: Device) => item.online)?.deviceId || next[0]?.deviceId || ""));
      setError("");
    } catch (err: any) {
      setAuthorized(false);
      setError(err.message || "업무폰 조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    const timer = window.setInterval(loadDevices, 5000);
    return () => window.clearInterval(timer);
  }, [loadDevices]);

  useEffect(() => {
    if (!jobId || status === "sent" || status === "failed") return;
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/sms/status/${jobId}`, { credentials: "include" });
        const data = await response.json();
        if (response.ok) {
          setStatus(data.job.status);
          setError(data.job.error || "");
        }
      } catch { /* 다음 폴링에서 다시 확인 */ }
    };
    poll();
    const timer = window.setInterval(poll, 1500);
    return () => window.clearInterval(timer);
  }, [jobId, status]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setJobId("");
    setStatus(null);
    try {
      const response = await fetch(`${API_BASE}/api/sms/send`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, phone, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "발송 요청 실패");
      setJobId(data.jobId);
      setStatus("queued");
    } catch (err: any) {
      setError(err.message || "발송 요청 실패");
    }
  };

  const chosen = devices.find((device) => device.deviceId === deviceId);
  return <div className="min-h-screen bg-slate-50">
    <Navigation />
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-28">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-sm font-semibold text-violet-600">고객관리 · 개발 연결 테스트</p><h1 className="text-3xl font-bold text-slate-900">SMS 발송 테스트</h1><p className="mt-2 text-slate-500">업무폰 SIM을 통해 문자 1건을 발송합니다.</p></div>
        {authorized && <Button variant="outline" asChild><a href={`${API_BASE}/api/sms/app/download`}><Download className="mr-2 h-4 w-4"/>Nana SMS Sender APK</a></Button>}
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><Smartphone className="h-5 w-5"/>연결된 업무폰</h2><Button type="button" variant="ghost" size="icon" onClick={loadDevices} aria-label="새로고침"><RefreshCw className="h-4 w-4"/></Button></div>
          {loading ? <p className="text-sm text-slate-500">조회 중...</p> : devices.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">등록된 업무폰이 없습니다.</p> : <div className="space-y-2">{devices.map((device) => <label key={device.deviceId} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${deviceId === device.deviceId ? "border-violet-400 bg-violet-50" : ""}`}><input type="radio" name="device" checked={deviceId === device.deviceId} onChange={() => setDeviceId(device.deviceId)}/><span className={`h-2.5 w-2.5 rounded-full ${device.online ? "bg-emerald-500" : "bg-slate-300"}`}/><span className="min-w-0"><span className="block font-medium">{device.deviceName}</span><span className="block truncate text-xs text-slate-500">{device.online ? "온라인" : "오프라인"} · {device.deviceId}</span></span></label>)}</div>}
        </section>
        <form onSubmit={send} className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="space-y-2"><Label htmlFor="phone">수신 전화번호</Label><Input id="phone" inputMode="tel" placeholder="01012345678" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
          <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="message">문자 내용</Label><span className="text-xs text-slate-400">{message.length}/2000</span></div><Textarea id="message" className="min-h-36 resize-none" maxLength={2000} placeholder="테스트 문자 내용을 입력하세요." value={message} onChange={(e) => setMessage(e.target.value)} required /></div>
          <Button className="w-full" size="lg" disabled={!deviceId || !chosen?.online || Boolean(status && status !== "sent" && status !== "failed")}><MessageSquareText className="mr-2 h-4 w-4"/>문자 보내기</Button>
          {chosen && !chosen.online && <p className="text-center text-sm text-amber-600">온라인 업무폰을 선택해 주세요.</p>}
          {(status || error) && <div className={`rounded-xl border p-4 ${status === "sent" ? "border-emerald-200 bg-emerald-50" : status === "failed" || (!status && error) ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}`}>
            <div className="flex items-center gap-2 font-semibold">{status === "sent" ? <CheckCircle2 className="h-5 w-5 text-emerald-600"/> : status === "failed" || (!status && error) ? <XCircle className="h-5 w-5 text-red-600"/> : <LoaderCircle className="h-5 w-5 animate-spin text-blue-600"/>}<span>{status ? labels[status] : "요청 실패"}</span></div>
            {error && <p className="mt-2 break-words text-sm text-slate-600">{error}</p>}{jobId && <p className="mt-2 break-all text-xs text-slate-400">Job ID: {jobId}</p>}
          </div>}
        </form>
      </div>
    </main><Footer />
  </div>;
}
