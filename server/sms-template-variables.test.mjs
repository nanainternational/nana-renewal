import assert from "node:assert/strict";
import test from "node:test";
import { finalizeGeneratedMessage } from "./sms-template-variables.ts";

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
