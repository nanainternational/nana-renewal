import type { Express, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getPgPool } from './credits';
import { happyMessage, happySchedule, normalizeHappyPhone, plainText, validateHappyOrder } from './happy-call-model';

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const uuid = (value: unknown) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
function ownerFromSession(req: Request) {
  if (!process.env.SESSION_SECRET || !req.cookies?.token) return '';
  try {
    const user: any = jwt.verify(req.cookies.token, process.env.SESSION_SECRET, { algorithms: ['HS256'] });
    const owner = user.sub || user.cid || user.uid;
    return typeof owner === 'string' && owner.length <= 200 ? owner : '';
  } catch { return ''; }
}
type Work = (client: any, owner: string, req: Request, res: Response) => Promise<any>;
// Every website operation uses a server-verified owner, never an owner supplied by the browser.
function seller(work: Work) {
  return async (req: Request, res: Response) => {
    res.setHeader('Cache-Control','no-store');
    const owner = ownerFromSession(req);
    if (!owner) return res.status(401).json({ error: '로그인이 필요합니다.' });
    if (req.method !== 'GET') {
      const origin = req.headers.origin;
      const devOrigin = ['localhost','127.0.0.1'].includes(req.hostname) && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(String(origin));
      if (!devOrigin && origin !== 'https://nanainter.com' && origin !== 'https://www.nanainter.com') return res.status(403).json({ error:'요청 출처를 확인할 수 없습니다.' });
    }
    const pool = getPgPool();
    if (!pool) return res.status(503).json({ error:'저장소 연결을 확인하고 있습니다. 잠시 후 다시 시도해주세요.' });
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query("select pg_advisory_xact_lock(hashtext('happy-call:' || $1))",[owner]);
      // Remove expired personal data on each account request. Device polling also performs cleanup.
      await client.query('delete from happy_call.orders where owner_id=$1 and expires_at < now()',[owner]);
      await client.query('insert into happy_call.settings(owner_id) values($1) on conflict do nothing',[owner]);
      const result = await work(client, owner, req, res);
      await client.query('commit');
      if (!res.headersSent) return res.json(result ?? { ok:true });
    } catch (error: any) {
      await client.query('rollback');
      if (!res.headersSent) res.status(error?.status || 500).json({ error: error?.status ? error.message : '처리하지 못했습니다. 잠시 후 다시 시도해주세요.' });
      if (!error?.status) console.error('happy-call request failed', { code:error?.code });
    } finally { client.release(); }
  };
}
function bad(message: string, status=400): never { throw Object.assign(new Error(message),{status}); }
let cleanupTimer: ReturnType<typeof setInterval> | undefined;
let apkCache: { url: string; until: number } | undefined;

