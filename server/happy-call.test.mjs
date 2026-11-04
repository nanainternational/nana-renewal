import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const esbuild=require('../client/node_modules/esbuild');
function compile(path,stubRequire=require,extras={}){
  const code=esbuild.transformSync(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code;
  const context={module:{exports:{}},exports:{},require:stubRequire,console,process:{env:{SESSION_SECRET:'test-only-secret'}},...extras};
  vm.runInNewContext(code,context);return context.module.exports;
}
const model=compile('./happy-call-model.ts');
test('orders reject invalid numbers, calendar dates and future dates',()=>{
  const order={orderNo:'test-1',phone:'010-1234-5678',productName:'슬랙스',productOption:'XL',deliveredOn:'2026-11-01'};
  assert.equal(model.validateHappyOrder(order,new Date('2026-11-04T00:00Z')).phone,'01012345678');
  for(const change of [{phone:'05012345678'},{deliveredOn:'2026-11-31'},{deliveredOn:'2026-11-05'},{productName:'https://example.test'}])assert.throws(()=>model.validateHappyOrder({...order,...change},new Date('2026-11-04T00:00Z')));
});
test('schedule uses Korea time and never turns overdue imports into immediate sends',()=>{
  assert.equal(model.happySchedule('2026-11-01',2,10,new Date('2026-11-02T00:00Z')).toISOString(),'2026-11-03T01:00:00.000Z');
  assert.equal(model.happySchedule('2026-11-01',2,10,new Date('2026-11-04T02:00Z')).toISOString(),'2026-11-05T01:00:00.000Z');
  assert.equal(model.happySchedule('2026-11-01',2,10,new Date('2026-11-03T23:30Z')).toISOString(),'2026-11-04T01:00:00.000Z');
});
test('customer message contains purchased product and stored support text',()=>{
  const message=model.happyMessage({store_name:'나나드레스',support_text:'불편하시면 답장 주세요.'},{product_name:'슬랙스',product_option:'XL'});
  assert.match(message,/나나드레스/);assert.match(message,/슬랙스 XL/);assert.match(message,/불편하시면 답장/);
});
function harness(){
  const queries=[],routes=new Map();let released=false;
  const client={query:async(sql,values=[])=>{
    queries.push({sql,values});
    if(sql.includes('count(*)'))return {rows:[{total:0,queued:0,sent:0,attention:0,n:0}],rowCount:1};
    if(sql.startsWith('select store_name'))return {rows:[{store_name:'test',paused:true}],rowCount:1};
    return {rows:[],rowCount:0};
  },release(){released=true;}};
  const module=compile('./happy-call.ts',name=>{
    if(name==='./credits')return {getPgPool:()=>({connect:async()=>client})};
    if(name==='jsonwebtoken')return {verify:(token)=>{if(token!=='valid')throw Error('invalid');return {sub:'owner-a'};}};
    if(name==='./happy-call-model')return model;
    return require(name);
  },{setInterval:()=>({unref(){}})});
  module.registerHappyCallRoutes(new Proxy({},{get:(_,method)=>(path,handler)=>routes.set(`${method} ${path}`,handler)}));
  async function call(route,patch={}){
    const response={statusCode:200,body:null,headersSent:false,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(body){this.body=body;this.headersSent=true;return this;},send(body){return this.json(body);}};
    const req={cookies:{token:'valid'},method:route.split(' ')[0].toUpperCase(),headers:{origin:'https://nanainter.com'},hostname:'nanainter.com',query:{},body:{owner_id:'owner-b'},params:{id:'12345678-1234-1234-1234-123456789abc'},...patch};
    await routes.get(route)(req,response);return response;
  }
  return {queries,call,get released(){return released;}};
}
test('unauthenticated and forged sessions cannot read customer data',async()=>{
  for(const cookies of [{},{token:'forged'}]){const h=harness();const r=await h.call('get /api/happy-call',{cookies});assert.equal(r.statusCode,401);assert.equal(h.queries.length,0);}
});
test('account supplied by the browser never changes the data scope',async()=>{
  const h=harness(),r=await h.call('get /api/happy-call',{query:{owner_id:'owner-b'}});
  assert.equal(r.statusCode,200);assert.ok(h.released);
  const tenantQueries=h.queries.filter(q=>/happy_call\./.test(q.sql));
  assert.ok(tenantQueries.length>=6);
  for(const q of tenantQueries){assert.ok(q.values.includes('owner-a'),q.sql);assert.ok(!q.values.includes('owner-b'));}
});
test('cross-site writes are rejected before database access',async()=>{
  const h=harness(),r=await h.call('post /api/happy-call/pause',{headers:{origin:'https://attacker.test'},body:{paused:false}});
  assert.equal(r.statusCode,403);assert.equal(h.queries.length,0);
});
test('another sellers job id cannot be cancelled',async()=>{
  const h=harness(),r=await h.call('post /api/happy-call/jobs/:id/cancel');
  assert.equal(r.statusCode,409);
  const q=h.queries.find(q=>q.sql.startsWith('update happy_call.jobs'));assert.equal(q.values[1],'owner-a');assert.match(q.sql,/owner_id=\$2/);
});
test('internal shared device key cannot access the seller device queue',async()=>{
  const h=harness(),r=await h.call('get /api/happy-call-device/next',{headers:{authorization:'Bearer internal-key'}});
  assert.equal(r.statusCode,401);assert.equal(h.queries.length,0);
});
