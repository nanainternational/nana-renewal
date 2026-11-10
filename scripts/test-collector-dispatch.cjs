const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('../client/node_modules/typescript');
const { PGlite } = require(process.env.COLLECTOR_TEST_PGLITE || '@electric-sql/pglite');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, file);
let routePool;
const originalLoad = Module._load;
Module._load = function(name, parent) {
  if (name === './credits' && parent.filename.endsWith('collector-service.ts')) return { getPgPool: () => routePool };
  return originalLoad.apply(this, arguments);
};
const { claimCollectorJobSql: sql, registerCollectorRoutes } = require('../server/collector-service.ts');
Module._load = originalLoad;
(async () => {
  const db = new PGlite();
  await db.exec(`CREATE TABLE collector_workers(worker_id text PRIMARY KEY, web_settings boolean DEFAULT true, max_parallel int DEFAULT 4,
    last_seen timestamptz DEFAULT now(), last_poll timestamptz DEFAULT now(), poll_platforms text[], metrics jsonb);
    CREATE TABLE collector_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), platform text, settings jsonb DEFAULT '{}', status text DEFAULT 'queued',
    worker_id text, created_at timestamptz DEFAULT now(), started_at timestamptz, updated_at timestamptz, message text);`);
  const worker = (id, free, extra={}) => db.query(`INSERT INTO collector_workers(worker_id,metrics,max_parallel,web_settings,poll_platforms,last_poll,last_seen)
    VALUES($1,$2::jsonb,$3,$4,$5::text[],$6,$7)`, [id, free===null?null:JSON.stringify({memory_total_gb:extra.total||16,memory_used_gb:(extra.total||16)-free,
      sampled_at:new Date(Date.now()+(extra.sampleOffset||0)).toISOString()}),extra.cap||4,extra.web??true,extra.platforms??null,
      new Date(Date.now()+(extra.pollOffset||0)),new Date(Date.now()+(extra.seenOffset||0))]);
  const job = async (platform='ably', status='queued', workerId=null) => (await db.query(`INSERT INTO collector_jobs(platform,status,worker_id) VALUES($1,$2,$3) RETURNING id`,[platform,status,workerId])).rows[0].id;
  const claim = async (id, web=true, platforms=null) => (await db.query(sql,[id,web,platforms])).rows;
  const reset = () => db.exec('TRUNCATE collector_jobs,collector_workers');
  await worker('low',4);await worker('high',12,{total:32});await job();
  assert.equal((await claim('low')).length,0,'Fastest poller cannot steal from higher free memory');
  assert.equal((await claim('high')).length,1,'Absolute free GB wins despite higher percentage used');
  assert.equal((await claim('high')).length,0,'No duplicate claim');
  await reset();await worker('a',8);await worker('b',8);await job('4910','running','a');await job();
  assert.equal((await claim('a')).length,0);assert.equal((await claim('b')).length,1,'Equal free memory prefers fewer active jobs');
  await reset();await worker('full',12,{cap:1});await worker('ready',4);await job('4910','cancel_requested','full');await job();
  assert.equal((await claim('full')).length,0);assert.equal((await claim('ready')).length,1,'Cancelling jobs still consume capacity');
  for(const extra of [{pollOffset:-16000},{seenOffset:-61000},{platforms:['zigzag']},{web:false}]) {
    await reset();await worker('unavailable',12,extra);await worker('ready',4);await job();
    assert.equal((await claim('ready')).length,1,'Unavailable/incompatible worker cannot block queue');
  }
  for(const extra of [{sampleOffset:-21000},{sampleOffset:10000}]) {
    await reset();await worker('stale',12,extra);await worker('fresh',4);await job();
    assert.equal((await claim('fresh')).length,1,'Stale/future measurements must not outrank fresh data');
  }
  await reset();await worker('unknown',null);await worker('fresh',1);await job();assert.equal((await claim('fresh')).length,1);
  await reset();await worker('a',null);await worker('b',null);await job('4910','running','a');await job();assert.equal((await claim('b')).length,1,'Missing metrics fall back to job count');
  await reset();await worker('only',4,{cap:1});await job('ably');await job('zigzag');assert.equal((await claim('only')).length,1);assert.equal((await claim('only')).length,0,'Repeated claims cannot exceed capacity');
  await reset();await worker('only',4);await job();assert.equal((await claim('only',false)).length,0);assert.equal((await claim('only',true,[])).length,0);
  await db.query('UPDATE collector_workers SET poll_platforms=ARRAY[\'zigzag\']');assert.equal((await claim('only')).length,0);
  await db.query('UPDATE collector_workers SET poll_platforms=NULL');await db.query('UPDATE collector_jobs SET status=\'cancelled\'');assert.equal((await claim('only')).length,0);
  await reset();await worker('a',4);await job();await db.exec('BEGIN');assert.equal((await claim('a')).length,1);await db.exec('ROLLBACK');assert.equal((await claim('a')).length,1,'Rollback leaves job queued');
  const routesDb = new PGlite();
  await routesDb.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  routePool = {query: routesDb.query.bind(routesDb), connect: async()=>({query:routesDb.query.bind(routesDb),release(){}})};
  const routes = new Map();
  registerCollectorRoutes(Object.fromEntries(['get','post','put'].map(method=>[method,(url,fn)=>routes.set(method+url,fn)])), async()=>({admin:{role:'OWNER'},email:'test@example.test'}));
  process.env.SESSION_SECRET='s'.repeat(40);process.env.COLLECTOR_WORKER_TOKEN='t'.repeat(40);
  const request=(method,url,body={},params={})=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Route timeout')),5000);
    const req={method:method.toUpperCase(),body,params,query:{},header:n=>({origin:'https://nanainter.com','x-collector-worker-token':process.env.COLLECTOR_WORKER_TOKEN}[n])};
    const res={code:200,headersSent:false,status(n){this.code=n;return this},json(data){clearTimeout(timer);this.headersSent=true;resolve({code:this.code,data})}};
    routes.get(method+url)(req,res);
  });
  const heartbeat={worker_id:'rename-pc',worker_name:'ORIGINAL-HOST',web_settings:true,max_parallel:4};
  assert.equal((await request('post','/api/internal/collector/heartbeat',heartbeat)).code,200,'Actual schema initialization succeeds');
  assert.equal((await request('put','/api/admin/collector/workers/:id/name',{name:'  사무실 PC  '},{id:'rename-pc'})).data.worker.worker_name,'사무실 PC');
  await request('post','/api/internal/collector/heartbeat',heartbeat);
  const overview=(await request('get','/api/admin/collector/overview')).data;
  assert.equal(overview.workers[0].worker_name,'사무실 PC','Real PostgreSQL heartbeat must preserve renamed display');
  assert.equal(overview.workers[0].worker_id,'rename-pc');
  assert.equal((await request('post','/api/internal/collector/next',{worker_id:'rename-pc',web_settings:true,platforms:['ably']})).code,200,'Actual dispatch transaction and advisory lock succeed');
  const persisted=(await routesDb.query('SELECT display_name,poll_platforms,last_poll FROM collector_workers')).rows[0];
  assert.equal(persisted.display_name,'사무실 PC');assert.deepEqual(persisted.poll_platforms,['ably']);assert(persisted.last_poll);
  await routesDb.close();
  await db.close();
  console.log('PASS: PostgreSQL dispatch scenarios: memory GB, ties, capacity, cancellation, duplicates, stale/offline/incompatible workers, missing telemetry, rollback.');
})().catch(error=>{console.error(error);process.exitCode=1});
