import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  Smartphone,
  XCircle,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE } from "@/lib/queryClient";

type ContactStatus = "미분류" | "상담중" | "고객" | "수신거부";
type Device = {
  deviceId: string;
  deviceName: string;
  online: boolean;
  lastSeenAt: string;
  nextSendAt?: string;
  queueCount: number;
  todaySent: number;
  activeBatchId?: string;
  startsAt?: string;
  endsAt?: string;
  paused?: boolean;
};
type JobStatus = "queued" | "processing" | "sent" | "failed" | "cancelled";
type Contact = {
  id: string;
  companyName: string;
  phone: string;
  channel: string;
  status: ContactStatus;
  historyCount: number;
  lastSentAt?: string;
};
type History = {
  jobId: string;
  companyName?: string;
  phone?: string;
  channel?: string;
  message: string;
  status: JobStatus;
  sentAt?: string;
  scheduledAt?: string;
  createdAt: string;
  sendInterval?: { minutes?: number; seconds?: number } | string;
};
type UploadContact = {
  companyName: string;
  phone: string;
  channel: string;
  contactId?: string;
  status: ContactStatus;
  historyCount: number;
  lastSentAt?: string;
  decision: "pending" | "approved" | "excluded";
  draftMessage: string;
  finalMessage?: string;
};
type UploadStats = {
  total: number;
  valid: number;
  duplicates: number;
  invalid: number;
};
type BatchCounts = {
  queued: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
};
const statuses: ContactStatus[] = ["미분류", "상담중", "고객", "수신거부"];
const labels: Record<JobStatus, string> = {
  queued: "발송 대기",
  processing: "업무폰 처리 중",
  sent: "성공",
  failed: "실패",
  cancelled: "취소",
};
const openings = [
  "안녕하세요. {channel} 판매페이지 보고 연락드렸습니다.",
  "안녕하세요. {channel} 판매페이지 확인 후 연락드립니다.",
  "안녕하세요. {channel}에서 판매 중이신 페이지를 보고 연락드렸습니다.",
];
const questions = [
  "3PL 관련해서 확인드릴 내용이 있는데",
  "3PL 물류 관련해서 문의드릴 부분이 있는데",
  "물류 관련해서 여쭤볼 내용이 있는데",
];
const closings = [
  "물류 담당자분과 연락 가능할까요?",
  "관련 담당자분과 연락 가능하실까요?",
  "물류 담당자분께 문의드릴 수 있을까요?",
];

