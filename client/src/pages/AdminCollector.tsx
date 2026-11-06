import { useCallback, useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { API_BASE } from "@/lib/queryClient";
import { Play, Square, RefreshCw, Monitor, ShieldCheck, AlertCircle, ArrowUpRight,
  ChevronDown, Check, CheckCircle2, Loader2, Settings2, Link2, FileSpreadsheet,
  X, Copy, Download, Clock3, SlidersHorizontal, CircleHelp } from "lucide-react";
import { defaultCollectorSettings, validateCollectorSettings, type CollectorSettings } from "../../../shared/collector-settings";
import "./AdminCollector.css";

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
  max_parallel?: number;
  metrics?: { cpu_percent: number; memory_percent: number; memory_used_gb: number; memory_total_gb: number; sampled_at: string } | null;
};
type Event = { id: number; message: string; created_at: string };
const PLATFORMS: { id: Platform; label: string; mark: string; color: string }[] = [
  { id: "ably", label: "에이블리", mark: "A", color: "#ee637d" },
  { id: "4910", label: "4910", mark: "49", color: "#414650" },
  { id: "zigzag", label: "지그재그", mark: "Z", color: "#8064d8" },
  { id: "domeggook", label: "도매꾹", mark: "D", color: "#4d986d" },
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

function WorkerHealth({ worker, jobs }: { worker: Worker; jobs: Job[] }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const metrics = worker.metrics;
  const fresh = worker.online && metrics && now - Date.parse(metrics.sampled_at) < 20000;
  const level = !fresh ? "unknown" : metrics.cpu_percent >= 90 || metrics.memory_percent >= 90 ? "high"
    : metrics.cpu_percent >= 70 || metrics.memory_percent >= 80 ? "moderate" : "good";
  const label = { unknown: worker.online ? "측정 대기" : "연결 끊김", high: "부하 높음", moderate: "주의", good: "원활" }[level];
  const running = jobs.filter((j) => j.worker_id === worker.worker_id && ["running", "cancel_requested"].includes(j.status)).length;
  const capacity = worker.max_parallel || 1;
  return <section className={"collector-health-card health-" + level} aria-label={worker.worker_name + " PC 성능"}>
    <div className="collector-health-heading"><div><Monitor size={16} /><h2>PC 사용 현황</h2></div><span className="collector-health-status"><i />{label}</span></div>
    <p className="collector-health-device">{worker.worker_name || worker.worker_id}<span>{fresh ? "약 5초마다 갱신" : "실시간 수치 없음"}</span></p>
    <div className="collector-health-meters">{[{ name: "CPU", value: metrics?.cpu_percent }, { name: "메모리", value: metrics?.memory_percent }].map((meter) =>
      <div className="collector-health-meter" key={meter.name}><div><strong>{meter.name}</strong><span>{fresh ? meter.value!.toFixed(1) + "%" : "—"}</span></div>
        <div className="collector-resource-bar" role="progressbar" aria-label={meter.name + " 사용률"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={fresh ? meter.value : undefined}><span style={{ width: fresh ? meter.value + "%" : "0%" }} /></div></div>)}</div>
    <div className="collector-health-detail"><span>{fresh ? `${metrics.memory_used_gb.toFixed(1)} / ${metrics.memory_total_gb.toFixed(1)} GB 사용` : "PC 상태 수신을 기다리고 있어요"}</span><strong>{running} / {capacity}개 실행</strong></div>
    <p className="collector-health-advice">{!worker.online ? "PC 연결을 확인해 주세요. 마지막 수치는 표시하지 않습니다." : !fresh ? capacity < 4 ? "병렬 실행·성능 표시는 PC 프로그램 0.4.0 이상이 필요해요." : "측정값이 도착하면 상태바에 표시됩니다." : level === "high" ? "사용량이 높아요. 새 작업을 줄이면 더 안정적으로 실행돼요." : level === "moderate" ? "PC가 바쁘게 작업 중이에요. 추가 실행 시 사용량을 확인해 주세요." : "여유가 있어요. 다른 플랫폼도 함께 실행할 수 있어요."}</p>
    <details className="collector-health-help"><summary>진단 기준</summary><p>PC 전체 사용량 기준: CPU 70%·메모리 80% 미만은 원활, 그 이상은 주의, 둘 중 하나가 90% 이상이면 부하 높음입니다. 수집 외 프로그램도 포함하며, 20초 이상 지난 수치는 숨깁니다.</p></details>
  </section>;
}

function jobStatus(job: Job) {
  if (["running", "cancel_requested"].includes(job.status)) {
    if (job.message?.includes("Google 인증 대기")) return "Google 인증 필요";
    if (job.message?.includes("업로드 완료")) return "저장 완료 · 종료 중";
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
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [savedSettings, setSavedSettings] = useState<Partial<Record<Platform, CollectorSettings>>>({});
  const [eventsLoading, setEventsLoading] = useState(false);
  const [settings, setSettings] = useState<Record<Platform, CollectorSettings>>(() =>
    Object.fromEntries(PLATFORMS.map((p) => [p.id, defaultCollectorSettings(p.id)])) as Record<Platform, CollectorSettings>);

  useEffect(() => {
    if (access !== "allowed") return;
    let active = true;
    api("/api/admin/collector/settings").then((data) => {
      if (active) { setSettings((current) => ({ ...current, ...data.settings })); setSavedSettings(data.settings || {}); setSettingsReady(true); }
    }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [access]);

  const saveSettings = async (platform: Platform) => {
    let value: CollectorSettings;
    try { value = validateCollectorSettings(platform, settings[platform]); }
    catch { throw new Error("해당 플랫폼의 HTTPS URL·검색어와 수집 수량, Google 시트 ID를 확인하세요."); }
    await api("/api/admin/collector/settings/" + platform, { method: "PUT", body: JSON.stringify(value) });
    setSavedSettings((current) => ({ ...current, [platform]: value }));
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
    setEvents([]);
    setEventsLoading(true);
    const loadEvents = () => api("/api/admin/collector/jobs/" + selectedId + "/events")
      .then((data) => { if (active) { setEvents(data.events || []); setEventsLoading(false); } })
      .catch((e) => { if (active) { setError(e.message); setEventsLoading(false); } });
    loadEvents();
    const timer = setInterval(loadEvents, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [selectedId, access]);

  const run = async (platform: Platform) => {
    setBusy(platform); setError(""); setNotice("");
    try {
      const value = await saveSettings(platform);
      const data = await api("/api/admin/collector/jobs", {
        method: "POST",
        body: JSON.stringify({ platform, settings: value }),
      });
      setNotice(PLATFORMS.find((p) => p.id === platform)?.label + " 작업을 등록했습니다.");
      setHistoryFilter("all");
      setShowAllJobs(false);
      setSelectedId(data.job.id);
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
  const platform = PLATFORMS.find((p) => p.id === editing)!;
  const update = (patch: Partial<CollectorSettings>) => {
    setNotice("");
    setSettings((current) => ({ ...current, [editing]: { ...current[editing], ...patch } }));
  };
  const activeJobs = jobs.filter((j) => ["queued", "running", "cancel_requested"].includes(j.status));
  const currentJob = activeJobs.find((j) => j.platform === editing);
  const selected = jobs.find((j) => j.id === selectedId);
  const dirty = settingsReady && JSON.stringify(form) !== JSON.stringify(savedSettings[editing]);
  const blocked = !settingsReady || Boolean(busy);
  const limitLabel = editing === "zigzag" ? "스크롤 횟수" : editing === "domeggook" ? "검색어당 페이지 수" : editing === "4910" ? "신규 마켓 목표" : "수집 목표";
  const unit = editing === "zigzag" ? "회" : editing === "domeggook" ? "페이지" : "건";
  const presets = editing === "zigzag" ? [10, 30, 100] : editing === "domeggook" ? [5, 20, 100] : [100, 500, 1000];
  const filteredJobs = jobs.filter((job) => historyFilter === "all" ||
    (historyFilter === "active" ? ["queued", "running", "cancel_requested"].includes(job.status)
      : historyFilter === "ended" ? ["completed", "cancelled"].includes(job.status) : job.status === "failed"));
  const visibleJobs = showAllJobs ? filteredJobs : filteredJobs.slice(0, 8);
  const dateShort = (value: string) => new Date(value).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const statusClass = (job: Job) => job.status === "completed" ? "success" : job.status === "failed" ? "danger" :
    job.status === "cancelled" ? "neutral" : job.status === "cancel_requested" || job.message?.includes("Google 인증 대기") ? "warning" : "live";
  const openLogs = (id: string) => {
    setEvents([]);
    setHistoryFilter("all");
    if (jobs.findIndex((job) => job.id === id) > 7) setShowAllJobs(true);
    const opening = selectedId !== id;
    setSelectedId(opening ? id : "");
    if (opening) requestAnimationFrame(() => document.getElementById("collector-log-" + id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest",
    }));
  };

  return <div className="collector-page">
    <Navigation />
    <main className="collector-shell">
      <header className="collector-header">
        <div>
          <p className="collector-eyebrow"><span />운영 워크스페이스</p>
          <h1>통합수집기<span className="collector-title-dot">.</span></h1>
          <p className="collector-intro">수집부터 중복 정리, 시트 저장까지 한곳에서.</p>
        </div>
        {access === "allowed" && <div className="collector-header-actions">
          <span className={"collector-connection " + (connected.length ? "is-online" : "is-offline")}>
            <span className="collector-status-dot" />{connected.length ? "수집 PC 연결됨" : "수집 PC 오프라인"}
          </span>
          <button className={"collector-icon-button " + (connectionOpen ? "is-selected" : "")} aria-label="PC 연결 관리"
            aria-expanded={connectionOpen} aria-controls="collector-connection-panel" onClick={() => setConnectionOpen(!connectionOpen)}><Settings2 size={18} /></button>
          <button className="collector-icon-button" aria-label="작업 현황 새로고침" onClick={() => reload().catch((e) => setError(e.message))}><RefreshCw size={17} /></button>
        </div>}
      </header>

      {access === "checking" ? <div className="collector-access-state"><Loader2 className="collector-spin" size={24} /><p>워크스페이스를 준비하고 있습니다.</p></div>
        : access === "denied" ? <div className="collector-access-state"><ShieldCheck size={30} /><h2>관리자 전용 워크스페이스</h2><p>관리자 계정으로 로그인한 뒤 다시 열어주세요.</p></div> : <>
        <div className="collector-notices" aria-live="polite">
          {error && <div role="alert" className="collector-notice is-error"><AlertCircle size={18} /><span>{error}</span><button aria-label="오류 알림 닫기" onClick={() => setError("")}><X size={16} /></button></div>}
          {notice && <div role="status" className="collector-notice"><CheckCircle2 size={18} /><span>{notice}</span><button aria-label="안내 닫기" onClick={() => setNotice("")}><X size={16} /></button></div>}
        </div>

        {connectionOpen && <section className="collector-connection-panel" id="collector-connection-panel" aria-label="PC 연결 설정">
          <div className="collector-panel-heading"><div><span className="collector-small-label">CONNECTION</span><h2>수집 PC 연결 관리</h2><p>PC는 트레이에서 실행하고, 수집은 여기서 관리하세요.</p></div>
            <button className="collector-icon-button" aria-label="PC 연결 관리 닫기" onClick={() => setConnectionOpen(false)}><X size={18} /></button></div>
          <div className="collector-device-list">
            {workers.length ? workers.map((w) => <div className="collector-device" key={w.worker_id}><Monitor size={20} /><div><strong>{w.worker_name || w.worker_id}</strong><span>{w.online ? "연결됨" : "연결 끊김"} · 버전 {w.version} · 마지막 응답 {fmt(w.last_seen)}</span></div><i className={w.online ? "is-online" : ""} /></div>)
              : <p className="collector-muted">아직 연결된 PC가 없습니다. 아래에서 첫 연결을 시작하세요.</p>}
          </div>
          <div className="collector-setup-actions">
            <button className="collector-button secondary" disabled={pairBusy} onClick={issuePairCode}>{pairBusy ? <Loader2 size={16} className="collector-spin" /> : <Link2 size={16} />}{pairBusy ? "코드 발급 중" : "새 연결 코드 발급"}</button>
            <a className="collector-text-button" href={`${API_BASE}/api/admin/collector/agent/download`} download="collector_web_agent.py"><Download size={16} />PC 연결 프로그램 받기</a>
          </div>
          {pairCode && <div className="collector-pair-code"><div><span>10분 동안 한 번만 사용할 수 있어요</span><code>{pairCode}</code></div><button className="collector-icon-button" aria-label="연결 코드 복사" onClick={async () => {
            try { await navigator.clipboard.writeText(pairCode); setNotice("연결 코드를 복사했습니다."); } catch { setError("코드를 선택해 직접 복사해 주세요."); }
          }}><Copy size={19} /></button></div>}
          <details className="collector-setup-help"><summary><CircleHelp size={15} />처음 연결하는 방법<ChevronDown size={15} /></summary><ol><li>연결 프로그램을 기존 통합수집기와 같은 폴더에 저장합니다.</li><li><code>python collector_web_agent.py</code>를 실행한 뒤 연결 코드를 입력합니다.</li><li>연결 후에는 PC의 트레이 아이콘만 켜 두면 됩니다. 인증정보는 PC에 저장됩니다.</li></ol></details>
        </section>}

        <div className="collector-workspace">
          <section className="collector-compose" aria-labelledby="collector-compose-title">
            <div className="collector-card-heading"><div><span className="collector-small-label">NEW COLLECTION</span><h2 id="collector-compose-title">새 수집 시작</h2><p>플랫폼을 고르고 수집할 대상을 입력하세요.</p></div><span className="collector-card-icon"><SlidersHorizontal size={20} /></span></div>
            <div className="collector-platform-tabs" role="tablist" aria-label="수집 플랫폼" onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const current = PLATFORMS.findIndex((p) => p.id === editing);
              const index = event.key === "Home" ? 0 : event.key === "End" ? PLATFORMS.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + PLATFORMS.length) % PLATFORMS.length;
              setEditing(PLATFORMS[index].id); document.getElementById("collector-tab-" + PLATFORMS[index].id)?.focus();
            }}>
              {PLATFORMS.map((p) => <button key={p.id} type="button" role="tab" id={"collector-tab-" + p.id} aria-selected={editing === p.id} aria-controls="collector-platform-panel"
                tabIndex={editing === p.id ? 0 : -1} disabled={Boolean(busy)} onClick={() => { setEditing(p.id); setNotice(""); }} className={editing === p.id ? "is-active" : ""}>
                <span className="collector-platform-mark" style={{ backgroundColor: p.color }}>{p.mark}</span><span>{p.label}</span>{editing === p.id && <Check size={13} className="collector-tab-check" />}
              </button>)}
            </div>

            <div role="tabpanel" id="collector-platform-panel" aria-labelledby={"collector-tab-" + editing}>
              <fieldset className="collector-form" disabled={blocked}>
                {editing !== "domeggook" && <label className="collector-field"><span>수집할 URL <span className="collector-required">{editing === "4910" ? "선택" : "필수"}</span></span>
                  <div className="collector-input-with-icon"><Link2 size={18} /><input type="url" value={form.url} onChange={(e) => update({ url: e.target.value })} autoComplete="off" spellCheck={false}
                    placeholder={editing === "ably" ? "에이블리 검색 · 목록 URL을 붙여 넣으세요" : editing === "4910" ? "4910 검색 · 카테고리 URL을 붙여 넣으세요" : "지그재그 검색 · 목록 URL을 붙여 넣으세요"} /></div>
                  <small>{editing === "4910" ? "URL이 없으면 검색어 또는 카테고리 자동 순회로 수집할 수 있어요." : "수집하려는 검색 결과나 목록 페이지 주소를 사용하세요."}</small>
                </label>}
                {(editing === "4910" || editing === "domeggook") && <label className="collector-field"><span>검색어{editing === "domeggook" && <span className="collector-required">필수</span>}</span>
                  <input value={form.keyword} onChange={(e) => update({ keyword: e.target.value })} placeholder={editing === "domeggook" ? "예: 원피스, 가방, 신발" : "URL 대신 사용할 검색어"} />
                  {editing === "domeggook" && <small>여러 검색어는 쉼표로 구분해 주세요.</small>}</label>}
                <div className="collector-limit-row"><label className="collector-field"><span>{limitLabel}</span><div className="collector-number-input"><input type="number" min={1} max={10000} value={form.limit} onChange={(e) => update({ limit: Number(e.target.value) })} /><span>{unit}</span></div></label>
                  <div className="collector-presets" aria-label={limitLabel + " 빠른 선택"}>{presets.map((n) => <button key={n} type="button" aria-pressed={form.limit === n} className={form.limit === n ? "is-active" : ""} onClick={() => update({ limit: n })}>{n.toLocaleString()}{unit}</button>)}</div>
                </div>
                <label className="collector-toggle-row"><div><strong>브라우저 창 숨기기</strong><span>PC에서 브라우저 창을 띄우지 않고 수집해요.</span></div><span className="collector-switch"><input type="checkbox" checked={form.headless} onChange={(e) => update({ headless: e.target.checked })} /><span /></span></label>
                <details className="collector-advanced"><summary><Settings2 size={16} /><span>세부 옵션 · 시트 저장 위치</span><ChevronDown size={16} /></summary><div className="collector-advanced-content">
                  {editing === "4910" && <><label className="collector-check-row"><input type="checkbox" checked={form.autoCategory} onChange={(e) => update({ autoCategory: e.target.checked })} /><span>카테고리 자동 순회</span></label>
                    <label className="collector-field"><span>신규 마켓이 없을 때 전환할 반복 횟수</span><input type="number" min={1} max={100} value={form.emptyRounds} onChange={(e) => update({ emptyRounds: Number(e.target.value) })} /></label></>}
                  {editing === "zigzag" && <label className="collector-check-row"><input type="checkbox" checked={form.thumbnails} onChange={(e) => update({ thumbnails: e.target.checked })} /><span>상품 썸네일도 수집하기</span></label>}
                  <div className="collector-sheet-fields"><label className="collector-field"><span>Google 시트 ID</span><input value={form.spreadsheetId} onChange={(e) => update({ spreadsheetId: e.target.value })} placeholder="비워 두면 PC 기본 시트" /></label>
                    <label className="collector-field"><span>시트 탭 이름</span><input value={form.worksheet} onChange={(e) => update({ worksheet: e.target.value })} placeholder="비워 두면 기본 탭" /></label></div>
                  <p>별도로 지정하지 않으면 기존 PC의 저장 위치를 그대로 사용합니다.</p>
                </div></details>
              </fieldset>
              <div className="collector-compose-footer"><div className="collector-save-state">{settingsReady ? <><span className={dirty ? "is-dirty" : ""} />{dirty ? "시작하면 현재 설정이 저장돼요" : "저장된 설정을 불러왔어요"}</> : <><Loader2 size={13} className="collector-spin" />설정을 불러오는 중</>}</div>
                <div className="collector-submit-actions"><button className="collector-button secondary" disabled={blocked} onClick={async () => {
                  setBusy("save"); setError(""); setNotice(""); try { await saveSettings(editing); setNotice(platform.label + " 설정을 저장했습니다."); } catch (e: any) { setError(e.message); } finally { setBusy(""); }
                }}>{busy === "save" ? <Loader2 size={15} className="collector-spin" /> : null}설정만 저장</button>
                  <button className="collector-button primary" disabled={blocked || !readyWorkers.length || Boolean(currentJob)} onClick={() => run(editing)}>
                    {busy === editing ? <Loader2 size={16} className="collector-spin" /> : <Play size={15} fill="currentColor" />}{busy === editing ? "요청 중" : currentJob ? "이미 진행 중" : "수집 시작"}<ArrowUpRight size={17} /></button></div>
              </div>
              {!readyWorkers.length && <div className="collector-inline-help"><AlertCircle size={15} /><span>{connected.length ? "웹 설정을 사용할 수 있도록 PC 프로그램을 업데이트해 주세요." : "수집 PC가 연결되면 시작할 수 있어요."}</span><button onClick={() => setConnectionOpen(true)}>PC 연결 관리</button></div>}
            </div>
          </section>

          <aside className="collector-side">
            {workers.map((worker) => <WorkerHealth key={worker.worker_id} worker={worker} jobs={jobs} />)}
            <section className="collector-live-card"><div className="collector-live-heading"><h2>실행 현황</h2><span><i />실시간</span></div>
              {currentJob ? <div className="collector-current-job"><div className="collector-current-title"><span className="collector-platform-mark" style={{ backgroundColor: platform.color }}>{platform.mark}</span><strong>{platform.label}</strong><span className={"collector-badge " + statusClass(currentJob)}>{jobStatus(currentJob)}</span></div>
                <p className="collector-current-message">{currentJob.message || "수집 PC에 작업을 전달하고 있습니다."}</p>
                <div className={"collector-progress " + (!currentJob.progress ? "is-indeterminate" : "")} role="progressbar" aria-label="수집 진행 상태" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentJob.progress || undefined}><span style={currentJob.progress ? { width: Math.min(100, Math.max(0, currentJob.progress)) + "%" } : undefined} /></div>
                <div className="collector-current-meta"><span><Clock3 size={13} />{dateShort(currentJob.started_at || currentJob.created_at)} 시작</span><button onClick={() => openLogs(currentJob.id)}>로그 보기<ArrowUpRight size={13} /></button></div>
                {["queued", "running"].includes(currentJob.status) && <button className="collector-stop-button" disabled={Boolean(busy)} onClick={() => cancel(currentJob)}><Square size={13} />저장 후 중지</button>}
                {currentJob.status === "cancel_requested" && <p className="collector-stop-note">수집된 결과를 저장한 뒤 종료합니다.</p>}
              </div> : <div className="collector-ready-state"><div className="collector-ready-graphic"><span /><Monitor size={29} strokeWidth={1.4} /><i /></div><h3>{readyWorkers.length ? "시작할 준비가 됐어요" : "수집 PC를 확인해 주세요"}</h3><p>{readyWorkers.length ? "왼쪽에서 수집할 대상을 설정하면\n나머지는 수집기가 처리합니다." : workers.length ? "PC의 트레이 수집기가 실행 중인지\n확인해 주세요. 재인증은 필요하지 않을 수 있어요." : "처음 한 번 PC를 연결하면\n이곳에서 모든 수집을 관리할 수 있어요."}</p></div>}
              <div className="collector-storage-summary"><span><FileSpreadsheet size={16} />저장 위치</span><strong>{form.worksheet || (form.spreadsheetId ? "지정한 Google 시트" : "PC 기본 Google 시트")}</strong><p><Check size={13} />중복을 확인한 뒤 신규 데이터만 저장해요.</p></div>
              {activeJobs.some((j) => j.platform !== editing) && <div className="collector-other-jobs"><span>다른 플랫폼 작업</span>{activeJobs.filter((j) => j.platform !== editing).map((j) => <button key={j.id} onClick={() => setEditing(j.platform)}><span>{PLATFORMS.find((p) => p.id === j.platform)?.label}</span><span>{jobStatus(j)}<ArrowUpRight size={13} /></span></button>)}</div>}
            </section>
            <div className="collector-workflow-note"><ShieldCheck size={18} /><div><strong>플랫폼별로 동시에 수집해요.</strong><p>플랫폼마다 1개씩, 최대 4개를 함께 실행합니다.<br />중복 방지를 위해 시트 저장은 순서대로 진행해요.</p></div></div>
          </aside>
        </div>

        <section className="collector-history" aria-labelledby="collector-history-title"><div className="collector-history-heading"><div><span className="collector-small-label">HISTORY</span><h2 id="collector-history-title">작업 기록 <span>{jobs.length}</span></h2></div>
          <div className="collector-history-filters" role="group" aria-label="작업 기록 필터">{[{ id: "all", label: "전체" }, { id: "active", label: "진행 중" }, { id: "ended", label: "종료" }, { id: "failed", label: "오류" }].map((f) => <button key={f.id} aria-pressed={historyFilter === f.id} className={historyFilter === f.id ? "is-active" : ""} onClick={() => { setHistoryFilter(f.id); setShowAllJobs(false); }}>{f.label}</button>)}</div>
        </div>
          {!visibleJobs.length ? <div className="collector-history-empty"><Clock3 size={25} /><h3>{jobs.length ? "해당하는 작업이 없습니다" : "첫 번째 수집을 시작해 보세요"}</h3><p>{jobs.length ? "다른 필터를 선택해 작업을 확인할 수 있어요." : "작업의 진행 과정과 저장 결과가 이곳에 기록됩니다."}</p></div>
            : <div className="collector-job-list">{visibleJobs.map((job) => {
              const p = PLATFORMS.find((item) => item.id === job.platform)!;
              return <article key={job.id} className={"collector-history-item " + (selectedId === job.id ? "is-expanded" : "")}>
                <div className="collector-history-row"><div className="collector-job-identity"><span className="collector-platform-mark" style={{ backgroundColor: p.color }}>{p.mark}</span><div><strong>{p.label}</strong><time dateTime={job.created_at}>{dateShort(job.created_at)}</time></div></div>
                  <span className={"collector-badge " + statusClass(job)}>{jobStatus(job)}</span><p className="collector-job-message">{job.message || "수집 PC에 작업을 전달할 준비를 하고 있어요."}</p>
                  <div className="collector-job-actions">{["queued", "running"].includes(job.status) && <button className="collector-history-stop" disabled={Boolean(busy)} onClick={() => cancel(job)} aria-label={p.label + " 작업 저장 후 중지"}><Square size={12} />중지</button>}
                    <button className="collector-log-button" aria-expanded={selectedId === job.id} aria-controls={"collector-log-" + job.id} onClick={() => openLogs(job.id)}>로그<ChevronDown size={14} /></button></div>
                </div>
                {selectedId === job.id && selected && <div className="collector-log-panel" id={"collector-log-" + job.id}><div className="collector-log-heading"><strong>진행 로그</strong><span>최신순 · 5초마다 갱신</span><button aria-label="진행 로그 닫기" onClick={() => setSelectedId("")}><X size={15} /></button></div>
                  <div className="collector-log-entries">{eventsLoading ? <p className="collector-log-empty">로그를 불러오고 있습니다.</p> : !events.length ? <p className="collector-log-empty">아직 기록된 로그가 없습니다.</p> : events.slice().reverse().map((event) => <div className="collector-log-entry" key={event.id}><time>{new Date(event.created_at).toLocaleTimeString("ko-KR", { hour12: false })}</time><span>{event.message}</span></div>)}</div>
                  <p className="collector-log-id">작업 번호 {job.id}</p>
                </div>}
              </article>;
            })}</div>}
          {filteredJobs.length > 8 && <button className="collector-show-more" onClick={() => setShowAllJobs(!showAllJobs)}>{showAllJobs ? "최근 8개만 보기" : `작업 ${filteredJobs.length - 8}개 더 보기`}<ChevronDown size={15} /></button>}
        </section>
        <footer className="collector-page-footer"><span><ShieldCheck size={13} />관리자 전용 워크스페이스</span><span>PC가 켜져 있고 트레이 수집기가 실행 중이어야 수집할 수 있습니다.</span></footer>
      </>}
    </main>
  </div>;
}
