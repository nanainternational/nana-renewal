import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Exercise real route handlers with isolated authentication, database and HTTP adapters.
const bundled = await build({
  entryPoints: [fileURLToPath(new URL("./sms-service.ts", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "esm",
  plugins: [{ name: "test-adapters", setup(builder) {
    builder.onResolve({ filter: /^(\.\/credits|\.\/order-system|jsonwebtoken)$/ }, ({ path }) => ({ path, namespace: "test" }));
    builder.onLoad({ filter: /.*/, namespace: "test" }, ({ path }) => ({ contents:
      path === "./credits" ? "export const getPgPool = () => globalThis.smsTestPool;" :
      path === "jsonwebtoken" ? "export default { verify: () => ({email: 'test@example.invalid'}) };" :
      "export const normalizeEmail = x => x; export const syncAdminUserByEmail = async () => {}; export const getAdminUserByEmail = async () => ({is_active:true});",
    }));
  } }],
});
const { registerSmsRoutes } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const routes = new Map();
const app = Object.fromEntries(["get", "post", "patch", "delete", "put"].map(method => [method, (path, handler) => routes.set(`${method} ${path}`, handler)]));
registerSmsRoutes(app);
async function request(path, body = {}, params = {}) {
  let result;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { result = data; return this; } };
  await routes.get(`post ${path}`)({ cookies: { token: "test-only" }, body, params }, res);
  return { status: res.statusCode, data: result };
}

test("분석은 GPT-5, 생성 및 재생성은 mini로 요청하며 사실과 치환·줄바꿈을 보존한다", async (t) => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only-never-sent";
  t.after(() => { if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey; });
  const calls = [];
  const analysis = { topic: "사무실 지원", keyPoints: ["1년 무료"], purpose: "안내", tone: "정중", endingStyle: "답장", fixedFacts: ["1년", "0원", "2,000원"] };
  const template = "{{companyName}} 대표님, {{channel}}에서 보고 연락드립니다. 사무실 임대료 0원(1년), 택배 건당 2,000원을 안내드립니다. 관심 있으시면 답장 부탁드립니다.";
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const payload = JSON.parse(options.body);
    calls.push(payload);
    return { ok: true, json: async () => ({ output: [{ content: [{ type: "output_text", text: JSON.stringify(payload.text.format.name === "sms_template_analysis" ? analysis : { body: template }) }] }] }) };
  });
  const analyzed = await request("/api/crm/sms/analyze-template", { template });
  assert.equal(analyzed.status, 200);
  assert.equal(analyzed.data.model, "gpt-5");
  for (const companyName of ["테스트상점A", "테스트상점B"]) {
    const generated = await request("/api/crm/sms/generate-message", { template, analysis, contact: { companyName, channel: "테스트채널" } });
    assert.equal(generated.status, 200);
    assert.equal(generated.data.model, "gpt-5.4-mini");
    for (const fact of [companyName, "테스트채널", "0원", "1년", "2,000원", "\n"]) assert.ok(generated.data.body.includes(fact));
  }
  assert.equal(calls[0].model, "gpt-5");
  assert.equal(calls[0].reasoning, undefined);
  for (const payload of calls.slice(1)) {
    assert.equal(payload.model, "gpt-5.4-mini");
    assert.deepEqual(payload.reasoning, { effort: "none" });
    assert.equal(payload.text.format.strict, true);
  }
});

test("미래 예약 등록은 선택한 날짜를 중복 검사와 저장·발송 배정에 전달한다", async (t) => {
  const startsAt = new Date(Date.now() + 7 * 86400000);
  const endsAt = new Date(startsAt.getTime() + 3600000);
  const queries = [];
  globalThis.smsTestPool = { connect: async () => ({ release() {}, async query(sql, params) {
    queries.push({ sql, params });
    const rows = sql.startsWith("select 1 from public.sms_devices") ? [{}] :
      sql.startsWith("insert into public.crm_contacts") ? [{ id: "contact", status: "미분류" }] : [];
    return { rows, rowCount: rows.length };
  } }) };
  t.after(() => delete globalThis.smsTestPool);
  const result = await request("/api/crm/sms/queue", { deviceId: "test-device", startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), items: [{ phone: "01000000000", finalMessage: "테스트" }] });
  assert.equal(result.status, 201);
  assert.equal(result.data.queued, 1);
  assert.equal(queries.find(q => q.sql.startsWith("select distinct phone")).params[1].getTime(), startsAt.getTime());
  const batch = queries.find(q => q.sql.startsWith("insert into public.sms_batches"));
  assert.equal(batch.params[2].getTime(), startsAt.getTime());
  assert.equal(batch.params[3].getTime(), endsAt.getTime());
  const job = queries.find(q => q.sql.startsWith("insert into public.sms_jobs"));
  assert.ok(job.params[7] > startsAt && job.params[7] < endsAt);
});

test("미래 예약 재개는 저장된 시작일과 종료일을 유지한다", async (t) => {
  const startsAt = new Date(Date.now() + 7 * 86400000);
  const endsAt = new Date(startsAt.getTime() + 3600000);
  const queries = [];
  globalThis.smsTestPool = { connect: async () => ({ release() {}, async query(sql, params) {
    queries.push({ sql, params });
    const rows = sql.startsWith("select starts_at") ? [{ starts_at: startsAt, ends_at: endsAt, paused_at: new Date() }] :
      sql.startsWith("select job_id") ? [{ job_id: "job" }] : [];
    return { rows, rowCount: rows.length };
  } }) };
  t.after(() => delete globalThis.smsTestPool);
  const result = await request("/api/sms/batch/:batchId/resume", {}, { batchId: "batch" });
  assert.equal(result.status, 200);
  const schedule = queries.find(q => q.sql.startsWith("update public.sms_jobs")).params[0];
  assert.ok(schedule > startsAt && schedule < endsAt);
  assert.equal(queries.find(q => q.sql.startsWith("update public.sms_batches")).params[1].getTime(), endsAt.getTime());
});
