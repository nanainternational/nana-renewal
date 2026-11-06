import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { FileSpreadsheet, RefreshCcw, ShieldCheck, Smartphone, Upload, Download, WandSparkles, History, Save } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAdminAccess } from "@/hooks/useAdminAccess";

type Order = { orderNumber: string; customerName: string; phone: string; productName: string; deliveredAt: string; state: string };
type SavedOrder = Order & { channel: string; sendStatus?: string; scheduledAt?: string; error?: string };
type Device = { deviceId: string; deviceName?: string; name?: string; isOnline?: boolean };
type Analysis = { topic: string; keyPoints: string[]; purpose: string; tone: string; endingStyle: string; fixedFacts: string[] };
type SavedTemplate = { id: string; name: string; template: string; analysis?: Analysis; createdAt?: string };
const DEFAULT_TEMPLATE = "안녕하세요. {{channel}}입니다.\n구매하신 {{productName}}은 잘 받아보셨나요?\n상품에 문제가 있거나 불편한 점이 있으시면 아래 상담 링크로 문의해 주세요.";

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && quoted && text[i + 1] === '"') { value += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) { row.push(value); value = ""; }
    else if ((c === "\r" || c === "\n") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value); if (row.some(x => x.trim())) rows.push(row); row = []; value = "";
    } else value += c;
  }
  row.push(value); if (row.some(x => x.trim())) rows.push(row); return rows;
}
async function parseFile(file: File): Promise<string[][]> {
  if (file.size > 10 * 1024 * 1024) throw new Error("파일 크기는 10MB 이하여야 합니다.");
  if (file.name.toLowerCase().endsWith(".csv")) return parseCsv((await file.text()).replace(/^\uFEFF/, ""));
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("CSV 또는 XLSX 파일을 선택해주세요.");
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const dom = new DOMParser();
  const sharedFile = zip.file("xl/sharedStrings.xml");
  const shared = sharedFile ? Array.from(dom.parseFromString(await sharedFile.async("text"), "application/xml").getElementsByTagName("si")).map(x => x.textContent || "") : [];
  const sheetName = Object.keys(zip.files).filter(x => /^xl\/worksheets\/sheet\d+\.xml$/.test(x)).sort()[0];
  if (!sheetName) throw new Error("엑셀 워크시트를 찾지 못했습니다.");
  const xml = dom.parseFromString(await zip.file(sheetName)!.async("text"), "application/xml");
  return Array.from(xml.getElementsByTagName("row")).map(row => {
    const result: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const col = (cell.getAttribute("r") || "A1").replace(/\d/g, "").split("").reduce((n,c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
      const raw = cell.getElementsByTagName("v")[0]?.textContent || "";
      result[col] = cell.getAttribute("t") === "s" ? shared[Number(raw)] || "" : cell.getElementsByTagName("is")[0]?.textContent || raw;
    }
    return result;
  }).filter(row => row.some(x => String(x || "").trim()));
}
const aliases: Record<keyof Order, string[]> = {
  orderNumber: ["주문번호", "주문id", "주문아이디", "orderno", "ordernumber", "orderid", "주문상세번호"],
  customerName: ["구매자", "구매자명", "수령인", "수취인", "고객명", "이름", "recipient", "customername"],
  phone: ["휴대폰", "휴대폰번호", "수취인연락처", "수령인연락처", "전화번호", "연락처", "phone", "mobile"],
  productName: ["상품명", "주문상품명", "판매상품명", "제품명", "productname", "itemname"],
  deliveredAt: ["배송완료일", "배송완료일시", "배송완료날짜", "수령일", "거래종료일", "deliveredat", "deliverydate"],
  state: ["주문상태", "배송상태", "상태", "orderstatus", "status"],
};
const normalize = (value: string) => value.toLowerCase().replace(/[\s_\-()[\]]/g,"");
function formatDate(value: string): string {
  const v = String(value || "").trim();
  if (!v) return "";
  if (/^\d{5}(?:\.\d+)?$/.test(v)) {
    const d = new Date((Number(v) - 25569) * 86400000);
    return Number.isFinite(d.getTime()) ? d.toISOString().slice(0,10) : "";
  }
  const match = v.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (match) return match[1] + "-" + match[2].padStart(2,"0") + "-" + match[3].padStart(2,"0");
  return "";
}
function extract(rows: string[][]): { orders: Order[]; headers: string[]; mapping: Record<string, number> } {
  const headers = rows[0] || [];
  const mapping: Record<string,number> = {};
  for (const key of Object.keys(aliases)) {
    mapping[key] = headers.findIndex(x => aliases[key as keyof Order].includes(normalize(String(x || ""))));
  }
  if (mapping.orderNumber < 0 || mapping.phone < 0 || mapping.deliveredAt < 0)
    return { orders: [], headers, mapping };
  return { headers, mapping, orders: rows.slice(1).map(row => ({
    orderNumber: String(row[mapping.orderNumber] || "").trim(),
    customerName: String(row[mapping.customerName] || "").trim(),
    phone: String(row[mapping.phone] || "").replace(/\D/g,""),
    productName: String(row[mapping.productName] || "").trim(),
    deliveredAt: formatDate(row[mapping.deliveredAt] || ""),
    state: String(row[mapping.state] || "").trim(),
  })).filter(x => x.orderNumber) };
}
const statusLabels: Record<string, string> = { queued: "예약", processing: "전송 중", sent: "완료", failed: "실패", cancelled: "취소" };
const formatStatus = (value?: string) => statusLabels[value || ""] || "확인 필요";
const fetchJson = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, { credentials:"include", ...init, headers: { "Content-Type":"application/json", ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "요청에 실패했습니다.");
  return body;
};
export default function HappyCallManager() {
  const { isAdmin, checking } = useAdminAccess();
  const [devices,setDevices] = useState<Device[]>([]);
  const [deviceId,setDeviceId] = useState("");
  const [channel,setChannel] = useState("");
  const [link,setLink] = useState("");
  const [days,setDays] = useState("2");
  const [rows,setRows] = useState<string[][]>([]);
  const [columns,setColumns] = useState<Record<string,number>>({});
  const [saved,setSaved] = useState<SavedOrder[]>([]);
  const [agreed,setAgreed] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [template,setTemplate] = useState(DEFAULT_TEMPLATE);
  const [analysis,setAnalysis] = useState<Analysis | null>(null);
  const [templates,setTemplates] = useState<SavedTemplate[]>([]);
  const [drafts,setDrafts] = useState<Record<number,string>>({});
  const [reviewIndex,setReviewIndex] = useState(0);
  const [analyzing,setAnalyzing] = useState(false);
  const [generating,setGenerating] = useState(false);
  const [generationProgress,setGenerationProgress] = useState({ done:0, total:0 });
  const [saving,setSaving] = useState(false);
  const keys = Object.keys(aliases) as (keyof Order)[];
  const parsed = useMemo(() => {
    if (!rows.length) return [] as Order[];
    const mapped = [rows[0], ...rows.slice(1)];
    for (const key of keys) {
      const index = columns[key];
      mapped[0] = mapped[0].slice();
      if (index >= 0 && rows[0][index] !== undefined) mapped[0][index] = key;
    }
    return rows.slice(1).map(row => ({
      orderNumber: String(row[columns.orderNumber] || "").trim(),
      customerName: String(row[columns.customerName] || "").trim(),
      phone: String(row[columns.phone] || "").replace(/\D/g,""),
      productName: String(row[columns.productName] || "").trim(),
      deliveredAt: formatDate(row[columns.deliveredAt] || ""),
      state: String(row[columns.state] || "").trim(),
    })).filter(x => x.orderNumber);
  },[rows,columns]);
  const valid = parsed.filter(x => /^01\d{8,9}$/.test(x.phone) && x.deliveredAt && !["취소","반품","cancelled","returned"].includes(x.state.toLowerCase()));
  const loadTemplates = useCallback(async () => {
    try {
      const d = await fetchJson("/api/crm/sms/templates");
      setTemplates((d.templates || []).filter((t: SavedTemplate) => t.name?.startsWith("해피콜 ·")));
    } catch (e: any) { setError(e.message); }
  },[]);
  const saveTemplate = async () => {
    if (!template.trim()) return;
    setSaving(true); setError("");
    try {
      await fetchJson("/api/crm/sms/templates", { method:"POST",body:JSON.stringify({
        name:"해피콜 · " + (channel.trim() || "기본문구"), template, analysis,
        adEnabled:false,advertiserName:"",optOutEnabled:false,optOutNumber:"",
      }) });
      setNotice("작성 문구를 저장했습니다."); await loadTemplates();
    } catch (e:any) { setError(e.message); } finally { setSaving(false); }
  };
  const analyze = async () => {
    if (!template.trim()) return;
    setAnalyzing(true); setError("");
    try {
      const d = await fetchJson("/api/happycall/ai/analyze", {method:"POST",body:JSON.stringify({template})});
      setAnalysis(d.analysis); setDrafts({}); setNotice("문구 분석 완료. 대상별 생성 버튼을 누르세요.");
    } catch (e:any) { setError(e.message); } finally { setAnalyzing(false); }
  };
  const generateAll = async () => {
    if (!analysis || !parsed.length) return;
    const targets = parsed.map((item,index)=>({item,index})).filter(({item}) =>
      /^01\d{8,9}$/.test(item.phone) && Boolean(item.deliveredAt) &&
      !["취소","반품","cancelled","returned"].includes(item.state.toLowerCase()));
    if (!targets.length) { setError("AI 생성 대상이 없습니다."); return; }
    if (!window.confirm("유효한 " + targets.length + "건의 AI 문구를 각각 생성합니다. 건수에 따라 AI 사용 비용이 발생합니다.")) return;
    setGenerating(true); setError(""); setGenerationProgress({done:0,total:targets.length});
    const generated: Record<number,string> = {};
    let next=0,done=0,failed=0;
    async function worker() {
      while(next<targets.length) {
        const {item,index}=targets[next++];
        try {
          const result=await fetchJson("/api/happycall/ai/generate", {method:"POST",body:JSON.stringify({template,analysis,productName:item.productName})});
          if(result.body) { generated[index]=result.body; setDrafts(x=>({...x,[index]:result.body})); }
          else failed++;
        } catch { failed++; }
        setGenerationProgress({done:++done,total:targets.length});
      }
    }
    try {
      await Promise.all(Array.from({length:Math.min(3,targets.length)},()=>worker()));
      setNotice("AI 생성 완료: " + (targets.length-failed) + "건 · 실패 " + failed + "건 (실패 시 기본 문구 사용).");
    } finally { setGenerating(false); }
  };
  const load = useCallback(async () => {
    try {
      const [d,o] = await Promise.all([fetchJson("/api/sms/devices"),fetchJson("/api/happycall/orders")]);
      setDevices(d.devices || []); setSaved(o.orders || []);
    } catch (e: any) { setError(e.message); }
  },[]);
  useEffect(() => { if (isAdmin) { load(); loadTemplates(); } },[isAdmin,load,loadTemplates]);
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setNotice(""); setError("");
    try {
      const table = await parseFile(file); const found = extract(table);
      setRows(table); setColumns(found.mapping); setDrafts({}); setAnalysis(null); setReviewIndex(0);
      if (found.mapping.orderNumber < 0 || found.mapping.phone < 0 || found.mapping.deliveredAt < 0) {
        setNotice("필수 열을 자동 인식하지 못했습니다. 아래에서 직접 지정해주세요.");
      }
    } catch (e:any) { setError(e.message); setRows([]); }
    event.target.value = "";
  };
  const submit = async () => {
    if (!confirm("적법한 주문 데이터인지 확인했습니까? 등록하면 실제 문자 예약이 생성됩니다.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetchJson("/api/happycall/import", {
        method:"POST",
        body:JSON.stringify({ deviceId, channel, consultationUrl:link, days:Number(days), messageTemplate:template, items:parsed.slice(0,500).map((item,index)=>({...item,messageBody:drafts[index] || template})), confirmPolicy:agreed }),
      });
      setNotice("예약 "+response.registered+"건 · 중복 "+response.duplicate+"건 · 제외 "+response.excluded+"건 · 취소 "+response.cancelled+"건 · 한도 초과 "+response.quotaExcluded+"건");
      await load();
    } catch (e:any) { setError(e.message); } finally { setBusy(false); }
  };
  return <div className="min-h-screen bg-slate-50">
    <Navigation />
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-32">
      <p className="text-sm text-teal-700">나나 고객관리 기반 · 관리자 시범운영</p>
      <h1 className="mt-2 text-3xl font-bold">해피콜 자동 고객관리</h1>
      <p className="mt-3 text-sm text-slate-600">기존 무선 갤럭시 APK로 구매 확인 문자를 예약합니다. 일반 판매자에게는 아직 공개되지 않았습니다.</p>
      {!checking && !isAdmin ? <div className="mt-8 rounded-xl bg-white p-8">관리자 계정에서만 사용할 수 있습니다. <Link href="/happy-call" className="text-teal-700 underline">서비스 안내로 돌아가기</Link></div> : checking ? <p className="mt-8">권한 확인 중...</p> : <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a href="/api/sms/app/download" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white"><Download className="h-4 w-4"/> 갤럭시 문자발송 APK 다운로드</a>
        <Link href="/customer-management" className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm font-medium text-teal-800"><History className="h-4 w-4"/> 기존 고객관리·발송 이력</Link>
      </div>
      <p className="mt-3 text-sm text-slate-500">설치 후 문자 권한 및 통신사 이용조건을 확인하세요. 기존 무선 APK를 그대로 사용합니다.</p>
      <section className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-5 text-sm">
        <h2 className="font-bold">발송 시간·수량 제한</h2>
        <p className="mt-2 leading-7">업무폰 1대당 하루 최대 50건 · 월 최대 1,500건 (기존 수동 발송 포함 계산) · 매일 12:00~13:00 발송 금지</p>
        <p className="leading-7">평일 09:00~20:00 · 토요일/일요일 09:00~18:00 · 모두 한국시간 기준 · 한도 도달 시 다음 허용 시간으로 예약</p>
      </section>
      <section className="mt-6 grid gap-5 rounded-xl border bg-white p-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">판매 마켓명<input className="rounded-md border p-3" value={channel} onChange={e=>setChannel(e.target.value)} placeholder="예: 나나드레스" /></label>
        <label className="grid gap-2 text-sm font-medium">업무폰<select className="rounded-md border p-3" value={deviceId} onChange={e=>setDeviceId(e.target.value)}><option value="">기기를 선택하세요</option>{devices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.deviceName || d.name || d.deviceId}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium md:col-span-2">상담 URL (https)<input className="rounded-md border p-3" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://pf.kakao.com/.../chat" /></label>
        <label className="grid gap-2 text-sm font-medium">배송완료 후 발송일<select className="rounded-md border p-3" value={days} onChange={e=>setDays(e.target.value)}>{[1,2,3,5].map(n=><option value={n} key={n}>{n}일 후 (오전 9:30)</option>)}</select></label>
        <div className="flex items-end text-sm text-slate-600"><Smartphone className="mr-2 h-5 w-5"/>USB 연결 없는 기존 APK 사용</div>
      </section>
      <section className="mt-6 rounded-xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">문자 작성 · AI 문구 생성</h2>
          <button type="button" disabled={saving || !template.trim()} onClick={saveTemplate} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm disabled:opacity-50"><Save className="h-4 w-4"/> 문구 저장</button>
        </div>
        <p className="mt-2 text-sm text-slate-500">변수: {{channel}}, {{productName}}, {{customerName}}. 실제 발송 시 마켓명·상품명·고객명으로 바뀌며, 상담 링크는 하단에 자동 삽입됩니다.</p>
        <label className="mt-4 grid gap-2 text-sm font-medium">기준 문자 내용
          <textarea value={template} rows={6} maxLength={2000} onChange={e=>{setTemplate(e.target.value);setAnalysis(null);setDrafts({});}} className="w-full rounded-lg border p-3 font-normal leading-7" />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={analyzing || generating || !template.trim()} onClick={analyze} className="rounded-md border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 disabled:opacity-50">
            {analyzing ? "AI 분석 중..." : "① AI 내용 분석"}
          </button>
          <button type="button" disabled={!analysis || generating || !valid.length} onClick={generateAll} className="inline-flex items-center gap-2 rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <WandSparkles className="h-4 w-4"/>{generating ? "생성 중..." : "② 대상 수만큼 AI 생성"}
          </button>
        </div>
        {analysis && <p className="mt-3 rounded-md bg-teal-50 p-3 text-sm text-teal-900">분석 결과: {analysis.topic} · {analysis.tone} · 핵심 {analysis.keyPoints.join(", ")}</p>}
        {(generating || generationProgress.total > 0) && <p className="mt-2 text-sm">AI 생성 진행: {generationProgress.done}/{generationProgress.total}건</p>}
        <div className="mt-5 border-t pt-4">
          <label className="grid gap-2 text-sm font-medium">이전 저장 문구 불러오기
            <select className="rounded-md border p-3 font-normal" value="" onChange={e=>{
              const t=templates.find(t=>t.id===e.target.value);
              if(t) {setTemplate(t.template);setAnalysis(t.analysis || null);setDrafts({});}
            }}>
              <option value="">저장된 해피콜 문구 선택</option>
              {templates.map(t=><option key={t.id} value={t.id}>{t.name} · {t.createdAt ? new Date(t.createdAt).toLocaleDateString("ko-KR") : ""}</option>)}
            </select>
          </label>
        </div>
        {!!parsed.length && <div className="mt-5 rounded-lg bg-slate-50 p-4">
          <label className="grid gap-2 text-sm font-medium">대상별 문구 확인·수정 (상위 500건)
            <select className="rounded-md border p-2" value={Math.min(reviewIndex,parsed.length-1)} onChange={e=>setReviewIndex(Number(e.target.value))}>
              {parsed.slice(0,500).map((p,i)=><option key={i} value={i}>{i+1}. {p.customerName || p.orderNumber} · {p.productName}</option>)}
            </select>
          </label>
          <textarea className="mt-3 w-full rounded-md border p-3 text-sm leading-7" rows={5} value={drafts[reviewIndex] ?? template} onChange={e=>setDrafts(x=>({...x,[reviewIndex]:e.target.value}))} />
          <p className="mt-2 text-xs text-slate-500">예약 전 초안을 수정할 수 있습니다. 상담 링크는 자동으로 덧붙습니다. AI 문구 생성은 선택한 대상 수만큼 별도 호출되므로 사용량이 발생할 수 있습니다.</p>
        </div>}
      </section>
      <section className="mt-6 rounded-xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold"><FileSpreadsheet/> 주문 엑셀 업로드</h2>
          <label className="cursor-pointer rounded-md bg-teal-800 px-4 py-3 text-sm font-semibold text-white"><Upload className="mr-2 inline h-4 w-4"/> CSV / XLSX 선택<input type="file" accept=".csv,.xlsx" className="hidden" onChange={onFile}/></label>
        </div>
        <p className="mt-3 text-sm text-slate-500">주문번호·연락처·배송완료일 필수. 같은 주문번호를 다시 업로드해도 중복발송되지 않습니다. 한 번에 최대 500건.</p>
        {rows.length > 0 && <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {keys.map(key=><label className="grid gap-1 text-xs" key={key}><span>{({orderNumber:"주문번호 *",customerName:"고객명",phone:"연락처 *",productName:"상품명",deliveredAt:"배송완료일 *",state:"주문상태"})[key]}</span>
              <select className="rounded-md border p-2" value={columns[key] ?? -1} onChange={e=>setColumns(x=>({...x,[key]:Number(e.target.value)}))}>
                <option value={-1}>선택 안 함</option>{rows[0].map((heading,i)=><option value={i} key={i}>{heading || "열 "+(i+1)}</option>)}
              </select></label>)}
          </div>
          <p className="text-sm font-medium">분석: 전체 {parsed.length}건 · 기본 유효 {valid.length}건 · 확인 필요 {parsed.length-valid.length}건</p>
          <div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b text-slate-500"><th className="p-2">주문번호</th><th className="p-2">고객</th><th className="p-2">전화번호</th><th className="p-2">상품</th><th className="p-2">배송완료일</th></tr></thead><tbody>{parsed.slice(0,10).map((o,i)=><tr key={i} className="border-b"><td className="p-2">{o.orderNumber}</td><td className="p-2">{o.customerName}</td><td className="p-2">{o.phone}</td><td className="p-2">{o.productName}</td><td className="p-2">{o.deliveredAt || "날짜 확인"}</td></tr>)}</tbody></table></div>
        </div>}
        <label className="mt-6 flex items-start gap-3 text-sm"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} className="mt-1"/> <span>해당 판매채널의 구매자 외부 연락 정책을 확인했으며, 고객정보를 해피콜 발송에 사용할 적법한 권한이 있습니다. 신상품·할인 홍보는 포함하지 않습니다.</span></label>
        <button onClick={submit} disabled={busy || !agreed || !deviceId || !channel.trim() || !/^https:\/\//.test(link) || !valid.length || parsed.length>500 || columns.orderNumber<0 || columns.phone<0 || columns.deliveredAt<0} className="mt-5 rounded-lg bg-teal-800 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? "예약 등록 중..." : "중복·제외 검사 후 해피콜 예약"}</button>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        {notice && <p className="mt-4 text-sm text-teal-800">{notice}</p>}
      </section>
      <section className="mt-6 rounded-xl border bg-white p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">최근 주문·발송 현황</h2><button onClick={load} className="inline-flex items-center gap-2 text-sm text-teal-800"><RefreshCcw className="h-4 w-4"/> 새로고침</button></div>
        <div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">마켓</th><th className="p-2">주문번호</th><th className="p-2">고객</th><th className="p-2">예정일</th><th className="p-2">상태</th></tr></thead><tbody>{saved.map((o,i)=><tr key={i} className="border-b"><td className="p-2">{o.channel}</td><td className="p-2">{o.orderNumber}</td><td className="p-2">{o.customerName}</td><td className="p-2">{o.scheduledAt ? new Date(o.scheduledAt).toLocaleString("ko-KR") : "-"}</td><td className="p-2">{formatStatus(o.sendStatus)}</td></tr>)}</tbody></table>{!saved.length && <p className="py-8 text-center text-sm text-slate-500">등록된 해피콜 주문이 없습니다.</p>}</div>
      </section>
      <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7">
        <h2 className="flex items-center gap-2 font-bold"><ShieldCheck/> 서비스 이용 전 주의사항</h2>
        <p className="mt-2">본 서비스는 구매상품의 수령·이상 여부 확인과 상담에 한정합니다. 주문정보 이용 목적과 플랫폼의 외부 연락 정책을 확인하세요. 광고·신상품 홍보를 포함하면 광고성 정보 규제가 적용될 수 있습니다. 수신거부·취소·반품과 거래 종료 후 6개월 초과 주문은 발송하지 않아야 합니다. 통신사에 따라 자동문자 발송을 제한할 수 있습니다. 단말기 하루 50건·월 1,500건 제한은 서비스 자체 제한이며 통신사의 허용을 의미하지 않습니다. 점심 12~13시와 주말 18시 이후에는 발송하지 않습니다.</p>
        <p className="mt-2">배송완료일이 없거나 발송 예정시점이 지난 주문은 예약하지 않습니다. 고객 응대는 판매자가 직접 처리해야 합니다.</p>
      </section>
      </>}
    </main><Footer/>
  </div>;
}