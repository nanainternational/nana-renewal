import { useCallback, useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { API_BASE } from "@/lib/queryClient";
import { Play, Square, RefreshCw, Server, ShieldCheck, AlertCircle } from "lucide-react";

type Platform = "ably" | "4910" | "zigzag" | "domeggook";
type Job = {
  id: string;
  platform: Platform;
  status: string;
  worker_id: string | null;
  progress: number;
  message: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};
type Worker = {
  worker_id: string;
  worker_name: string;
  version: string;
  current_job: string | null;
  last_seen: string;
  online: boolean;
};
type Event = { id: number; message: string; created_at: string };
const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "ably", label: "에이블리" },
  { id: "4910", label: "4910" },
  { id: "zigzag", label: "지그재그" },
  { id: "domeggook", label: "도매꾹" },
];
const STATUS: Record<string, string> = {
  queued: "대기 중",
  running: "수집 중",
  cancel_requested: "중지 요청 중",
  completed: "완료",
  cancelled: "중지됨",
  failed: "오류",
};
const fmt = (value?: string | null) =>
  value ? new Date(value).toLocaleString("ko-KR") : "-";

async function api(path: string, init?: RequestInit) {
  const response = await fetch(API_BASE + path, {
    ...init,
    credentials: "include",
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errors: Record<string, string> = {
      forbidden: "관리자 계정만 이용할 수 있습니다.",
      forbidden_role: "관리자 권한이 없습니다.",
      db_not_configured: "수집 작업용 데이터베이스가 연결되지 않았습니다.",
      session_secret_not_configured: "서버 로그인 보안 설정(SESSION_SECRET)이 필요합니다.",
      already_queued_or_running: "해당 수집기는 이미 대기 중이거나 실행 중입니다.",
      not_cancellable: "현재 중지할 수 없는 작업입니다.",
    };
    throw new Error(errors[data.error] || "요청 처리에 실패했습니다. (" + response.status + ")");
  }
  return data;
}

export default function AdminCollector() {
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [pairBusy, setPairBusy] = useState(false);

  const reload = useCallback(async () => {
    const data = await api("/api/admin/collector/overview");
    setJobs(data.jobs || []);
    setWorkers(data.workers || []);
  }, []);

  useEffect(() => {
    let active = true;
    api("/api/admin/collector/access")
      .then(() => { if (active) setAccess("allowed"); })
      .catch(() => { if (active) setAccess("denied"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (access !== "allowed") return;
    let mounted = true;
    const fetchOverview = () => reload().catch((e) => { if (mounted) setError(e.message); });
    fetchOverview();
    const timer = setInterval(fetchOverview, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, [access, reload]);

  useEffect(() => {
    if (!selectedId || access !== "allowed") return;
    let active = true;
    const loadEvents = () => api("/api/admin/collector/jobs/" + selectedId + "/events")
      .then((data) => { if (active) setEvents(data.events || []); })
      .catch((e) => { if (active) setError(e.message); });
    loadEvents();
    const timer = setInterval(loadEvents, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [selectedId, access]);

  const run = async (platform: Platform) => {
    setBusy(platform); setError(""); setNotice("");
    try {
      await api("/api/admin/collector/jobs", {
        method: "POST",
        body: JSON.stringify({ platform }),
      });
      setNotice(PLATFORMS.find((p) => p.id === platform)?.label + " 작업을 등록했습니다.");
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const cancel = async (job: Job) => {
    setBusy(job.id); setError(""); setNotice("");
    try {
      await api("/api/admin/collector/jobs/" + job.id + "/cancel", {
        method: "POST",
      });
      setNotice("중지 요청을 전달했습니다. 진행 중인 작업은 수집기에서 안전하게 종료합니다.");
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };


  const issuePairCode = async () => {
    setPairBusy(true);
    setError("");
    setPairCode("");
    try {
      const data = await api("/api/admin/collector/pair-codes", { method: "POST" });
      setPairCode(data.code || "");
      setNotice("연결 코드를 발급했습니다. 10분 안에 수집 PC에서 입력하세요.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPairBusy(false);
    }
  };

  const connected = workers.filter((w) => w.online);
  const activePlatforms = new Set(jobs.filter((j) =>
    ["queued", "running", "cancel_requested"].includes(j.status)
  ).map((j) => j.platform));
  const selected = jobs.find((j) => j.id === selectedId);

  return <div className="min-h-screen bg-slate-50">
    <Navigation />
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-32">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-teal-700">
            <ShieldCheck size={16} /> 관리자 전용
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">통합수집기</h1>
          <p className="mt-3 text-sm text-slate-600">
            홈페이지에서 중앙 수집기의 실행·중지·작업 이력을 관리합니다.
          </p>
        </div>
        <button onClick={() => reload().catch((e) => setError(e.message))}
          disabled={access !== "allowed"}
          className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50">
          <RefreshCw size={16} /> 새로고침
        </button>
      </div>

      {access === "checking" ? <p className="mt-10">관리자 권한 확인 중...</p>
        : access === "denied" ? <div className="mt-8 rounded-xl border bg-white p-8">
            관리자 계정으로 로그인해야 이용할 수 있습니다.
          </div> : <>
          {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{notice}</p>}

          <section className="mt-8 rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Server size={20} /> 중앙 수집기 연결</h2>
              <span className={"rounded-full px-3 py-1 text-xs font-semibold " +
                (connected.length ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>
                {connected.length ? connected.length + "대 연결됨" : "연결된 수집기 없음"}
              </span>
            </div>
            {!connected.length
              ? <p className="mt-3 text-sm text-slate-600">중앙 Windows 수집기가 아직 연결되지 않았습니다. 수집기를 연결한 뒤 웹에서 실행할 수 있습니다.</p>
              : <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {connected.map((w) => <div key={w.worker_id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <strong>{w.worker_name || w.worker_id}</strong>
                    <p className="mt-1 text-xs text-slate-500">에이전트 {w.version} · 최종 연결 {fmt(w.last_seen)}</p>
                  </div>)}
                </div>}
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold">수집 PC 간편 연결</h3>
              <p className="mt-2 text-sm text-slate-600">
                Render 비밀키 설정 없이 연결할 수 있습니다. 기존 통합수집기가 있는 PC에서 한 번만 진행하세요. 다운로드되는 파일은 Python 실행파일(.py)이며 EXE가 아닙니다.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button onClick={issuePairCode} disabled={pairBusy}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {pairBusy ? "발급 중..." : "10분 유효 연결 코드 발급"}
                </button>
                <a className="text-sm text-teal-700 underline"
                   href={`${API_BASE}/api/admin/collector/agent/download`}
                   target="_blank" rel="noreferrer">
                  PC 연결 프로그램 다운로드 (.py)
                </a>
              </div>
              {pairCode && <div className="mt-4 rounded-lg border border-teal-200 bg-white p-4">
                <p className="text-xs text-slate-500">10분간 1회 사용 가능 · 관리자 전용</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <code className="select-all text-xl font-bold tracking-wider text-slate-900">{pairCode}</code>
                  <button onClick={() => navigator.clipboard?.writeText(pairCode)}
                    className="rounded-md border px-3 py-1 text-sm">코드 복사</button>
                </div>
              </div>}
              <p className="mt-4 text-sm text-slate-700">
                ① 연결 프로그램을 기존 수집기 Python 파일과 같은 폴더에 저장
                <span className="mx-2">→</span>
                ② 해당 폴더에서 <code className="rounded bg-white px-2 py-1">python collector_web_agent.py</code> 실행
                <span className="mx-2">→</span>
                ③ 위 연결 코드 입력
              </p>
              <p className="mt-2 text-xs text-slate-500">
                최초 연결 후 인증정보는 해당 PC의 사용자 프로필에 저장되어 다음부터 코드를 다시 입력하지 않습니다.
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-xl border bg-white p-5">
            <h2 className="text-lg font-bold">플랫폼별 수집 실행</h2>
            <p className="mt-2 text-sm text-slate-600">
              중앙 수집기에 저장된 URL·키워드·Google 시트 설정을 사용합니다.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PLATFORMS.map((p) => {
                const active = activePlatforms.has(p.id);
                return <div key={p.id} className="rounded-xl border p-4">
                  <h3 className="font-semibold">{p.label}</h3>
                  <p className="mt-2 text-xs text-slate-500">{active ? "대기·수집 작업 존재" : "작업 없음"}</p>
                  <button onClick={() => run(p.id)}
                    disabled={!connected.length || active || Boolean(busy)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
                    <Play size={15} /> {busy === p.id ? "요청 중..." : active ? "진행 중" : "수집 시작"}
                  </button>
                </div>;
              })}
            </div>
          </section>

          <section className="mt-6 rounded-xl border bg-white p-5">
            <h2 className="text-lg font-bold">최근 작업</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[710px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-600">
                  <tr><th className="p-3">플랫폼</th><th className="p-3">상태</th>
                    <th className="p-3">최신 메시지</th><th className="p-3">시작 요청</th>
                    <th className="p-3">상세</th><th className="p-3">중지</th></tr>
                </thead>
                <tbody>
                  {jobs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">등록된 작업이 없습니다.</td></tr>}
                  {jobs.map((job) => <tr key={job.id} className="border-b">
                    <td className="p-3 font-medium">{PLATFORMS.find((p) => p.id === job.platform)?.label || job.platform}</td>
                    <td className="p-3">{STATUS[job.status] || job.status}</td>
                    <td className="max-w-xs truncate p-3 text-slate-600" title={job.message}>{job.message || "-"}</td>
                    <td className="whitespace-nowrap p-3 text-xs">{fmt(job.created_at)}</td>
                    <td className="p-3"><button className="text-teal-700 underline" onClick={() => setSelectedId(job.id)}>로그</button></td>
                    <td className="p-3">
                      {["queued", "running"].includes(job.status) && <button
                        onClick={() => cancel(job)} disabled={Boolean(busy)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-red-700 disabled:opacity-50">
                        <Square size={13} /> 중지
                      </button>}
                    </td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </section>

          {selected && <section className="mt-6 rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">수집 로그 · {PLATFORMS.find((p) => p.id === selected.platform)?.label}</h2>
              <button className="text-sm text-slate-500 underline" onClick={() => setSelectedId("")}>닫기</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">작업 번호 {selected.id} · 상태 {STATUS[selected.status] || selected.status}</p>
            <div className="mt-4 max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-6 text-green-200">
              {!events.length ? "기록이 없습니다." : events.map((e) => <div key={e.id}>[{fmt(e.created_at)}] {e.message}</div>)}
            </div>
          </section>}
          <p className="mt-6 flex items-start gap-2 text-xs text-slate-500">
            <AlertCircle size={15} className="shrink-0" />
            브라우저·로그인 유지가 필요한 수집은 중앙 수집기 컴퓨터에서 실행됩니다. 모든 PC에 개별 프로그램을 업데이트할 필요는 없습니다.
          </p>
        </>}
    </main>
  </div>;
}
