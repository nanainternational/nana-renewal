import { useCallback, useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { FileSpreadsheet, RefreshCw, ShieldCheck, Smartphone, Upload } from "lucide-react";

type Field = "orderNo" | "customerName" | "phone" | "productName" | "completedOn" | "orderState";
type ImportOrder = Record<Field, string>;
type ManagedOrder = ImportOrder & {
  id: string; market: string; jobId?: string | null; smsStatus?: string | null;
  consultState: string; scheduledAt?: string | null;
};
type Device = { deviceId: string; deviceName: string; online: boolean };
const fields: { key: Field; title: string; aliases: string[] }[] = [
  { key: "orderNo", title: "주문번호", aliases: ["주문번호","주문ID","orderid","orderno","상품주문번호","주문상세번호"] },
  { key: "customerName", title: "구매자명", aliases: ["구매자","구매자명","수취인","수령인","받는분","고객명","고객이름","name"] },
  { key: "phone", title: "연락처", aliases: ["휴대폰번호","휴대폰","연락처","수령인연락처","수취인연락처","받는분전화번호","구매자전화번호","phone","mobile","전화번호"] },
  { key: "productName", title: "상품명", aliases: ["상품명","주문상품명","상품","productname","product","품목명"] },
  { key: "completedOn", title: "배송완료일", aliases: ["배송완료일","배송완료날짜","구매확정일","배송완료일시","수령일","거래종료일","deliveredat","completedon"] },
  { key: "orderState", title: "주문상태", aliases: ["주문상태","배송상태","상태","배송진행상태","orderstatus","status"] },
];
const norm = (v: string) => v.replace(/[\s_-]/g,"").toLowerCase();
function guessFields(headers: string[]): Record<Field, number> {
  return Object.fromEntries(fields.map((f) => [f.key, headers.findIndex((h) => f.aliases.map(norm).includes(norm(h)))])) as Record<Field, number>;
}
function csvRows(value: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], part = "", quoted = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"' && quoted && value[i+1] === '"') { part += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { row.push(part); part = ""; }
    else if ((ch === "\r" || ch === "\n") && !quoted) {
      if (ch === "\r" && value[i+1] === "\n") i++;
      row.push(part); if (row.some((c) => c.trim())) rows.push(row);
      row = []; part = "";
    } else part += ch;
  }
  row.push(part); if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}
function columnIndex(ref: string) {
  return ref.replace(/\d/g,"").split("").reduce((s,c)=>s*26+c.charCodeAt(0)-64,0)-1;
}
async function xlsxRows(file: File): Promise<string[][]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const p = new DOMParser();
  const sharedFile = zip.file("xl/sharedStrings.xml");
  const shared = sharedFile ? Array.from(p.parseFromString(await sharedFile.async("text"),"text/xml").getElementsByTagName("si")).map((v)=>v.textContent||"") : [];
  const name = Object.keys(zip.files).filter((v)=>/^xl\/worksheets\/sheet\d+\.xml$/.test(v)).sort()[0];
  if (!name) throw new Error("엑셀 워크시트를 찾을 수 없습니다.");
  const xml = p.parseFromString(await zip.file(name)!.async("text"),"text/xml");
  return Array.from(xml.getElementsByTagName("row")).map((row)=>{
    const cells: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const col = columnIndex(cell.getAttribute("r")||"A1");
      const value = cell.getElementsByTagName("v")[0]?.textContent||"";
      cells[col] = cell.getAttribute("t")==="s" ? shared[Number(value)]||"" : cell.getElementsByTagName("is")[0]?.textContent??value;
    }
    return cells;
  });
}
function dateText(value: string) {
  const s = String(value||"").trim();
  if (/^\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(s)) {
    const p = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/)!;
    return p[1]+"-"+p[2].padStart(2,"0")+"-"+p[3].padStart(2,"0");
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) return new Date((Math.floor(Number(s))-25569)*86400000).toISOString().slice(0,10);
  return "";
}
function dateString(value: unknown) {
  return value ? new Date(String(value)).toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"}) : "-";
}
async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { ...init, credentials:"include", headers:{ "Content-Type":"application/json",...(init?.headers||{}) } });
  const body = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(body.error || "요청 처리 실패");
  return body;
}

