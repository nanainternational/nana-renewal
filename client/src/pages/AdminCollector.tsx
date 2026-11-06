import { useCallback, useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { API_BASE } from "@/lib/queryClient";
import { Play, Square, RefreshCw, Server, ShieldCheck, AlertCircle } from "lucide-react";
import { defaultCollectorSettings, validateCollectorSettings, type CollectorSettings } from "../../../shared/collector-settings";

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
  web_settings: boolean;
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

function jobStatus(job: Job) {
  if (["running", "cancel_requested"].includes(job.status)) {
    if (job.message.includes("Google 인증 대기")) return "Google 인증 필요";
    if (job.message.includes("업로드 완료")) return "저장 완료 · 종료 중";
    if (/중복|시트.*업로드|시트 연결/.test(job.message)) return "중복 정리·시트 저장 중";
  }
  return STATUS[job.status] || job.status;
}

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
      invalid_settings: "수집 수량과 실행 옵션을 확인하세요.",
      invalid_collector_url: "선택한 플랫폼의 HTTPS URL을 입력하세요.",
      url_required: "수집할 URL 또는 검색어를 입력하세요.",
      keyword_required: "도매꾹 검색어를 입력하세요. 여러 검색어는 쉼표로 구분합니다.",
      invalid_spreadsheet_id: "Google 시트 ID를 확인하세요.",
      agent_update_required: "PC 연결 프로그램을 최신 버전(0.3.0 이상)으로 업데이트하세요.",
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
  const [editing, setEditing] = useState<Platform>("ably");
  const [settingsReady, setSettingsReady] = useState(false);
  const [settings, setSettings] = useState<Record<Platform, CollectorSettings>>(() =>
    Object.fromEntries(PLATFORMS.map((p) => [p.id, defaultCollectorSettings(p.id)])) as Record<Platform, CollectorSettings>);

  useEffect(() => {
    if (access !== "allowed") return;
    let active = true;
    api("/api/admin/collector/settings").then((data) => {
      if (active) { setSettings((current) => ({ ...current, ...data.settings })); setSettingsReady(true); }
    }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [access]);

  const saveSettings = async (platform: Platform) => {
    let value: CollectorSettings;
    try { value = validateCollectorSettings(platform, settings[platform]); }
    catch { throw new Error("해당 플랫폼의 HTTPS URL·검색어와 수집 수량, Google 시트 ID를 확인하세요."); }
    await api("/api/admin/collector/settings/" + platform, { method: "PUT", body: JSON.stringify(value) });
    return value;
  };

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
      const value = await saveSettings(platform);
      await api("/api/admin/collector/jobs", {
        method: "POST",
        body: JSON.stringify({ platform, settings: value }),
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
  const readyWorkers = connected.filter((w) => w.web_settings);
  const form = settings[editing];
  const update = (patch: Partial<CollectorSettings>) => setSettings((current) => ({ ...current,
    [editing]: { ...current[editing], ...patch } }));
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
            수집 URL과 검색어를 설정하고, 시작·중지와 작업 이력을 관리합니다.
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
                최초 연결 후 PC 프로그램은 트레이에서 대기합니다. URL과 수집 옵션은 이 페이지에서 관리하세요.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button onClick={issuePairCode} disabled={pairBusy}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {pairBusy ? "발급 중..." : "10분 유효 연결 코드 발급"}
                </button>
                <a className="text-sm text-teal-700 underline"
                   href={`${API_BASE}/api/admin/collector/agent/download`}
                   download="collector_web_agent.py">
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
            <h2 className="text-lg font-bold">수집 설정</h2>
            <p className="mt-2 text-sm text-slate-600">시작할 때 입력한 설정을 저장하고 작업에 적용합니다. 진행 중인 작업의 설정은 바뀌지 않습니다.</p>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="설정할 플랫폼">
              {PLATFORMS.map((p) => <button key={p.id} onClick={() => setEditing(p.id)} aria-pressed={editing === p.id}
                className={"rounded-lg border px-4 py-2 text-sm " + (editing === p.id ? "bg-teal-700 text-white" : "bg-white")}>{p.label}</button>)}
            </div>
            <fieldset disabled={!settingsReady || Boolean(busy)} className="mt-5 grid gap-4 sm:grid-cols-2 disabled:opacity-50">
              {editing !== "domeggook" && <label className="text-sm sm:col-span-2">수집할 URL
                <input type="url" value={form.url} onChange={(e) => update({ url: e.target.value })}
                  placeholder={editing === "ably" ? "https://m.a-bly.com/search?keyword=원피스" : editing === "4910" ? "https://4910.kr/..." : "https://zigzag.kr/..."}
                  className="mt-2 w-full rounded-lg border p-3" />
              </label>}
              {(editing === "4910" || editing === "domeggook") && <label className="text-sm">검색어 {editing === "domeggook" ? "(쉼표로 구분)" : "(URL이 없을 때 사용)"}
                <input value={form.keyword} onChange={(e) => update({ keyword: e.target.value })} className="mt-2 w-full rounded-lg border p-3" />
              </label>}
              <label className="text-sm">{editing === "zigzag" ? "스크롤 횟수" : editing === "domeggook" ? "검색어당 페이지 수" : editing === "4910" ? "신규 마켓 목표" : "수집 목표"}
                <input type="number" min={1} max={10000} value={form.limit} onChange={(e) => update({ limit: Number(e.target.value) })}
                  className="mt-2 w-full rounded-lg border p-3" />
              </label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.headless} onChange={(e) => update({ headless: e.target.checked })} />브라우저 창 숨기기</label>
              {editing === "4910" && <>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.autoCategory} onChange={(e) => update({ autoCategory: e.target.checked })} />카테고리 자동 순회</label>
                <label className="text-sm">신규 마켓이 없을 때 전환할 반복 횟수<input type="number" min={1} max={100} value={form.emptyRounds}
                  onChange={(e) => update({ emptyRounds: Number(e.target.value) })} className="mt-2 w-full rounded-lg border p-3" /></label>
              </>}
              {editing === "zigzag" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.thumbnails}
                onChange={(e) => update({ thumbnails: e.target.checked })} />썸네일 수집</label>}
              <label className="text-sm">Google 시트 ID (비우면 PC 기본값)<input value={form.spreadsheetId} onChange={(e) => update({ spreadsheetId: e.target.value })}
                className="mt-2 w-full rounded-lg border p-3" /></label>
              <label className="text-sm">시트 탭 이름 (비우면 PC 기본값)<input value={form.worksheet} onChange={(e) => update({ worksheet: e.target.value })}
                className="mt-2 w-full rounded-lg border p-3" /></label>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button className="rounded-lg border px-4 py-2 text-sm" onClick={async () => {
                  setBusy("save"); setError(""); setNotice("");
                  try { await saveSettings(editing); setNotice("수집 설정을 저장했습니다."); }
                  catch (e: any) { setError(e.message); } finally { setBusy(""); }
                }}>설정 저장</button>
                <button disabled={!readyWorkers.length || activePlatforms.has(editing)} onClick={() => run(editing)}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white disabled:opacity-40">저장하고 수집 시작</button>
              </div>
            </fieldset>
            {!!connected.length && !readyWorkers.length && <p className="mt-3 text-sm text-amber-800">웹 설정을 사용하려면 PC 연결 프로그램을 0.3.0 이상으로 업데이트하세요.</p>}
          </section>

          <section className="mt-6 rounded-xl border bg-white p-5">
            <h2 className="text-lg font-bold">플랫폼별 수집 실행</h2>
            <p className="mt-2 text-sm text-slate-600">
              위에서 입력한 플랫폼별 URL·검색어·수집 옵션으로 실행합니다.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PLATFORMS.map((p) => {
                const active = activePlatforms.has(p.id);
                return <div key={p.id} className="rounded-xl border p-4">
                  <h3 className="font-semibold">{p.label}</h3>
                  <p className="mt-2 text-xs text-slate-500">{active ? "대기·수집 작업 존재" : "작업 없음"}</p>
                  <button onClick={() => run(p.id)}
                    disabled={!readyWorkers.length || !settingsReady || active || Boolean(busy)}
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
                    <td className="p-3">{jobStatus(job)}</td>
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
            <p className="mt-2 text-xs text-slate-500">작업 번호 {selected.id} · 상태 {jobStatus(selected)}</p>
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
