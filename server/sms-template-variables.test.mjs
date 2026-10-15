import assert from "node:assert/strict";
import test from "node:test";
import { applyContactVariables, finalizeGeneratedMessage, formatMobileSms } from "./sms-template-variables.ts";

test("긴 문장은 모바일 너비로 나누며 공백 이외의 원문을 보존한다", () => {
  const original = "인천·부천 온라인 쇼핑몰 사업자 대상 사무실 1년 무료 지원을 접수 중이며, 임대료 0원(1년), 지하 창고 이용·보관, 택배 건당 2,000원 계약, 3PL 물류대행 및 쿠팡 로켓그로스 입고가 가능합니다. 신청 의사 있으시면 답장 부탁드립니다.";
  const result = formatMobileSms(original);
  assert.equal(result.replace(/\s/g, ""), original.replace(/\s/g, ""));
  assert.ok(result.split("\n").every((line) => Array.from(line).length <= 28));
  assert.match(result, /가능합니다\.\n신청/);
});

test("문단과 혜택 목록, 금액, 링크, 전화번호를 보존하고 재적용해도 동일하다", () => {
  const original = "안녕하세요.\r\n\r\n- 임대료 0원 (1년)\r\n- 택배 건당 2,000원\r\n\r\n자세한 내용 https://nanainter.com/customer-management 또는 010-5055-6853으로 문의해주세요.";
  const result = formatMobileSms(original);
  assert.match(result, /안녕하세요\.\n\n- 임대료 0원 \(1년\)\n- 택배 건당 2,000원\n\n/);
  assert.ok(result.includes("https://nanainter.com/customer-management"));
  assert.ok(result.includes("010-5055-6853"));
  assert.equal(formatMobileSms(result), result);
});

test("placeholder 유실로 원본으로 복구하는 경우도 모바일 서식을 적용한다", () => {
  const result = finalizeGeneratedMessage(
    "{{companyName}} 대표님께 사무실 1년 무료 지원과 택배 건당 2,000원 계약을 안내드립니다. 관심 있으시면 답장 부탁드립니다.",
    "대표님 안녕하세요.", { companyName: "테스트상점" },
  );
  assert.match(result, /테스트상점/);
  assert.ok(result.includes("\n"));
  assert.ok(result.includes("2,000원"));
});

test("변수만 치환하는 기능은 사용자가 작성한 줄바꿈을 바꾸지 않는다", () => {
  assert.equal(applyContactVariables("{{companyName}}  대표님\n\n안녕하세요.", { companyName: "상점" }), "상점  대표님\n\n안녕하세요.");
});

test("AI가 업체명 placeholder를 제거하면 원본 템플릿으로 복구해 치환한다", () => {
  const result = finalizeGeneratedMessage(
    "안녕하세요. {{companyName}}대표님. 연락드렸습니다.",
    "안녕하세요. 대표님. 연락드렸습니다.",
    { companyName: "나나인터내셔널" },
  );
  assert.match(result, /나나인터내셔널/);
});

test("AI 결과의 업체명과 채널 placeholder를 실제 고객값으로 확정한다", () => {
  const result = finalizeGeneratedMessage(
    "안녕하세요 {{companyName}} 대표님. {{channel}} 판매페이지를 보고 연락드렸습니다.",
    "{{companyName}} 대표님, {{channel}} 판매페이지 관련해 연락드렸습니다.",
    { companyName: "테스트상점", channel: "에이블리" },
  );
  assert.match(result, /테스트상점/);
  assert.match(result, /에이블리/);
  assert.doesNotMatch(result, /{{companyName}}|{{channel}}/);
});

test("같은 AI 결과도 고객별 값으로 독립적으로 치환한다", () => {
  const template = "안녕하세요 {{companyName}} 대표님. {{channel}} 안내입니다.";
  const generated = "{{channel}}의 {{companyName}} 대표님께 안내드립니다.";
  const first = finalizeGeneratedMessage(template, generated, { companyName: "A업체", channel: "에이블리" });
  const second = finalizeGeneratedMessage(template, generated, { companyName: "B업체", channel: "스마트스토어" });
  assert.match(first, /A업체/);
  assert.doesNotMatch(first, /B업체|스마트스토어/);
  assert.match(second, /B업체/);
  assert.doesNotMatch(second, /A업체|에이블리/);
});