function generateMessage(channel: string) {
  const pick = (values: string[]) =>
    values[Math.floor(Math.random() * values.length)];
  return `${pick(openings).replace("{channel}", channel || "온라인")}\n${pick(questions)} ${pick(closings)}`;
}
function normalizePhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}
function formatPhone(value: string) {
  return value.length === 11
    ? value.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")
    : value;
}
function formatKst(value?: string) {
  return value
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : "-";
}
function formatInterval(value?: History["sendInterval"]) {
  if (!value) return "-";
  if (typeof value === "object") {
    const totalSeconds =
      (value.minutes || 0) * 60 + Math.floor(value.seconds || 0);
    return `+${Math.floor(totalSeconds / 60)}분 ${totalSeconds % 60}초`;
  }
  const match = value.match(/^(?:(\d+):)?(\d+):([\d.]+)$/);
  if (!match) return value;
  const totalSeconds =
    Number(match[1] || 0) * 3600 +
    Number(match[2]) * 60 +
    Math.floor(Number(match[3]));
  return `+${Math.floor(totalSeconds / 60)}분 ${totalSeconds % 60}초`;
}
function koreaScheduleRange(startTime: string, endTime: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value;
  const date = `${value("year")}-${value("month")}-${value("day")}`;
  const startsAt = new Date(`${date}T${startTime}:00+09:00`);
  const endsAt = new Date(`${date}T${endTime}:00+09:00`);
  return { startsAt, endsAt };
}
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}
function xlsxColumnIndex(reference: string) {
  return (
    reference
      .replace(/\d/g, "")
      .split("")
      .reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1
  );
}
async function parseXlsx(file: File): Promise<string[][]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const parser = new DOMParser();
  const sharedFile = zip.file("xl/sharedStrings.xml");
  const shared = sharedFile
    ? Array.from(
        parser
          .parseFromString(await sharedFile.async("text"), "application/xml")
          .getElementsByTagName("si"),
      ).map((node) => node.textContent || "")
    : [];
  const sheetName = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort()[0];
  if (!sheetName) throw new Error("XLSX 워크시트를 찾을 수 없습니다.");
  const document = parser.parseFromString(
    await zip.file(sheetName)!.async("text"),
    "application/xml",
  );
  return Array.from(document.getElementsByTagName("row")).map((row) => {
    const values: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const index = xlsxColumnIndex(cell.getAttribute("r") || "A1");
      const raw = cell.getElementsByTagName("v")[0]?.textContent || "";
      values[index] =
        cell.getAttribute("t") === "s"
          ? shared[Number(raw)] || ""
          : (cell.getElementsByTagName("is")[0]?.textContent ?? raw);
    }
    return values;
  });
}
function extractContacts(rows: string[][]): {
  contacts: Pick<UploadContact, "companyName" | "phone" | "channel">[];
  stats: UploadStats;
} {
  if (!rows.length) throw new Error("파일에 데이터가 없습니다.");
  const headers = rows[0].map((value) =>
    String(value || "")
      .replace(/\s/g, "")
      .toLowerCase(),
  );
  const find = (names: string[]) =>
    headers.findIndex((header) => names.includes(header));
  const phoneIndex = find(["전화번호", "연락처", "phone", "휴대폰번호"]);
  if (phoneIndex < 0) throw new Error("'전화번호' 컬럼을 찾을 수 없습니다.");
  const companyIndex = find(["companyname", "업체명", "회사명", "상호명"]);
  const channelIndex = find(["channel", "채널"]);
  const data = rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell || "").trim()));
  const seen = new Set<string>();
  const contacts: Pick<UploadContact, "companyName" | "phone" | "channel">[] =
    [];
  let duplicates = 0,
    invalid = 0;
  for (const row of data) {
    const phone = normalizePhone(row[phoneIndex]);
    if (!/^01\d{8,9}$/.test(phone)) {
      invalid += 1;
      continue;
    }
    if (seen.has(phone)) {
      duplicates += 1;
      continue;
    }
    seen.add(phone);
    contacts.push({
      companyName: String(row[companyIndex] || "").trim(),
      phone,
      channel: String(row[channelIndex] || "").trim(),
    });
  }
  return {
    contacts,
    stats: { total: data.length, valid: contacts.length, duplicates, invalid },
  };
}

