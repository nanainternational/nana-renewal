import type { Express, Request } from "express";
import jwt from "jsonwebtoken";
import { getAdminUserByEmail, normalizeEmail } from "./order-system";

const analysisSchema = {
  type: "object", additionalProperties: false,
  properties: {
    topic: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    purpose: { type: "string" },
    tone: { type: "string" },
    endingStyle: { type: "string" },
    fixedFacts: { type: "array", items: { type: "string" } },
  },
  required: ["topic", "keyPoints", "purpose", "tone", "endingStyle", "fixedFacts"],
};
const generatedSchema = {
  type: "object", additionalProperties: false,
  properties: { body: { type: "string" } }, required: ["body"],
};
async function checkAdmin(req: Request) {
  try {
    const user = jwt.verify(req.cookies?.token || "", process.env.SESSION_SECRET || "your-secret-key-change-this") as any;
    const email = normalizeEmail(user.email);
    if (!email) return false;
    const admin = await getAdminUserByEmail(email);
    return Boolean(admin?.is_active);
  } catch { return false; }
}
async function openAiText(schemaName: string, schema: object, input: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("AI 키가 설정되지 않았습니다.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.OPENAI_API_KEY },
    body: JSON.stringify({
      model: process.env.SMS_GENERATION_MODEL || "gpt-4.1-mini",
      input,
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
    }),
    signal: AbortSignal.timeout(120000),
  });
  const payload: any = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || "AI 응답 오류");
  const output = payload?.output_text || (payload?.output || []).flatMap((x: any) => x.content || []).find((x: any) => x.type === "output_text")?.text;
  if (!output) throw new Error("빈 AI 응답");
  return JSON.parse(output);
}
export function registerHappyCallAiRoutes(app: Express) {
  app.post("/api/happycall/ai/analyze", async (req, res) => {
    if (!await checkAdmin(req)) return res.status(403).json({ error: "관리자 로그인이 필요합니다." });
    const template = String(req.body?.template || "").trim();
    if (!template || template.length > 2500) return res.status(400).json({ error: "기준 문구는 1~2500자로 입력해주세요." });
    try {
      const analysis = await openAiText("happycall_analysis", analysisSchema, [
        "다음 한국어 구매후 고객 케어 SMS를 분석하라.",
        "핵심 사실과 어조만 추출한다. 주문, 배송, 상품 상태를 임의로 단정하지 않는다.",
        "할인, 신상품, 재구매, 후기 요청 등 광고/리뷰 유도 내용을 추가하지 않는다.",
        "템플릿 변수 {{channel}}, {{productName}}, {{customerName}} 은 그대로 보존하고 개인정보로 보지 않는다.",
        template,
      ].join("\n"));
      return res.json({ analysis });
    } catch (error: any) { return res.status(502).json({ error: error.message || "AI 분석 실패" }); }
  });
  app.post("/api/happycall/ai/generate", async (req, res) => {
    if (!await checkAdmin(req)) return res.status(403).json({ error: "관리자 로그인이 필요합니다." });
    const template = String(req.body?.template || "").trim();
    const analysis = req.body?.analysis || null;
    const product = String(req.body?.productName || "").slice(0, 100);
    const variationIndex = Math.max(0, Math.min(10000,Number(req.body?.variationIndex) || 0));
    if (!template || template.length > 2500 || !analysis || !Array.isArray(analysis.keyPoints)) return res.status(400).json({ error: "문구 분석부터 실행해주세요." });
    try {
      const generated = await openAiText("happycall_message", generatedSchema, [
        "당신은 한국 온라인 쇼핑몰의 구매 후 고객 케어 담당자다.",
        "원문의 핵심 의미, 예의, 상품 수령 및 문제 상담 목적을 보존하면서 자연스럽고 짧게 다른 표현으로 작성한다.",
        "매번 다른 표현을 쓰되 스팸 탐지 우회 목적이 아니며 없는 사실·보장·배송확인·개인정보를 절대 생성하지 않는다.",
        "광고, 신규상품, 쿠폰, 할인, 재구매, 평가/후기/별점 요청은 절대 포함하지 않는다.",
        "상담링크 URL과 연락처는 추가하지 않는다. 상담 URL은 서버가 메시지 하단에 자동 부착한다.",
        "기준 문자에 있는 {{channel}}, {{productName}}, {{customerName}} 변수를 삭제하거나 임의 수정하지 않는다.",
        "문자 본문만 생성한다. 제목, 마크다운, (광고), URL, 이모지는 쓰지 않는다.",
        "상품명은 맥락 이해에만 사용하고 본문에는 {{productName}} 변수를 그대로 사용한다.",
        "기준 문구:\n" + template,
        "AI 분석:\n" + JSON.stringify(analysis),
        "고객이 구매한 상품의 유형:\n" + product,
        "표현 방식 번호: " + variationIndex + ". 번호에 따라 문장 순서, 인사, 질문 표현을 다양하게 바꾸되 원문의 핵심 의미를 반드시 유지한다.",
      ].join("\n\n"));
      const body = String(generated.body || "").trim();
      if (!body || body.length > 1500 || /https?:\/\/|www\.|\(광고\)|무료\s*수신거부|할인|쿠폰|신상품|재구매/.test(body))
        return res.status(422).json({ error: "AI 문구 검증에 실패했습니다. 다시 생성해주세요." });
      return res.json({ body });
    } catch (error: any) { return res.status(502).json({ error: error.message || "AI 생성 실패" }); }
  });
}