export default function HappyCallManager() {
  const { isAdmin, checking } = useAdminAccess();
  const [market,setMarket] = useState("에이블리");
  const [rawRows,setRawRows] = useState<string[][]>([]);
  const [headers,setHeaders] = useState<string[]>([]);
  const [columns,setColumns] = useState<Record<Field,number>>({orderNo:-1,customerName:-1,phone:-1,productName:-1,completedOn:-1,orderState:-1});
  const [storeName,setStoreName] = useState("");
  const [consultUrl,setConsultUrl] = useState("");
  const [delayDays,setDelayDays] = useState(2);
  const [devices,setDevices] = useState<Device[]>([]);
  const [deviceId,setDeviceId] = useState("");
  const [orders,setOrders] = useState<ManagedOrder[]>([]);
  const [page,setPage] = useState(1);
  const [summary,setSummary] = useState({total:0,pending:0,excluded:0,booked:0});
  const [selected,setSelected] = useState<string[]>([]);
  const [policyChecked,setPolicyChecked] = useState(false);
  const [loading,setLoading] = useState(false);
  const [notice,setNotice] = useState("");
  const [issue,setIssue] = useState("");
  const load = useCallback(async (currentPage=1)=>{
    const [data,dev] = await Promise.all([api("/api/happycall/dashboard?page="+currentPage),api("/api/sms/devices")]);
    setOrders(data.orders||[]); setSummary(data.summary||{total:0,pending:0,excluded:0,booked:0});
    setStoreName(data.settings?.storeName||"");setConsultUrl(data.settings?.consultUrl||"");setDelayDays(Number(data.settings?.delayDays)||2);
    setDevices(dev.devices||[]);setDeviceId((prev)=>prev||(dev.devices||[])[0]?.deviceId||"");setSelected([]);setPage(currentPage);
  },[]);
  useEffect(()=>{if(isAdmin)load().catch((e)=>setIssue(e.message));},[isAdmin,load]);
  const parsed=useMemo(()=>{
    return rawRows.slice(1).filter((row)=>row.some((c)=>String(c||"").trim())).map((row)=>{
      const read=(key:Field)=>columns[key]>=0 ? String(row[columns[key]]||"").trim():"";
      return {orderNo:read("orderNo"),customerName:read("customerName"),phone:read("phone"),productName:read("productName"),completedOn:dateText(read("completedOn")),orderState:read("orderState")||"확인필요"};
    });
  },[rawRows,columns]);
  const canImport=columns.orderNo>=0&&columns.phone>=0&&parsed.length>0;
  const ready=orders.filter((o)=>!o.jobId&&o.orderState==="배송완료"&&o.completedOn);
  const handleFile=async (file?:File)=>{
    if(!file)return;setIssue("");setNotice("");
    try{
      if(file.size>10*1024*1024)throw new Error("10MB 이하의 CSV/XLSX를 사용해 주세요.");
      const ext=file.name.split(".").pop()?.toLowerCase();
      const rows=ext==="csv"?csvRows((await file.text()).replace(/^\uFEFF/,"")):ext==="xlsx"?await xlsxRows(file):null;
      if(!rows||rows.length<2)throw new Error("주문 데이터가 있는 CSV/XLSX 파일만 업로드할 수 있습니다.");
      const h=rows[0].map((s)=>String(s||"").trim());
      setRawRows(rows);setHeaders(h);setColumns(guessFields(h));
      setNotice("엑셀을 분석했습니다. 열 매핑과 미리보기를 확인한 뒤 저장해 주세요.");
    }catch(e:any){setIssue(e.message);}
  };
  const saveSettings=async ()=>{
    setLoading(true);setIssue("");setNotice("");
    try{await api("/api/happycall/settings",{method:"PUT",body:JSON.stringify({storeName,consultUrl,delayDays})});setNotice("상담 설정이 저장됐습니다.");}
    catch(e:any){setIssue(e.message);}finally{setLoading(false);}
  };
  const importRows=async ()=>{
    if(!canImport)return;setLoading(true);setIssue("");setNotice("");
    try{
      let created=0,updated=0,invalid=0,cancelled=0;
      for(let start=0;start<parsed.length;start+=500){
        const r=await api("/api/happycall/orders/import",{method:"POST",body:JSON.stringify({market,orders:parsed.slice(start,start+500)})});
        created+=r.created;updated+=r.updated;invalid+=r.invalid;cancelled+=r.cancelled;
      }
      setNotice("등록 "+created+"건 · 갱신 "+updated+"건 · 오류 제외 "+invalid+"건 · 기존 예약 취소 "+cancelled+"건");
      setRawRows([]);await load(1);
    }catch(e:any){setIssue(e.message);}finally{setLoading(false);}
  };
  const reserve=async ()=>{
    if(!selected.length||!policyChecked)return;
    setLoading(true);setIssue("");setNotice("");
    try{
      const r=await api("/api/happycall/orders/queue",{method:"POST",body:JSON.stringify({deviceId,orderIds:selected,confirmPolicy:true})});
      setNotice("해피콜 예약 "+r.queued+"건 · 제외 "+r.excluded+"건. APK가 온라인일 때 예약시각에 발송됩니다.");setPolicyChecked(false);await load(page);
    }catch(e:any){setIssue(e.message);}finally{setLoading(false);}
  };
  const updateConsult=async (id:string,consultState:string)=>{
    try{await api("/api/happycall/orders/"+id+"/consult",{method:"PATCH",body:JSON.stringify({consultState})});setOrders((before)=>before.map((o)=>o.id===id?{...o,consultState}:o));}
    catch(e:any){setIssue(e.message);}
  };
  if(checking)return <><Navigation/><main className="mx-auto max-w-xl px-6 pt-40">관리자 권한 확인 중...</main></>;
  if(!isAdmin)return <><Navigation/><main className="mx-auto max-w-xl px-6 pt-40 text-center"><h1 className="text-2xl font-bold">관리자 전용 해피콜 테스트 화면</h1><p className="my-5 text-slate-600">현재는 내부 관리자만 사용할 수 있습니다. 판매자별 권한 분리는 정식 출시 전에 적용합니다.</p><Link href="/happy-call"><Button variant="outline">서비스 소개로 돌아가기</Button></Link></main></>;
  return <div className="min-h-screen bg-slate-50 text-slate-900"><Navigation/>
    <main className="mx-auto max-w-7xl space-y-8 px-4 pb-24 pt-32 md:px-6">
      <div><p className="text-sm font-semibold text-teal-800">나나 해피콜 · 관리자 테스트</p><h1 className="mt-2 text-3xl font-bold">구매 고객 해피콜 관리</h1><p className="mt-2 text-sm text-slate-600">주문 엑셀 업로드 → 배송완료 확인 → 상담 링크 삽입 → 안전 검증 후 예약발송</p></div>
      {issue&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{issue}</div>}
      {notice&&<div role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">{notice}</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
        ["전체 주문",summary.total],["발송 검토",summary.pending],["취소·반품",summary.excluded],["예약 이력",summary.booked]
      ].map(([label,value])=><div key={label} className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">1. 해피콜 설정</h2>
          <label className="block text-sm font-medium">판매 마켓명<Input className="mt-2" value={storeName} onChange={(e)=>setStoreName(e.target.value)} placeholder="예: 나나드레스"/></label>
          <label className="block text-sm font-medium">고객 상담 링크<Input className="mt-2" value={consultUrl} onChange={(e)=>setConsultUrl(e.target.value)} placeholder="https://pf.kakao.com/.../chat"/></label>
          <div className="flex items-center gap-3"><label className="text-sm font-medium">배송완료 후</label><select className="rounded-md border p-2" value={delayDays} onChange={(e)=>setDelayDays(Number(e.target.value))}>{[1,2,3,4,5].map((v)=><option key={v} value={v}>{v}일 후</option>)}</select><span className="text-xs text-slate-500">오전 11시부터 예약</span></div>
          <div className="flex gap-2"><Button onClick={saveSettings} disabled={loading}>설정 저장</Button><Button variant="outline" onClick={()=>{if(consultUrl.startsWith("https://"))window.open(consultUrl,"_blank","noopener,noreferrer");}}>상담 링크 테스트</Button></div>
        </section>
        <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold"><FileSpreadsheet className="h-5 w-5"/>2. 주문 엑셀 업로드</h2>
          <label className="block text-sm font-medium">판매 채널<select className="mt-2 block w-full rounded-md border p-2" value={market} onChange={(e)=>setMarket(e.target.value)}>{["에이블리","4910","쿠팡","지그재그","자사몰","기타"].map((v)=><option key={v}>{v}</option>)}</select></label>
          <label className="block cursor-pointer rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm"><Upload className="mx-auto mb-2 h-6 w-6"/>CSV 또는 XLSX 업로드<input type="file" accept=".csv,.xlsx" className="sr-only" onChange={(e)=>handleFile(e.target.files?.[0])}/></label>
          <p className="text-xs text-slate-500">상품명·전화번호·주문번호 등을 읽습니다. 원본 데이터와 마켓별 수집·이용 권한을 확인해 주세요.</p>
          {rawRows.length>0&&<div className="space-y-3"><p className="text-sm font-semibold">{parsed.length}건 감지 · 열 연결 확인</p>
            <div className="grid grid-cols-2 gap-3">{fields.map((f)=><label key={f.key} className="text-xs">{f.title}<select className="mt-1 block w-full rounded border p-1.5" value={columns[f.key]} onChange={(e)=>setColumns((old)=>({...old,[f.key]:Number(e.target.value)}))}><option value={-1}>열 없음</option>{headers.map((h,i)=><option key={i} value={i}>{h||"열 "+(i+1)}</option>)}</select></label>)}</div>
            <div className="max-h-36 overflow-auto rounded bg-slate-50 p-2 text-xs">{parsed.slice(0,4).map((o,i)=><p key={i}>{o.orderNo||"(주문번호 없음)"} / {o.customerName} / {o.productName} / {o.completedOn||"(배송일 없음)"}</p>)}</div>
            <Button disabled={!canImport||loading} onClick={importRows}><Upload className="mr-2 h-4 w-4"/>고객 주문 저장</Button>
          </div>}
        </section>
      </div>
      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">3. 발송 및 상담 현황</h2><Button variant="outline" onClick={()=>load(page).catch((e)=>setIssue(e.message))}><RefreshCw className="mr-2 h-4 w-4"/>새로고침</Button></div>
        <div className="flex flex-wrap items-center gap-3"><Smartphone className="h-5 w-5"/><span className="text-sm">발송 업무폰</span><select className="rounded-md border p-2 text-sm" value={deviceId} onChange={(e)=>setDeviceId(e.target.value)}>{devices.map((d)=><option key={d.deviceId} value={d.deviceId}>{d.deviceName||d.deviceId} · {d.online?"온라인":"오프라인"}</option>)}</select></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">선택</th><th className="p-3">채널/주문번호</th><th className="p-3">고객</th><th className="p-3">상품명</th><th className="p-3">배송완료일</th><th className="p-3">주문상태</th><th className="p-3">문자</th><th className="p-3">상담</th></tr></thead><tbody>{orders.map((o)=><tr key={o.id} className="border-b border-slate-100"><td className="p-3"><input type="checkbox" aria-label={o.orderNo+" 예약 선택"} disabled={Boolean(o.jobId)||o.orderState!=="배송완료"||!o.completedOn} checked={selected.includes(o.id)} onChange={(e)=>setSelected((a)=>e.target.checked?[...a,o.id]:a.filter((id)=>id!==o.id))}/></td><td className="p-3">{o.market}<div className="text-xs text-slate-500">{o.orderNo}</div></td><td className="p-3">{o.customerName}<div className="text-xs text-slate-500">{o.phone}</div></td><td className="max-w-[190px] truncate p-3">{o.productName}</td><td className="p-3">{dateString(o.completedOn)}</td><td className="p-3">{o.orderState}</td><td className="p-3">{o.smsStatus||"미예약"}</td><td className="p-3"><select className="rounded border p-1.5" value={o.consultState} onChange={(e)=>updateConsult(o.id,e.target.value)}>{["미상담","상담필요","상담중","상담완료"].map((v)=><option key={v}>{v}</option>)}</select></td></tr>)}</tbody></table>{!orders.length&&<p className="p-6 text-center text-sm text-slate-500">등록된 주문이 없습니다.</p>}</div>
        <div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-600">선택 {selected.length}건 · 현재 페이지 미예약 배송완료 {ready.length}건</p><div className="flex gap-2"><Button variant="outline" disabled={!ready.length} onClick={()=>setSelected(ready.map((o)=>o.id))}>이번 페이지 발송 가능 건 선택</Button><Button variant="outline" disabled={page<=1} onClick={()=>load(page-1)}>이전</Button><Button variant="outline" disabled={orders.length<100} onClick={()=>load(page+1)}>다음</Button></div></div>
        <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" className="mt-1" checked={policyChecked} onChange={(e)=>setPolicyChecked(e.target.checked)}/><span>해당 마켓의 구매자 연락처 이용정책, 해피콜 전송의 적법한 근거, 발송 목적을 확인했습니다. 광고·신상품 홍보가 아닌 수령 확인 및 상담 안내만 발송합니다.</span></label>
        <Button disabled={loading||!deviceId||!selected.length||!policyChecked} onClick={reserve}>선택 {selected.length}건 예약발송</Button>
      </section>
      <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-slate-700"><h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5"/>이용 전 주의사항</h2><p>거래 종료일 기준 6개월 초과·취소·반품·수신거부 주문은 발송에서 제외합니다. 실제 발송 가능한 개인정보 이용권한과 마켓 정책은 판매자가 별도로 확인해야 합니다.</p><p>신상품·할인·재구매 권유 등 광고성 내용을 추가하면 광고 표시, 수신동의 또는 예외조건, 무료 수신거부, 야간발송 제한을 별도로 준수해야 합니다. 본 서비스의 기본 문자는 광고를 포함하지 않습니다.</p><p>휴대폰 회선과 통신사 약관에 따라 자동발송이 제한될 수 있습니다. 월 1,500건은 해피콜 예약 시 같은 단말기에 대해 확인하는 내부 제한이며 통신사 허용을 뜻하지 않습니다.</p><p>현재는 내부 관리자 테스트 기능입니다. 주문정보·연락처가 기존 Render 서버 DB에 저장되고 문자 전달에도 사용됩니다. 판매자 PC만 보관하는 방식과 일반 판매자별 단말기 권한 분리는 아직 적용되지 않았으므로 외부 고객에게 공개하면 안 됩니다.</p></section>
    </main><Footer/>
  </div>;
}
