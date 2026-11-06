const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('../client/node_modules/typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, file);
const queries = [];
let compatible = true;
let stored;
const pool = {
  async connect() { return { query: this.query.bind(this), release() {} }; },
  async query(sql, params = []) {
    queries.push({ sql, params });
    if (sql.startsWith('SELECT 1 FROM public.collector_workers')) return { rows: compatible ? [{}] : [] };
    if (sql.startsWith('INSERT INTO public.collector_settings')) stored = JSON.parse(params[1]);
    if (sql.startsWith('INSERT INTO public.collector_jobs')) return { rows: [{ id: 'job', settings: JSON.parse(params[2]) }] };
    return { rows: [] };
  }
};
const originalLoad = Module._load;
Module._load = function(name, parent, main) {
  if (name === './credits' && parent.filename.endsWith('collector-service.ts')) return { getPgPool: () => pool };
  return originalLoad.apply(this, arguments);
};
const { registerCollectorRoutes } = require('../server/collector-service.ts');
Module._load = originalLoad;
const { defaultCollectorSettings, validateCollectorSettings } = require('../shared/collector-settings.ts');
const routes = new Map();
let role = 'OWNER';
const app = Object.fromEntries(['get', 'post', 'put'].map(method => [method, (path, handler) => routes.set(method + path, handler)]));
process.env.SESSION_SECRET = 's'.repeat(40);
process.env.COLLECTOR_WORKER_TOKEN = 't'.repeat(40);
registerCollectorRoutes(app, async () => ({ admin: role ? { role } : null, email: 'admin@example.test' }));
const request = (method, path, body = {}, params = {}) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Route timed out')), 2000);
  const req = { body, params, query: {}, method: method.toUpperCase(), header(name) {
    return { origin: 'https://nanainter.com', 'x-collector-worker-token': process.env.COLLECTOR_WORKER_TOKEN }[name];
  }};
  const res = { statusCode: 200, headersSent: false,
    status(code) { this.statusCode = code; return this; },
    json(data) { clearTimeout(timer); this.headersSent = true; resolve({ code: this.statusCode, data }); }
  };
  routes.get(method + path)(req, res);
});
(async () => {
  const valid = { ...defaultCollectorSettings('ably'), url: 'https://m.a-bly.com/search?keyword=dress' };
  for (const url of ['http://m.a-bly.com/', 'https://a-bly.com.evil.test/', 'https://127.0.0.1/', 'https://user:secret@m.a-bly.com/']) {
    assert.throws(() => validateCollectorSettings('ably', { ...valid, url }));
  }
  for (const limit of [0, 10001, 1.2, '10', true]) assert.throws(() => validateCollectorSettings('ably', { ...valid, limit }));
  assert.throws(() => validateCollectorSettings('domeggook', defaultCollectorSettings('domeggook')));
  role = 'VIEWER';
  assert.equal((await request('put', '/api/admin/collector/settings/:platform', valid, { platform: 'ably' })).code, 403);
  assert.equal(queries.length, 0, 'Forbidden users must not reach database');
  role = 'OWNER';
  assert.equal((await request('put', '/api/admin/collector/settings/:platform', { ...valid, command: 'ignored' }, { platform: 'ably' })).code, 200);
  assert.equal(stored.url, valid.url);
  assert.equal(stored.command, undefined);
  assert(queries.some(q => q.sql.includes('collector_settings ENABLE ROW LEVEL SECURITY')));
  assert(queries.some(q => q.sql.includes('collector_settings FROM anon, authenticated')));
  const created = await request('post', '/api/admin/collector/jobs', { platform: 'ably', settings: valid });
  assert.equal(created.code, 201);
  valid.url = 'https://m.a-bly.com/search?keyword=changed';
  assert.notEqual(created.data.job.settings.url, valid.url, 'Queued settings must be a snapshot');
  compatible = false;
  assert.equal((await request('post', '/api/admin/collector/jobs', { platform: 'ably', settings: valid })).data.error, 'agent_update_required');
  assert.equal((await request('post', '/api/admin/collector/jobs', { platform: 'ably' })).code, 400);
  await request('post', '/api/internal/collector/next', { worker_id: 'old-agent' });
  assert.equal(queries.at(-1).params[1], false, 'Old agents cannot claim web-configured jobs');
  await request('post', '/api/internal/collector/next', { worker_id: 'new-agent', web_settings: true });
  assert.equal(queries.at(-1).params[1], true);
  assert(queries.at(-1).sql.includes('j.settings'));
  await request('post', '/api/internal/collector/jobs/:id/report', { worker_id: 'new-agent', status: 'failed', progress: null },
    { id: '01ef4a33-1513-4fd1-9b3c-748871cd1063' });
  const reportUpdate = queries.findLast(q => q.sql.startsWith('UPDATE public.collector_jobs SET '));
  assert.equal(reportUpdate.params[3], null, 'A missing progress value must preserve previous progress, not reset it to zero');
  console.log('Collector API and settings checks passed (validation, access, snapshots, old-agent isolation).');
})().catch(error => { console.error(error); process.exitCode = 1; });