export default function CustomerManagement() {
  const [tab, setTab] = useState<"contacts" | "bulk" | "history" | "test">(
    "contacts",
  );
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact>();
  const [contactHistory, setContactHistory] = useState<History[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [uploads, setUploads] = useState<UploadContact[]>([]);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [confirmIndex, setConfirmIndex] = useState(0);
  const [batchId, setBatchId] = useState("");
  const [batchCounts, setBatchCounts] = useState<BatchCounts | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [batchPaused, setBatchPaused] = useState(false);
  const api = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "요청 실패");
    return data;
  };
  const loadDevices = useCallback(async () => {
    try {
      const data = await api("/api/sms/devices");
      const next = data.devices || [];
      setAuthorized(true);
      setDevices(next);
      setDeviceId((current) =>
        current && next.some((item: Device) => item.deviceId === current)
          ? current
          : next.find((item: Device) => item.online)?.deviceId ||
            next[0]?.deviceId ||
            "",
      );
      setError("");
    } catch (err: any) {
      setAuthorized(false);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  const loadContacts = useCallback(async () => {
    try {
      const data = await api(
        `/api/crm/contacts?search=${encodeURIComponent(search)}`,
      );
      setContacts(data.contacts);
    } catch (err: any) {
      setError(err.message);
    }
  }, [search]);
  const loadHistory = useCallback(async () => {
    try {
      setHistory((await api("/api/crm/sms-history")).history);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);
  useEffect(() => {
    loadDevices();
    const timer = window.setInterval(loadDevices, 5000);
    return () => clearInterval(timer);
  }, [loadDevices]);
  useEffect(() => {
    const timer = window.setTimeout(loadContacts, 250);
    return () => clearTimeout(timer);
  }, [loadContacts]);
  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);
  useEffect(() => {
    if (!jobId || jobStatus === "sent" || jobStatus === "failed") return;
    const poll = async () => {
      try {
        const data = await api(`/api/sms/status/${jobId}`);
        setJobStatus(data.job.status);
        setError(data.job.error || "");
      } catch {}
    };
    const timer = window.setInterval(poll, 1500);
    return () => clearInterval(timer);
  }, [jobId, jobStatus]);
  useEffect(() => {
    if (
      !batchId ||
      !batchCounts ||
      batchCounts.queued + batchCounts.processing === 0
    )
      return;
    const timer = window.setInterval(async () => {
      try {
        const data = await api(`/api/sms/batch/${batchId}/status`);
        setBatchCounts(data.counts);
        setBatchPaused(data.paused);
      } catch {}
    }, 2000);
    return () => clearInterval(timer);
  }, [batchId, batchCounts]);
  const chooseContact = async (contact: Contact) => {
    setSelected(contact);
    setContactHistory(
      (await api(`/api/crm/contacts/${contact.id}/history`)).history,
    );
  };
  const changeStatus = async (contact: Contact, status: ContactStatus) => {
    await api(`/api/crm/contacts/${contact.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setContacts((all) =>
      all.map((item) => (item.id === contact.id ? { ...item, status } : item)),
    );
    setSelected((item) =>
      item?.id === contact.id ? { ...item, status } : item,
    );
    setUploads((all) =>
      all.map((item) =>
        item.contactId === contact.id
          ? {
              ...item,
              status,
              decision: status === "수신거부" ? "excluded" : item.decision,
            }
          : item,
      ),
    );
  };
  const uploadFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setBatchId("");
    setBatchCounts(null);
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("파일은 10MB 이하만 가능합니다.");
      const extension = file.name.split(".").pop()?.toLowerCase();
      const rows =
        extension === "csv"
          ? parseCsv(await file.text())
          : extension === "xlsx"
            ? await parseXlsx(file)
            : null;
      if (!rows) throw new Error("CSV 또는 XLSX 파일만 업로드할 수 있습니다.");
      const parsed = extractContacts(rows);
      const matches = (
        await api("/api/crm/contacts/check", {
          method: "POST",
          body: JSON.stringify({ contacts: parsed.contacts }),
        })
      ).matches as Contact[];
      const byPhone = new Map(matches.map((item) => [item.phone, item]));
      setUploads(
        parsed.contacts.map((item) => {
          const old = byPhone.get(item.phone);
          const status = old?.status || "미분류";
          return {
            ...item,
            contactId: old?.id,
            status,
            historyCount: old?.historyCount || 0,
            lastSentAt: old?.lastSentAt,
            decision: status === "수신거부" ? "excluded" : "pending",
            draftMessage: generateMessage(item.channel),
          };
        }),
      );
      setUploadStats(parsed.stats);
      setConfirmIndex(0);
    } catch (err: any) {
      setUploads([]);
      setUploadStats(null);
      setError(err.message);
    }
  };
  const current = uploads[confirmIndex];
  const counts = useMemo(
    () => ({
      approved: uploads.filter((i) => i.decision === "approved").length,
      excluded: uploads.filter((i) => i.decision === "excluded").length,
      pending: uploads.filter((i) => i.decision === "pending").length,
    }),
    [uploads],
  );
  const schedulePreview = useMemo(() => {
    const { startsAt, endsAt } = koreaScheduleRange(startTime, endTime);
    const durationSeconds = Math.floor(
      (endsAt.getTime() - startsAt.getTime()) / 1000,
    );
    if (counts.approved < 1 || durationSeconds <= 0) return null;
    const averageSeconds = Math.floor(durationSeconds / counts.approved);
    return {
      startsAt,
      endsAt,
      averageSeconds,
      firstFrom: new Date(startsAt.getTime() + averageSeconds * 100),
      firstTo: new Date(startsAt.getTime() + averageSeconds * 900),
      lastFrom: new Date(endsAt.getTime() - averageSeconds * 900),
      lastTo: new Date(endsAt.getTime() - averageSeconds * 100),
    };
  }, [counts.approved, startTime, endTime]);
  const updateCurrent = (patch: Partial<UploadContact>) =>
    setUploads((all) =>
      all.map((item, index) =>
        index === confirmIndex ? { ...item, ...patch } : item,
      ),
    );
  const advance = () => {
    const next = uploads.findIndex(
      (item, index) => index > confirmIndex && item.decision === "pending",
    );
    const first = uploads.findIndex((item) => item.decision === "pending");
    setConfirmIndex(
      next >= 0
        ? next
        : first >= 0
          ? first
          : Math.min(confirmIndex + 1, uploads.length - 1),
    );
  };
  const approve = () => {
    if (!current?.draftMessage.trim() || current.status === "수신거부") return;
    updateCurrent({ decision: "approved", finalMessage: current.draftMessage });
    window.setTimeout(advance, 0);
  };
  const confirmKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key === "Enter" &&
      !(event.target instanceof HTMLTextAreaElement) &&
      !(event.target instanceof HTMLInputElement) &&
      !(event.target instanceof HTMLSelectElement)
    ) {
      event.preventDefault();
      approve();
    }
  };
  const queueConfirmed = async () => {
    setBulkLoading(true);
    setError("");
    try {
      const { startsAt, endsAt } = koreaScheduleRange(startTime, endTime);
      if (startsAt <= new Date() || endsAt <= startsAt)
        throw new Error(
          "발송 시작은 현재 이후, 종료는 시작 이후로 설정해주세요.",
        );
      const items = uploads
        .filter((item) => item.decision === "approved")
        .map(({ companyName, phone, channel, finalMessage }) => ({
          companyName,
          phone,
          channel,
          finalMessage,
        }));
      const data = await api("/api/crm/sms/queue", {
        method: "POST",
        body: JSON.stringify({
          deviceId,
          items,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        }),
      });
      setBatchId(data.batchId);
      setBatchCounts({
        queued: data.queued,
        processing: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
      });
      setBatchPaused(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBulkLoading(false);
    }
  };
  const controlBatch = async (
    action: "pause" | "resume" | "cancel-queued",
    targetBatchId = batchId,
    targetEndsAt?: string,
  ) => {
    if (!targetBatchId) return;
    setError("");
    try {
      const resumeEndsAt =
        targetEndsAt ||
        koreaScheduleRange(startTime, endTime).endsAt.toISOString();
      const body =
        action === "resume"
          ? JSON.stringify({ endsAt: resumeEndsAt })
          : undefined;
      await api(`/api/sms/batch/${targetBatchId}/${action}`, {
        method: "POST",
        body,
      });
      const data = await api(`/api/sms/batch/${targetBatchId}/status`);
      if (targetBatchId === batchId) {
        setBatchCounts(data.counts);
        setBatchPaused(data.paused);
      }
      await loadDevices();
    } catch (err: any) {
      setError(
        err.message === "insufficient_remaining_time"
          ? "남은 발송시간이 부족합니다. 발송 종료시각을 변경해주세요."
          : err.message,
      );
    }
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setJobId("");
    setJobStatus(null);
    try {
      const data = await api("/api/sms/send", {
        method: "POST",
        body: JSON.stringify({ deviceId, phone, message }),
      });
      setJobId(data.jobId);
      setJobStatus("queued");
    } catch (err: any) {
      setError(err.message);
    }
  };
  const chosen = devices.find((device) => device.deviceId === deviceId);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-28">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold text-violet-600">
              고객관리 · 영업 문자
            </p>
            <h1 className="text-3xl font-bold text-slate-900">고객 SMS 관리</h1>
            <p className="mt-2 text-slate-500">
              고객 상태와 발송 이력을 확인하고, 모든 문구를 컨펌한 뒤
              발송합니다.
            </p>
          </div>
          {authorized && (
            <Button variant="outline" asChild>
              <a href={`${API_BASE}/api/sms/app/download`}>
                <Download className="mr-2 h-4 w-4" />
                Nana SMS Sender APK
              </a>
            </Button>
          )}
        </div>
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              ["contacts", "고객"],
              ["bulk", "대량등록 / 컨펌"],
              ["history", "발송내역"],
              ["test", "업무폰 / 테스트"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={tab === key ? "default" : "outline"}
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        {tab === "contacts" && (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="업체명 또는 전화번호 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-500">
                    <tr>
                      {[
                        "업체명",
                        "전화번호",
                        "채널",
                        "상태",
                        "최근 발송일",
                        "과거 문자",
                      ].map((h) => (
                        <th className="p-2" key={h}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className="cursor-pointer border-b hover:bg-violet-50"
                        onClick={() => chooseContact(contact)}
                      >
                        <td className="p-2 font-medium">
                          {contact.companyName || "-"}
                        </td>
                        <td className="p-2">{formatPhone(contact.phone)}</td>
                        <td className="p-2">{contact.channel || "-"}</td>
                        <td
                          className="p-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            className="rounded border p-1"
                            value={contact.status}
                            onChange={(e) =>
                              changeStatus(
                                contact,
                                e.target.value as ContactStatus,
                              )
                            }
                          >
                            {statuses.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="whitespace-nowrap p-2 text-xs">
                          {formatKst(contact.lastSentAt)}
                        </td>
                        <td className="p-2">{contact.historyCount}건</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="font-semibold">고객 문자 발송 이력</h2>
              {!selected ? (
                <p className="mt-4 text-sm text-slate-500">
                  고객을 선택하세요.
                </p>
              ) : (
                <>
                  <div className="my-4 rounded-xl bg-slate-50 p-4">
                    <b>{selected.companyName || "업체명 없음"}</b>
                    <p>
                      {formatPhone(selected.phone)} ·{" "}
                      {selected.channel || "채널 없음"}
                    </p>
                    <p className="mt-1 text-sm">상태: {selected.status}</p>
                  </div>
                  <div className="max-h-[600px] space-y-3 overflow-auto">
                    {contactHistory.map((item) => (
                      <div key={item.jobId} className="rounded-xl border p-3">
                        <p className="text-xs text-slate-500">
                          {formatKst(item.sentAt || item.createdAt)} ·{" "}
                          {labels[item.status]}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm">
                          {item.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
        {tab === "bulk" && (
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <FileSpreadsheet className="h-5 w-5" />
              CSV / XLSX 대량등록
            </h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">
              업체명(companyName), 전화번호(phone), 채널(channel) 컬럼을
              읽습니다.
            </p>
            <Input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => uploadFile(e.target.files?.[0])}
            />
            {uploadStats && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["전체", uploadStats.total],
                  ["정상", uploadStats.valid],
                  ["중복 제외", uploadStats.duplicates],
                  ["오류 제외", uploadStats.invalid],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-slate-50 p-3 text-center"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <b className="text-xl">{value}</b>
                  </div>
                ))}
              </div>
            )}
            {current && (
              <div
                className="mt-6 rounded-2xl border-2 border-violet-100 p-5"
                tabIndex={0}
                onKeyDown={confirmKey}
              >
                <div className="mb-4 flex justify-between">
                  <b>
                    {confirmIndex + 1} / {uploads.length}
                  </b>
                  <span
                    className={
                      current.contactId
                        ? "font-semibold text-amber-600"
                        : "text-emerald-600"
                    }
                  >
                    {current.contactId || current.historyCount > 0
                      ? "기존업체"
                      : "신규"}
                  </span>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <b>업체명:</b> {current.companyName || "-"}
                  </p>
                  <p>
                    <b>전화번호:</b> {formatPhone(current.phone)}
                  </p>
                  <p>
                    <b>채널:</b> {current.channel || "-"}
                  </p>
                  <p>
                    <b>상태:</b> {current.status}
                  </p>
                </div>
                {current.historyCount > 0 && (
                  <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                    ⚠ 이전 문자 발송 기록이 있습니다. ({current.historyCount}건)
                    <br />
                    최근 발송: {formatKst(current.lastSentAt)}
                  </div>
                )}
                {current.status === "수신거부" && (
                  <div className="mt-4 rounded-xl bg-red-50 p-3 font-semibold text-red-700">
                    수신거부 고객은 자동 제외되며 Queue에 등록할 수 없습니다.
                  </div>
                )}
                <Label className="mt-4 block" htmlFor="draft">
                  생성 문구 (직접 수정 가능)
                </Label>
                <Textarea
                  id="draft"
                  className="mt-2 min-h-32"
                  value={current.draftMessage}
                  onChange={(e) =>
                    updateCurrent({
                      draftMessage: e.target.value,
                      decision:
                        current.decision === "approved"
                          ? "pending"
                          : current.decision,
                      finalMessage: undefined,
                    })
                  }
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={approve}
                    disabled={current.status === "수신거부"}
                  >
                    OK
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateCurrent({
                        draftMessage: generateMessage(current.channel),
                        decision: "pending",
                        finalMessage: undefined,
                      })
                    }
                  >
                    다시 생성
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("draft")?.focus()}
                  >
                    직접 수정
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      updateCurrent({
                        decision: "excluded",
                        finalMessage: undefined,
                      });
                      window.setTimeout(advance, 0);
                    }}
                  >
                    제외
                  </Button>
                  {current.contactId && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const found = contacts.find(
                          (c) => c.id === current.contactId,
                        );
                        if (found) {
                          chooseContact(found);
                          setTab("contacts");
                        }
                      }}
                    >
                      이전 전체 기록 보기
                    </Button>
                  )}
                </div>
                <div className="mt-4 flex gap-1 overflow-auto">
                  {uploads.map((item, index) => (
                    <button
                      key={`${item.phone}-${index}`}
                      className={`h-2 min-w-5 flex-1 rounded ${item.decision === "approved" ? "bg-emerald-500" : item.decision === "excluded" ? "bg-slate-300" : index === confirmIndex ? "bg-violet-500" : "bg-amber-300"}`}
                      onClick={() => setConfirmIndex(index)}
                      aria-label={`${index + 1}번째 업체`}
                    />
                  ))}
                </div>
              </div>
            )}
            {uploads.length > 0 && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <div className="mb-3 flex flex-wrap gap-5 text-sm">
                  <span>
                    전체 <b>{uploads.length}</b>
                  </span>
                  <span>
                    승인 <b>{counts.approved}</b>
                  </span>
                  <span>
                    제외 <b>{counts.excluded}</b>
                  </span>
                  <span>
                    미확인 <b>{counts.pending}</b>
                  </span>
                </div>
                <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="starts-at">발송 시작 (한국시간)</Label>
                    <Input
                      id="starts-at"
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ends-at">발송 종료 (한국시간)</Label>
                    <Input
                      id="ends-at"
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                    />
                  </div>
                  {schedulePreview && (
                    <div className="space-y-1 text-sm sm:col-span-2">
                      <p>
                        승인 발송건수: <b>{counts.approved}건</b>
                      </p>
                      <p>
                        예상 평균 발송간격:{" "}
                        <b>
                          약 {Math.floor(schedulePreview.averageSeconds / 60)}분{" "}
                          {schedulePreview.averageSeconds % 60}초
                        </b>
                      </p>
                      <p>
                        예상 첫 발송:{" "}
                        {formatKst(schedulePreview.firstFrom.toISOString())} ~{" "}
                        {formatKst(schedulePreview.firstTo.toISOString())}
                      </p>
                      <p>
                        예상 마지막 발송:{" "}
                        {formatKst(schedulePreview.lastFrom.toISOString())} ~{" "}
                        {formatKst(schedulePreview.lastTo.toISOString())}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full"
                  disabled={
                    bulkLoading ||
                    counts.pending > 0 ||
                    counts.approved === 0 ||
                    !chosen?.online
                  }
                  onClick={queueConfirmed}
                >
                  {bulkLoading ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquareText className="mr-2 h-4 w-4" />
                  )}
                  {counts.pending
                    ? `${counts.pending}건 확인 필요`
                    : `${counts.approved}건 Queue 등록`}
                </Button>
              </div>
            )}
            {batchCounts && (
              <div className="mt-4 rounded-xl border p-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {Object.entries(batchCounts).map(([key, value]) => (
                    <div className="rounded border p-2 text-center" key={key}>
                      <small>{labels[key as JobStatus]}</small>
                      <b className="block">{value}</b>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      controlBatch(batchPaused ? "resume" : "pause")
                    }
                    disabled={!batchCounts.queued}
                  >
                    {batchPaused ? "발송 재개" : "발송 일시정지"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => controlBatch("cancel-queued")}
                    disabled={!batchCounts.queued}
                  >
                    대기건 전체 취소
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
        {tab === "history" && (
          <section className="overflow-x-auto rounded-2xl border bg-white p-5 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  {[
                    "업체명",
                    "전화번호",
                    "채널",
                    "예정 발송시각",
                    "실제 발송시각",
                    "간격",
                    "메시지",
                    "상태",
                  ].map((h) => (
                    <th className="p-2" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr className="border-b align-top" key={item.jobId}>
                    <td className="p-2">{item.companyName || "-"}</td>
                    <td className="whitespace-nowrap p-2">
                      {formatPhone(item.phone || "")}
                    </td>
                    <td className="p-2">{item.channel || "-"}</td>
                    <td className="whitespace-nowrap p-2">
                      {formatKst(item.scheduledAt)}
                    </td>
                    <td className="whitespace-nowrap p-2">
                      {formatKst(item.sentAt)}
                    </td>
                    <td className="whitespace-nowrap p-2">
                      {formatInterval(item.sendInterval)}
                    </td>
                    <td className="max-w-xs p-2">
                      <details>
                        <summary className="cursor-pointer truncate">
                          {item.message}
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap">
                          {item.message}
                        </p>
                      </details>
                    </td>
                    <td className="p-2">{labels[item.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {tab === "test" && (
          <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex justify-between">
                <h2 className="flex gap-2 font-semibold">
                  <Smartphone className="h-5 w-5" />
                  연결된 업무폰
                </h2>
                <Button variant="ghost" size="icon" onClick={loadDevices}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {loading ? (
                <p>조회 중...</p>
              ) : (
                devices.map((device) => (
                  <label
                    key={device.deviceId}
                    className={`mb-2 block cursor-pointer rounded-xl border p-3 ${deviceId === device.deviceId ? "border-violet-400 bg-violet-50" : ""}`}
                  >
                    <input
                      className="mr-2"
                      type="radio"
                      checked={deviceId === device.deviceId}
                      onChange={() => setDeviceId(device.deviceId)}
                    />
                    <b>{device.deviceName}</b> ·{" "}
                    <span
                      className={
                        device.online ? "text-emerald-600" : "text-slate-400"
                      }
                    >
                      {device.online ? "온라인" : "오프라인"}
                    </span>
                    <div className="mt-2 text-xs text-slate-500">
                      오늘 발송: {device.todaySent}건 · Queue:{" "}
                      {device.queueCount}건<br />
                      발송시간:{" "}
                      {device.startsAt
                        ? formatKst(device.startsAt)
                        : "-"} ~{" "}
                      {device.endsAt ? formatKst(device.endsAt) : "-"}
                      <br />
                      다음 발송 예정:{" "}
                      {device.nextSendAt
                        ? formatKst(device.nextSendAt).split(" ").pop()
                        : "-"}
                    </div>
                    {device.activeBatchId && (
                      <div
                        className="mt-3 flex flex-wrap gap-2"
                        onClick={(event) => event.preventDefault()}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            controlBatch(
                              device.paused ? "resume" : "pause",
                              device.activeBatchId,
                              device.endsAt,
                            )
                          }
                        >
                          {device.paused ? "발송 재개" : "발송 일시정지"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            controlBatch("cancel-queued", device.activeBatchId)
                          }
                        >
                          대기건 전체 취소
                        </Button>
                      </div>
                    )}
                  </label>
                ))
              )}
            </section>
            <form
              onSubmit={send}
              className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm"
            >
              <div>
                <Label htmlFor="phone">수신 전화번호</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="message">
                  문자 내용 ({message.length}/2000)
                </Label>
                <Textarea
                  id="message"
                  className="mt-2 min-h-36"
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
              <Button
                className="w-full"
                disabled={
                  !chosen?.online ||
                  Boolean(jobStatus && !["sent", "failed"].includes(jobStatus))
                }
              >
                <MessageSquareText className="mr-2 h-4 w-4" />
                문자 보내기
              </Button>
              {jobStatus && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-4 ${jobStatus === "sent" ? "bg-emerald-50" : jobStatus === "failed" ? "bg-red-50" : "bg-blue-50"}`}
                >
                  {jobStatus === "sent" ? (
                    <CheckCircle2 />
                  ) : jobStatus === "failed" ? (
                    <XCircle />
                  ) : (
                    <LoaderCircle className="animate-spin" />
                  )}
                  {labels[jobStatus]}
                </div>
              )}
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