export function registerHappyCallRoutes(app: Express) {
  if (!cleanupTimer) {
    const cleanup = () => getPgPool()?.query('delete from happy_call.orders where expires_at < now()').catch(() => console.error('happy-call retention cleanup failed'));
    cleanupTimer = setInterval(cleanup, 3600000);
    cleanupTimer.unref();
  }
  app.get('/api/happy-call/app/download', async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if(!ownerFromSession(req)) return res.status(401).send('로그인이 필요합니다.');
    try {
      if(!apkCache || apkCache.until<Date.now()) {
        const response=await fetch('https://api.github.com/repos/nanainternational/nana-renewal/releases?per_page=30', {headers:{Accept:'application/vnd.github+json','User-Agent':'nana-happy-call'},signal:AbortSignal.timeout(10000)});
        if(!response.ok) throw new Error('release_unavailable');
        const releases:any=await response.json();
        const release=releases.find((r:any)=>!r.draft && /^happy-call-v\d+\.\d+\.\d+-[0-9a-f]+$/.test(r.tag_name) && r.assets?.some((a:any)=>a.name==='nana-happy-call.apk'));
        const url=release?.assets.find((a:any)=>a.name==='nana-happy-call.apk')?.browser_download_url;
        if(!url || !url.startsWith('https://github.com/nanainternational/nana-renewal/releases/download/')) return res.status(503).send('해피콜 APK를 준비 중입니다. 잠시 후 다시 시도해주세요.');
        apkCache={url,until:Date.now()+300000};
      }
      return res.redirect(apkCache.url);
    }catch {return res.status(503).send('다운로드를 준비하지 못했습니다. 잠시 후 다시 시도해주세요.');}
  });
  app.get('/api/happy-call', seller(async (db, owner, req) => {
    const page = Math.max(1,Math.min(10000,Math.trunc(Number(req.query.page))||1));
    const settings = (await db.query('select store_name, support_text, delay_days, send_hour, paused from happy_call.settings where owner_id=$1',[owner])).rows[0];
    const orders = await db.query(`select o.id, o.order_no, o.customer_name, o.phone, o.product_name, o.product_option,
      o.delivered_on::text, o.expires_at, j.id as job_id, j.status, j.scheduled_at, j.message, j.error,
      exists(select 1 from happy_call.exclusions e where e.owner_id=o.owner_id and e.phone=o.phone) as excluded
      from happy_call.orders o left join happy_call.jobs j on j.order_id=o.id and j.owner_id=$1
      where o.owner_id=$1 order by o.created_at desc, o.id limit 50 offset $2`,[owner,(page-1)*50]);
    const counts = (await db.query(`select count(*)::int as total, count(*) filter(where j.status='queued')::int as queued,
      count(*) filter(where j.status='sent')::int as sent, count(*) filter(where j.status in ('failed','processing'))::int as attention
      from happy_call.orders o left join happy_call.jobs j on j.order_id=o.id and j.owner_id=$1 where o.owner_id=$1`,[owner])).rows[0];
    const devices = (await db.query(`select id,name,android_id is not null as paired,last_seen_at,pairing_expires_at
      from happy_call.devices where owner_id=$1 and revoked_at is null`,[owner])).rows;
    const exclusions = (await db.query('select phone,created_at from happy_call.exclusions where owner_id=$1 order by created_at desc limit 100',[owner])).rows;
    return {settings,orders:orders.rows,counts,devices,exclusions,page};
  }));
  app.put('/api/happy-call/settings', seller(async (db,owner,req) => {
    let name: string, text: string;
    try { name=plainText(req.body?.storeName,80); text=plainText(req.body?.supportText,300); } catch(e:any) { bad(e.message); }
    const days=Number(req.body.delayDays), hour=Number(req.body.sendHour);
    if (!Number.isInteger(days)||days<0||days>30||!Number.isInteger(hour)||hour<8||hour>19) bad('발송일과 시간을 확인해주세요.');
    await db.query(`update happy_call.settings set store_name=$2,support_text=$3,delay_days=$4,send_hour=$5,updated_at=now() where owner_id=$1`,[owner,name!,text!,days,hour]);
    return {ok:true};
  }));
  app.post('/api/happy-call/orders', seller(async(db,owner,req)=>{
    if (!Array.isArray(req.body?.items)||!req.body.items.length||req.body.items.length>1000) bad('한 번에 1~1,000건을 등록해주세요.');
    const total=(await db.query('select count(*)::int as n from happy_call.orders where owner_id=$1',[owner])).rows[0].n;
    if (total+req.body.items.length>10000) bad('보관 가능한 주문은 최대 10,000건입니다.');
    let items:any[];
    try { items=req.body.items.map((item:any)=>validateHappyOrder(item)); } catch(e:any) { bad(e.message); }
    let inserted=0;
    for (const item of items!) {
      const r=await db.query(`insert into happy_call.orders(owner_id,order_no,customer_name,phone,product_name,product_option,delivered_on)
        values($1,$2,$3,$4,$5,$6,$7) on conflict(owner_id,order_no) do nothing`,[owner,item.orderNo,item.customerName,item.phone,item.productName,item.productOption,item.deliveredOn]);
      inserted+=r.rowCount;
    }
    return {ok:true,inserted,duplicates:items!.length-inserted};
  }));
  app.post('/api/happy-call/schedule', seller(async(db,owner,req)=>{
    const ids=req.body?.ids;
    if (!Array.isArray(ids)||!ids.length||ids.length>1000||!ids.every(uuid)) bad('예약할 주문을 선택해주세요.');
    const settings=(await db.query('select * from happy_call.settings where owner_id=$1',[owner])).rows[0];
    if (!settings.store_name) bad('먼저 상점명과 안내 문구를 저장해주세요.');
    const device=await db.query('select 1 from happy_call.devices where owner_id=$1 and revoked_at is null and android_id is not null',[owner]);
    if (!device.rowCount) bad('해피콜용 업무폰을 먼저 연결해주세요.');
    const orders=(await db.query(`select o.*,o.delivered_on::text as delivered_day from happy_call.orders o where o.owner_id=$1 and o.id=any($2::uuid[])
      and not exists(select 1 from happy_call.exclusions e where e.owner_id=$1 and e.phone=o.phone)
      and not exists(select 1 from happy_call.jobs j where j.order_id=o.id)`,[owner,ids])).rows;
    let queued=0;
    for (const order of orders) {
      const schedule=happySchedule(order.delivered_day,settings.delay_days,settings.send_hour);
      if (schedule>=new Date(order.expires_at)) continue;
      const message=happyMessage(settings,order);
      await db.query('insert into happy_call.jobs(owner_id,order_id,phone,message,scheduled_at) values($1,$2,$3,$4,$5)',[owner,order.id,order.phone,message,schedule]);
      queued++;
    }
    return {ok:true,queued,skipped:ids.length-queued};
  }));
  app.post('/api/happy-call/pause', seller(async(db,owner,req)=>{
    if(typeof req.body?.paused!=='boolean') bad('중지 상태를 확인해주세요.');
    await db.query('update happy_call.settings set paused=$2,updated_at=now() where owner_id=$1',[owner,req.body.paused]);
    return {ok:true};
  }));
  app.delete('/api/happy-call/exclusions/:phone', seller(async(db,owner,req)=>{
    const phone=normalizeHappyPhone(req.params.phone);
    if(!/^01\d{8,9}$/.test(phone)) bad('휴대전화번호를 확인해주세요.');
    await db.query('delete from happy_call.exclusions where owner_id=$1 and phone=$2',[owner,phone]);
    return {ok:true};
  }));
  app.post('/api/happy-call/jobs/:id/cancel', seller(async(db,owner,req)=>{
    if(!uuid(req.params.id)) bad('주문을 확인해주세요.');
    const r=await db.query("update happy_call.jobs set status='cancelled',completed_at=now(),error='판매자가 취소' where id=$1 and owner_id=$2 and status='queued'",[req.params.id,owner]);
    if(!r.rowCount) bad('대기 중인 예약만 취소할 수 있습니다.',409);
    return {ok:true};
  }));
  app.delete('/api/happy-call/orders/:id', seller(async(db,owner,req)=>{
    if(!uuid(req.params.id)) bad('주문을 확인해주세요.');
    if((await db.query("select 1 from happy_call.jobs where order_id=$1 and owner_id=$2 and status='processing'",[req.params.id,owner])).rowCount) bad('발송 중인 주문은 결과 확인 후 삭제해주세요.',409);
    const r=await db.query('delete from happy_call.orders where id=$1 and owner_id=$2',[req.params.id,owner]);
    if(!r.rowCount) bad('주문을 찾을 수 없습니다.',404);
    return {ok:true};
  }));
  app.post('/api/happy-call/exclusions', seller(async(db,owner,req)=>{
    const phone=normalizeHappyPhone(req.body?.phone);
    if(!/^01\d{8,9}$/.test(phone)) bad('휴대전화번호를 확인해주세요.');
    if((await db.query('select count(*)::int as n from happy_call.exclusions where owner_id=$1',[owner])).rows[0].n>=10000) bad('제외 목록 한도를 초과했습니다.');
    await db.query('insert into happy_call.exclusions(owner_id,phone) values($1,$2) on conflict do nothing',[owner,phone]);
    await db.query("update happy_call.jobs set status='cancelled',completed_at=now(),error='발송 제외' where owner_id=$1 and phone=$2 and status='queued'",[owner,phone]);
    return {ok:true};
  }));
  app.post('/api/happy-call/devices', seller(async(db,owner,req)=>{
    let name: string; try{name=plainText(req.body?.name,60);}catch(e:any){bad(e.message);}
    if((await db.query("select 1 from happy_call.jobs where owner_id=$1 and status='processing'",[owner])).rowCount) bad('발송 중인 작업을 확인한 후 연결을 변경해주세요.',409);
    const recent=(await db.query("select count(*)::int as n from happy_call.devices where owner_id=$1 and created_at>now()-interval '1 hour'",[owner])).rows[0].n;
    if(recent>=10) bad('잠시 후 다시 연결해주세요.',429);
    await db.query('update happy_call.devices set revoked_at=now() where owner_id=$1 and revoked_at is null',[owner]);
    const token=crypto.randomBytes(32).toString('base64url');
    const row=(await db.query('insert into happy_call.devices(owner_id,name,token_hash) values($1,$2,$3) returning id,pairing_expires_at',[owner,name!,hash(token)])).rows[0];
    return {ok:true,token,id:row.id,expiresAt:row.pairing_expires_at};
  }));
  app.post('/api/happy-call/devices/:id/revoke', seller(async(db,owner,req)=>{
    if(!uuid(req.params.id)) bad('기기를 확인해주세요.');
    await db.query('update happy_call.devices set revoked_at=now() where id=$1 and owner_id=$2',[req.params.id,owner]);
    await db.query('update happy_call.settings set paused=true where owner_id=$1',[owner]);
    return {ok:true};
  }));

  // Device credentials cannot access website/customer APIs or internal CRM queues.
  const deviceRoute=(work: (db:any,device:any,req:Request)=>Promise<any>)=>async(req:Request,res:Response)=>{
    res.setHeader('Cache-Control','no-store');
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    if(!/^[A-Za-z0-9_-]{43}$/.test(token)) return res.status(401).json({error:'invalid_device_token'});
    const pool=getPgPool(); if(!pool) return res.status(503).json({error:'unavailable'});
    const db=await pool.connect();
    try{
      await db.query('begin');
      const initial=(await db.query('select owner_id from happy_call.devices where token_hash=$1 and revoked_at is null',[hash(token)])).rows[0];
      if(!initial) bad('invalid_device_token',401);
      await db.query("select pg_advisory_xact_lock(hashtext('happy-call:' || $1))",[initial.owner_id]);
      const device=(await db.query('select * from happy_call.devices where token_hash=$1 and revoked_at is null for update',[hash(token)])).rows[0];
      if(!device) bad('invalid_device_token',401);
      const identity=String(req.headers['x-device-id']||'');
      if(!identity||identity.length>200) bad('device_identity_required',401);
      if(device.android_id && device.android_id!==identity) bad('device_identity_mismatch',401);
      if(!device.android_id && (req.path!=='/api/happy-call-device/register' || new Date(device.pairing_expires_at)<new Date())) bad('pairing_expired',401);
      const result=await work(db,device,req);
      await db.query('commit'); return res.json(result);
    }catch(e:any){await db.query('rollback'); return res.status(e.status||500).json({error:e.status?e.message:'device_request_failed'});}
    finally{db.release();}
  };
  app.post('/api/happy-call-device/register',deviceRoute(async(db,d,req)=>{
    await db.query('update happy_call.devices set android_id=$2,last_seen_at=now() where id=$1',[d.id,String(req.headers['x-device-id'])]);
    return {ok:true};
  }));
  app.get('/api/happy-call-device/next',deviceRoute(async(db,d)=>{
    await db.query('update happy_call.devices set last_seen_at=now() where id=$1',[d.id]);
    await db.query('delete from happy_call.orders where owner_id=$1 and expires_at<now()',[d.owner_id]);
    await db.query(`update happy_call.jobs j set status='cancelled',completed_at=now(),error='발송 제외 또는 예약 만료'
      where j.owner_id=$1 and j.status='queued' and (j.scheduled_at<now()-interval '7 days' or
      exists(select 1 from happy_call.exclusions e where e.owner_id=$1 and e.phone=j.phone))`,[d.owner_id]);
    const hour=Number(new Date(Date.now()+9*3600000).getUTCHours());
    if(hour<8||hour>=20 || d.next_send_at && new Date(d.next_send_at)>new Date()) return {job:null};
    if((await db.query('select 1 from happy_call.settings where owner_id=$1 and paused=false',[d.owner_id])).rowCount===0) return {job:null};
    if((await db.query("select 1 from happy_call.jobs where owner_id=$1 and status='processing'",[d.owner_id])).rowCount) return {job:null};
    const job=(await db.query(`select j.id,j.phone,j.message from happy_call.jobs j where j.owner_id=$1 and j.status='queued' and j.scheduled_at<=now()
      and not exists(select 1 from happy_call.jobs previous where previous.owner_id=$1 and previous.phone=j.phone
        and previous.status='sent' and previous.completed_at >= date_trunc('day',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')
      order by j.scheduled_at,j.created_at for update skip locked limit 1`,[d.owner_id])).rows[0];
    if(!job) return {job:null};
    await db.query("update happy_call.jobs set status='processing',device_id=$2,processing_at=now() where id=$1",[job.id,d.id]);
    await db.query("update happy_call.devices set next_send_at=now()+interval '10 seconds' where id=$1",[d.id]);
    return {job:{jobId:job.id,phone:job.phone,message:job.message}};
  }));
  app.post('/api/happy-call-device/result',deviceRoute(async(db,d,req)=>{
    if(!uuid(req.body?.jobId)||!['sent','failed'].includes(req.body?.status)) bad('invalid_result');
    const r=await db.query(`update happy_call.jobs set status=$3,completed_at=now(),error=$4 where id=$1 and owner_id=$2 and device_id=$5 and status='processing'`,[req.body.jobId,d.owner_id,req.body.status,req.body.status==='failed'?'휴대폰 문자 발송 실패':null,d.id]);
    if(!r.rowCount) bad('processing_job_not_found',404);
    return {ok:true};
  }));
  app.post('/api/happy-call/jobs/:id/close',seller(async(db,owner,req)=>{
    if(!uuid(req.params.id)) bad('작업을 확인해주세요.');
    const r=await db.query("update happy_call.jobs set status='failed',completed_at=now(),error='결과 미확인: 자동 재발송하지 않음' where id=$1 and owner_id=$2 and status='processing' and processing_at<now()-interval '10 minutes'",[req.params.id,owner]);
    if(!r.rowCount) bad('발송 시작 10분 후 휴대폰의 발신 내역을 확인하고 처리해주세요.',409);
    return {ok:true};
  }));
}
