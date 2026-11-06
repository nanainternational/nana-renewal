import { useRef, useState } from "react";
import { API_BASE } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import "./logistics-quote.css";

const services = [
  { id: "buying", title: "동대문 사입", detail: "도매처 사입·픽업 요청 · 필요 시 +1,000원" },
  { id: "tag", title: "택갈이", detail: "브랜드 택 교체·부착" },
  { id: "opp", title: "OPP 포장", detail: "개별 비닐 포장·교체" },
  { id: "inspection", title: "상품 검수", detail: "수량·옵션·오염·불량 확인" },
  { id: "steam", title: "스팀 다림질", detail: "출고 전 의류 정리" },
  { id: "barcode", title: "바코드·라벨 부착", detail: "작업 가능 여부와 범위 상담" },
  { id: "insert", title: "사은품·안내문 동봉", detail: "부자재·동봉 작업 상담" },
] as const;
const choices = ["필요", "불필요", "상담 후 결정"] as const;
type Choice = typeof choices[number];
const BASE_PRICE = 3_500;
const BUYING_SURCHARGE = 1_000;
const RETURNS_SURCHARGE = 200;
const formatPrice = (value: number) => `${value.toLocaleString("ko-KR")}원`;

export default function LogisticsQuote() {
  const [selections, setSelections] = useState<Record<string, Choice>>({});
  const [volume, setVolume] = useState("");
  const [notes, setNotes] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const buyingFee = selections.buying === "필요" ? BUYING_SURCHARGE : 0;
  const estimatedPrice = BASE_PRICE + buyingFee;
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [contact, setContact] = useState({ name: "", phone: "", email: "", agreePrivacy: false, hp: "" });
  const [sending, setSending] = useState(false);
  const [mailResult, setMailResult] = useState<{ sent: boolean; saved: boolean; message: string } | null>(null);
  const mailFormRef = useRef<HTMLFormElement>(null);
  const summary = [
    "[나나인터내셔널 3PL 견적 상담]",
    `월 예상 출고량: ${volume || "상담 후 결정"}`,
    ...services.map(service => `${service.title}: ${selections[service.id] || "상담 후 결정"}`),
    `기본 출고: ${formatPrice(BASE_PRICE)}`,
    `동대문 사입 추가: ${formatPrice(buyingFee)}`,
    `예상 견적 비용: ${formatPrice(estimatedPrice)} / 출고 1건 기준`,
    `반품·교환 처리: 별도 건당 ${formatPrice(BASE_PRICE + RETURNS_SURCHARGE)} (일반 출고 견적에 미포함)`,
    "상담 후 결정·단가 미정 항목 및 자재비는 최종 상담 후 확정",
    `추가 요청: ${notes.trim() || "없음"}`,
  ].join("\n");

  async function sendQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || mailResult?.saved) return;
    setSending(true);
    setMailResult(null);
    try {
      const response = await fetch(`${API_BASE}/api/formmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "logistics_quote",
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          phoneConfirm: contact.phone.trim(),
          email: contact.email.trim(),
          agreePrivacy: contact.agreePrivacy,
          hp: contact.hp,
          question: summary,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.message || "견적 문의를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      const sent = data.mail?.adminSent === true;
      setMailResult({ sent, saved: true, message: sent
        ? "견적 문의가 담당자 메일로 발송되었습니다. 입력하신 연락처로 답변드리겠습니다."
        : "견적 문의는 저장되었으나 메일 전달이 지연되고 있습니다. 빠른 상담은 카톡을 이용해 주세요." });
    } catch (error) {
      setMailResult({ sent: false, saved: false, message: error instanceof Error ? error.message : "접수 중 오류가 발생했습니다. 다시 시도해 주세요." });
    } finally {
      setSending(false);
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus("견적 내용을 복사했습니다. 카톡 상담창에 붙여넣어 주세요.");
    } catch {
      setCopyStatus("자동 복사가 안 되면 아래 견적 요청 내용을 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="logi-btn logi-btn-primary">견적보기 <span aria-hidden="true">↗</span></button>
      </DialogTrigger>
      <DialogContent className="logi-quote-dialog notranslate" overlayClassName="logi-quote-overlay" translate="no">
        <div className="logi-quote-heading">
          <span className="logi-quote-eyebrow">3PL 맞춤 견적</span>
          <DialogTitle className="logi-quote-title">필요한 물류 작업을 선택하세요</DialogTitle>
          <DialogDescription className="logi-quote-description">필요한 작업을 선택하면 예상 견적을 바로 확인할 수 있습니다. 메일 또는 카톡으로 상담을 이어가세요.</DialogDescription>
        </div>
        <div className="logi-quote-price">기본 출고 <strong>3,500원</strong><span>기존 안내 기준 · OPP 교체 / 택갈이 / 합배송 추가비 0원</span></div>
        <fieldset className="logi-quote-volume">
          <legend>월 예상 출고량</legend>
          <div className="logi-quote-volume-options">
            {["100건 미만", "100~499건", "500~999건", "1,000건 이상", "상담 후 결정"].map(value => (
              <label key={value}><input type="radio" name="quote-volume" value={value} checked={volume === value} onChange={() => { setVolume(value); setCopyStatus(""); }} /><span>{value}</span></label>
            ))}
          </div>
        </fieldset>
        <div className="logi-quote-services">
          {services.map(service => (
            <fieldset className="logi-quote-service" key={service.id}>
              <legend>{service.title}</legend>
              <p>{service.detail}</p>
              <div className="logi-quote-choices">
                {choices.map(choice => (
                  <label key={choice}>
                    <input type="radio" name={`quote-${service.id}`} value={choice} checked={(selections[service.id] || "상담 후 결정") === choice} onChange={() => { setSelections(previous => ({ ...previous, [service.id]: choice })); setCopyStatus(""); }} />
                    <span>{choice}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <label className="logi-quote-notes">추가 요청사항 <span>(선택)</span>
          <textarea rows={2} maxLength={1500} value={notes} onChange={event => { setNotes(event.target.value); setCopyStatus(""); }} placeholder="예: 여성의류, 보관 수량, 쇼핑몰 연동, 포장 부자재 준비 여부" />
        </label>
        <details className="logi-quote-summary"><summary>견적 요청 내용 확인·직접 복사</summary><textarea aria-label="견적 요청 내용" readOnly value={summary} rows={12} onFocus={event => event.target.select()} /></details>
        {showEmailForm && (
          <form ref={mailFormRef} onSubmit={sendQuote} className="logi-quote-contact">
            <h3>메일 상담 연락처</h3>
            <p>선택한 견적이 나나인터내셔널 담당자 메일로 바로 전달됩니다.</p>
            <div className="logi-quote-contact-fields">
              <label>이름·업체명<input autoFocus required maxLength={100} autoComplete="name" value={contact.name} onChange={event => setContact({ ...contact, name: event.target.value })} /></label>
              <label>연락처<input required type="tel" maxLength={30} autoComplete="tel" value={contact.phone} onChange={event => setContact({ ...contact, phone: event.target.value })} /></label>
              <label>답변받을 이메일<input required type="email" maxLength={254} autoComplete="email" value={contact.email} onChange={event => setContact({ ...contact, email: event.target.value })} /></label>
            </div>
            <label className="logi-quote-consent"><input required type="checkbox" checked={contact.agreePrivacy} onChange={event => setContact({ ...contact, agreePrivacy: event.target.checked })} /><span>견적 상담을 위한 이름·연락처·이메일 수집 및 이용에 동의합니다.</span></label>
            <input className="logi-quote-honeypot" aria-hidden="true" tabIndex={-1} autoComplete="off" value={contact.hp} onChange={event => setContact({ ...contact, hp: event.target.value })} />
          </form>
        )}
        <p className="logi-quote-disclaimer">선택만으로 견적이 접수되지는 않습니다. 상담 후 결정·단가 미정 항목 및 자재비는 최종 상담 후 확정합니다.</p>
        <section className="logi-quote-estimate" aria-label="예상 견적 비용" aria-live="polite" aria-atomic="true">
          <div className="logi-quote-estimate-total"><h3>예상 견적 비용</h3><div><strong>{formatPrice(estimatedPrice)}</strong><span>/ 출고 1건 기준</span></div></div>
          <dl>
            <div><dt>기본 출고</dt><dd>{formatPrice(BASE_PRICE)}</dd></div>
            <div><dt>동대문 사입 {buyingFee ? "추가" : "미포함"}</dt><dd>+{formatPrice(buyingFee)}</dd></div>
          </dl>
          <p>‘필요’로 선택한 동대문 사입 비용만 추가됩니다. 상담 후 결정 및 단가 미정 작업은 포함되지 않습니다.</p>
          <div className="logi-quote-return-price"><span>반품·교환 처리 <small>일반 출고 견적과 별도</small></span><strong>{formatPrice(BASE_PRICE + RETURNS_SURCHARGE)} / 건</strong><p>기본 {formatPrice(BASE_PRICE)} + 처리비 {formatPrice(RETURNS_SURCHARGE)}</p></div>
        </section>
        <div className="logi-quote-footer">
          <button type="button" disabled={sending || Boolean(mailResult?.saved)} onClick={() => { if (!showEmailForm) setShowEmailForm(true); else mailFormRef.current?.requestSubmit(); }}>{sending ? "보내는 중…" : mailResult?.saved ? "접수 완료" : "메일 보내기"}</button>
          <a href="https://pf.kakao.com/_xmXtTs/chat" target="_blank" rel="noopener noreferrer" onClick={() => { void copySummary(); }}>카톡 상담</a>
        </div>
        {mailResult && <p className={`logi-quote-mail-result ${mailResult.sent ? "is-success" : "is-warning"}`} role="status">{mailResult.message}</p>}
        <p className="logi-quote-status" role="status">{copyStatus || (showEmailForm ? "연락처와 동의 항목을 입력한 뒤 메일 보내기를 눌러 주세요." : "메일 보내기를 누르면 상담 연락처를 입력할 수 있습니다. 카톡 상담 시 견적 내용이 복사됩니다.")}</p>
      </DialogContent>
    </Dialog>
  );
}
