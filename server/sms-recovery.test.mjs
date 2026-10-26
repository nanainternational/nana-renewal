import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { build } = require(process.env.SMS_TEST_ESBUILD || "esbuild");
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
registerSmsRoutes(Object.fromEntries(["get", "post", "patch", "delete", "put"].map(method => [method, (path, handler) => routes.set(`${method} ${path}`, handler)])));
async function request(body = {}, authorized = true) {
  let data;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { data = value; return this; } };
  await routes.get("post /api/sms/devices/:deviceId/recover-processing")({ cookies: authorized ? {token:"test"} : {}, body, params: {deviceId:"test-device"} }, res);
  return {status:res.statusCode, data};
}
function database(t, { missing = false, fail = false } = {}) {
  const queries = [];
  let released = false;
  globalThis.smsTestPool = { connect: async () => ({ release() { released = true; }, async query(sql, params) {
    queries.push({sql, params});
    if (sql.includes("with matches")) {
      if (fail) throw new Error("database failure");
      return {rowCount:1, rows:[]};
    }
    if (sql.includes("select device_id")) return {rowCount:missing ? 0 : 1, rows:[]};
    if (sql.includes("as processing")) return {rows:[{processing:0, stale:0, queued:0}]};
    return {rowCount:2, rows:[]};
  } }) };
  t.after(() => delete globalThis.smsTestPool);
  return {queries, get released() { return released; }};
}
test("recovery requires administrator authentication and validates confirmation before database access", async () => {
  assert.equal((await request({}, false)).status, 403);
  assert.equal((await request({mode:"invalid"})).status, 400);
  assert.equal((await request({mode:"close-unconfirmed"})).data.error, "recovery_confirmation_required");
});
test("verified recovery runs in a device-locked transaction without closing uncertain jobs", async t => {
  const db = database(t);
  const result = await request();
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, {ok:true, recovered:1, closed:0, processing:0, stale:0, queued:0});
  assert.equal(db.queries[0].sql, "begin");
  assert.match(db.queries[1].sql, /deleted_at is null for update/);
  assert.ok(db.queries.filter(q=>q.params).every(q=>q.params[0] === "test-device"));
  assert.equal(db.queries.at(-1).sql, "commit");
  assert.equal(db.queries.some(q=>q.sql.includes("set status='failed'")), false);
  assert.equal(db.released, true);
});
test("unconfirmed close requires explicit confirmation and still reconciles verified sends first", async t => {
  const db = database(t);
  const result = await request({mode:"close-unconfirmed", confirm:true});
  assert.equal(result.data.closed, 2);
  const matchedIndex = db.queries.findIndex(q=>q.sql.includes("with matches"));
  const closedIndex = db.queries.findIndex(q=>q.sql.includes("set status='failed'"));
  assert.ok(matchedIndex < closedIndex);
  assert.match(db.queries[closedIndex].sql, /status='processing'/);
  assert.match(db.queries[closedIndex].sql, /600 seconds/);
  assert.match(db.queries[closedIndex].sql, /발송 결과 미확인/);
});
test("deleted or unknown device is rejected and transaction is rolled back", async t => {
  const db = database(t, {missing:true});
  assert.equal((await request()).status, 404);
  assert.equal(db.queries.at(-1).sql, "rollback");
  assert.equal(db.released, true);
});
test("query failure rolls back recovery and releases the connection", async t => {
  const db = database(t, {fail:true});
  await assert.rejects(request(), /database failure/);
  assert.equal(db.queries.at(-1).sql, "rollback");
  assert.equal(db.released, true);
});
