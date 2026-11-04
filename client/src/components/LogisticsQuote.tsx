import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import "./logistics-quote.css";

const services = [
  { id: "buying", title: "동대문 사입", detail: "도매처 사입·픽업 요청" },
  { id: "tag", title: "택갈이", detail: "브랜드 택 교체·부착" },
  { id: "opp", title: "OPP 포장", detail: "개별 비닐 포장·교체" },
  { id: "inspection", title: "상품 검수", detail: "수량·옵션·오염·불량 확인" },
  { id: "steam", title: "스팀 다림질", detail: "출고 전 의류 정리" },
  { id: "barcode", title: "바코드·라벨 부착", detail: "작업 가능 여부와 범위 상담" },
  { id: "insert", title: "사은품·안내문 동봉", detail: "부자재·동봉 작업 상담" },
  { id: "returns", title: "반품·교환 처리", detail: "재검수·재포장·재출고 상담" },
] as const;
const choices = ["필요", "불필요", "상담 후 결정"] as const;
type Choice = typeof choices[number];

export default function LogisticsQuote() {
  const [selections, setSelections] = useState<Record<string, Choice>>({});
  const [volume, setVolume] = useState("");
  const [notes, setNotes] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const summary = [
    "[나나인터내셔널 3PL 견적 상담]",
    `월 예상 출고량: ${volume || "상담 후 결정"}`,
    ...services.map(service => `${service.title}: ${selections[service.id] || "상담 후 결정"}`),
    `추가 요청: ${notes.trim() || "없음"}`,
  ].join("\n");

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus("복사했습니다. 카카오 상담창에 붙여넣어 주세요.");
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
          <DialogDescription className="logi-quote-description">항목마다 하나씩 선택할 수 있습니다. 선택한 내용을 복사해 카카오 상담으로 전달해 주세요.</DialogDescription>
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
        <p className="logi-quote-disclaimer">선택만으로 견적이 접수되지는 않습니다. 사입비·자재비 및 추가 작업의 가능 여부와 최종 금액은 물량·작업 범위 확인 후 안내합니다.</p>
        <div className="logi-quote-footer">
          <button type="button" onClick={copySummary}>견적 내용 복사</button>
          <a href="https://pf.kakao.com/_xmXtTs/chat" target="_blank" rel="noopener noreferrer">카카오 상담 열기 ↗</a>
        </div>
        <p className="logi-quote-status" role="status">{copyStatus || "내용 복사 → 카카오 상담 열기 → 붙여넣기"}</p>
      </DialogContent>
    </Dialog>
  );
}
