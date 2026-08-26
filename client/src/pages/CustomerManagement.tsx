import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, LoaderCircle, MessageSquareText, RefreshCw, Smartphone, XCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE } from "@/lib/queryClient";

type Device = { deviceId: string; deviceName: string; online: boolean; lastSeenAt: string };
type JobStatus = "queued" | "processing" | "sent" | "failed";
type UploadStats = { total: number; valid: number; duplicates: number; invalid: number };
type BatchCounts = { queued: number; processing: number; sent: number; failed: number };
const labels: Record<JobStatus, string> = { queued: "발송 대기", processing: "업무폰 처리 중", sent: "발송 성공", failed: "발송 실패" };

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value); if (row.some((cell) => cell.trim())) rows.push(row); row = []; value = "";
    } else value += char;
  }
  row.push(value); if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function xlsxColumnIndex(reference: string): number {
  return reference.replace(/\d/g, "").split("").reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

async function parseXlsx(file: File): Promise<string[][]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const parser = new DOMParser();
  const sharedFile = zip.file("xl/sharedStrings.xml");
  const shared = sharedFile ? Array.from(parser.parseFromString(await sharedFile.async("text"), "application/xml").getElementsByTagName("si"))
    .map((node) => node.textContent || "") : [];
  const sheetName = Object.keys(zip.files).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort()[0];
  if (!sheetName) throw new Error("XLSX 워크시트를 찾을 수 없습니다.");
  const document = parser.parseFromString(await zip.file(sheetName)!.async("text"), "application/xml");
  return Array.from(document.getElementsByTagName("row")).map((row) => {
    const values: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const index = xlsxColumnIndex(cell.getAttribute("r") || "A1");
      const inline = cell.getElementsByTagName("is")[0]?.textContent;
      const raw = cell.getElementsByTagName("v")[0]?.textContent || "";
      values[index] = cell.getAttribute("t") === "s" ? (shared[Number(raw)] || "") : (inline ?? raw);
    }
    return values;
  });
}

function extractPhones(rows: string[][]): { phones: string[]; stats: UploadStats } {
  if (!rows.length) throw new Error("파일에 데이터가 없습니다.");
  const headers = rows[0].map((value) => String(value || "").replace(/\s/g, "").toLowerCase());
  const phoneIndex = headers.findIndex((header) => ["전화번호", "연락처", "phone", "휴대폰번호"].includes(header));
  if (phoneIndex < 0) throw new Error("'전화번호' 컬럼을 찾을 수 없습니다.");
  const data = rows.slice(1).filter((row) => row.some((cell) => String(cell || "").trim()));
  const seen = new Set<string>();
  const phones: string[] = [];
  let duplicates = 0, invalid = 0;
  for (const row of data) {
    const phone = String(row[phoneIndex] || "").replace(/\D/g, "");
    if (!/^01\d{8,9}$/.test(phone)) { invalid += 1; continue; }
    if (seen.has(phone)) { duplicates += 1; continue; }
    seen.add(phone); phones.push(phone);
  }
  return { phones, stats: { total: data.length, valid: phones.length, duplicates, invalid } };
}

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
  const [bulkPhones, setBulkPhones] = useState<string[]>([]);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [batchId, setBatchId] = useState("");
  const [batchCounts, setBatchCounts] = useState<BatchCounts | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

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

  useEffect(() => {
    if (!batchId || !batchCounts || batchCounts.queued + batchCounts.processing === 0) return;
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/sms/batch/${batchId}/status`, { credentials: "include" });
        const data = await response.json();
        if (response.ok) setBatchCounts(data.counts);
      } catch { /* 다음 폴링에서 다시 확인 */ }
    };
    const timer = window.setInterval(poll, 2000);
    return () => window.clearInterval(timer);
  }, [batchId, batchCounts]);

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

  const uploadFile = async (file?: File) => {
    if (!file) return;
    setError(""); setBatchId(""); setBatchCounts(null);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("파일은 10MB 이하만 가능합니다.");
      const extension = file.name.split(".").pop()?.toLowerCase();
      const rows = extension === "csv" ? parseCsv(await file.text()) : extension === "xlsx" ? await parseXlsx(file) : null;
      if (!rows) throw new Error("CSV 또는 XLSX 파일만 업로드할 수 있습니다.");
      const parsed = extractPhones(rows);
      setBulkPhones(parsed.phones); setUploadStats(parsed.stats);
    } catch (err: any) {
      setBulkPhones([]); setUploadStats(null); setError(err.message || "파일 처리 실패");
    }
  };

  const sendBulk = async () => {
    setError(""); setBulkLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/sms/send-bulk`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, phones: bulkPhones, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "대량 발송 요청 실패");
      setBatchId(data.batchId); setBatchCounts({ queued: data.queued, processing: 0, sent: 0, failed: 0 });
    } catch (err: any) { setError(err.message || "대량 발송 요청 실패"); }
    finally { setBulkLoading(false); }
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
      <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4"><h2 className="flex items-center gap-2 text-lg font-semibold"><FileSpreadsheet className="h-5 w-5"/>대량 업로드</h2><p className="mt-1 text-sm text-slate-500">전화번호 컬럼이 포함된 CSV 또는 XLSX 파일을 선택하세요. 이름과 상호명 컬럼은 선택 사항입니다.</p></div>
        <Input type="file" accept=".csv,.xlsx" onChange={(event) => uploadFile(event.target.files?.[0])}/>
        {uploadStats && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[
          ["전체 건수", uploadStats.total], ["정상 건수", uploadStats.valid], ["중복 제외", uploadStats.duplicates], ["오류 제외", uploadStats.invalid],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>}
        <Button type="button" className="mt-4 w-full" onClick={sendBulk} disabled={bulkLoading || !bulkPhones.length || !message.trim() || !chosen?.online}>
          {bulkLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : <MessageSquareText className="mr-2 h-4 w-4"/>}정상 번호 {bulkPhones.length}건 Queue 등록
        </Button>
        {!message.trim() && uploadStats && <p className="mt-2 text-center text-sm text-amber-600">위 문자 내용에 발송 문구를 입력해 주세요.</p>}
        {batchCounts && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[
          ["대기", batchCounts.queued], ["처리중", batchCounts.processing], ["성공", batchCounts.sent], ["실패", batchCounts.failed],
        ].map(([label, value]) => <div key={label} className="rounded-xl border p-3 text-center"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>}
      </section>
    </main><Footer />
  </div>;
}
