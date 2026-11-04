import { useState } from "react";
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
  { id: "returns", title: "반품·교환 처리", detail: "반품·교환 처리 · 필요 시 +100원" },
] as const;
const choices = ["필요", "불필요", "상담 후 결정"] as const;
type Choice = typeof choices[number];
const BASE_PRICE = 3_500;
const BUYING_SURCHARGE = 1_000;
const RETURNS_SURCHARGE = 100;
const formatPrice = (value: number) => `${value.toLocaleString("ko-KR")}원`;

export default function LogisticsQuote() {
  const [selections, setSelections] = useState<Record<string, Choice>>({});
  const [volume, setVolume] = useState("");
  const [notes, setNotes] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const buyingFee = selections.buying === "필요" ? BUYING_SURCHARGE : 0;
  const returnsFee = selections.returns === "필요" ? RETURNS_SURCHARGE : 0;
  const estimatedPrice = BASE_PRICE + buyingFee + returnsFee;
  const summary = [
    "[나나인터내셔널 3PL 견적 상담]",
    `월 예상 출고량: ${volume || "상담 후 결정"}`,
    ...services.map(service => `${service.title}: ${selections[service.id] || "상담 후 결정"}`),
    `기본 출고: ${formatPrice(BASE_PRICE)}`,
    `동대문 사입 추가: ${formatPrice(buyingFee)}`,
    `반품·교환 처리 추가: ${formatPrice(returnsFee)}`,
    `예상 견적 비용: ${formatPrice(estimatedPrice)} / 출고 1건 기준`,
    "상담 후 결정·단가 미정 항목 및 자재비는 최종 상담 후 확정",
    `추가 요청: ${notes.trim() || "없음"}`,
  ].join("\n");
  const mailHref = `mailto:nanainternational@naver.com?subject=${encodeURIComponent("[3PL] 맞춤 견적 문의")}&body=${encodeURIComponent(summary)}`;

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
        <p className="logi-quote-disclaimer">선택만으로 견적이 접수되지는 않습니다. 상담 후 결정·단가 미정 항목 및 자재비는 최종 상담 후 확정합니다.</p>
        <section className="logi-quote-estimate" aria-label="예상 견적 비용" aria-live="polite" aria-atomic="true">
          <div className="logi-quote-estimate-total"><h3>예상 견적 비용</h3><div><strong>{formatPrice(estimatedPrice)}</strong><span>/ 출고 1건 기준</span></div></div>
          <dl>
            <div><dt>기본 출고</dt><dd>{formatPrice(BASE_PRICE)}</dd></div>
            <div><dt>동대문 사입 {buyingFee ? "추가" : "미포함"}</dt><dd>+{formatPrice(buyingFee)}</dd></div>
            <div><dt>반품·교환 처리 {returnsFee ? "추가" : "미포함"}</dt><dd>+{formatPrice(returnsFee)}</dd></div>
          </dl>
          <p>‘필요’로 선택한 사입·반품 처리 비용이 합산됩니다. 상담 후 결정 및 단가 미정 작업은 포함되지 않습니다.</p>
        </section>
        <div className="logi-quote-footer">
          <a href={mailHref}>메일 보내기</a>
          <a href="https://pf.kakao.com/_xmXtTs/chat" target="_blank" rel="noopener noreferrer" onClick={() => { void copySummary(); }}>카톡 상담</a>
        </div>
        <p className="logi-quote-status" role="status">{copyStatus || "메일은 견적 내용이 채워진 기본 메일 앱으로 연결됩니다. 카톡 상담 시 견적 내용이 복사됩니다."}</p>
      </DialogContent>
    </Dialog>
  );
}
