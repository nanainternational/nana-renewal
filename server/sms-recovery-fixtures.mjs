// Print a PostgreSQL integration check using only temporary, synthetic records.
// Run with: node --experimental-strip-types server/sms-recovery-fixtures.mjs
// Execute the printed SQL in a PostgreSQL session; it rolls back all fixtures.
import { recoverSmsProcessing } from "./sms-recovery.ts";
const statements = [`begin;
create temporary table recovery_jobs (job_id text primary key, device_id text, phone text, message text, status text, processing_at timestamptz, completed_at timestamptz, error text);
create temporary table recovery_activity (id text primary key, device_id text, record_type text, direction text, phone text, message text, occurred_at timestamptz, linked_sms_job_id text);
insert into recovery_jobs
select n::text, case when n=6 then 'other-device' else 'fixture-device' end,
  case when n=12 then 'synthetic-11' else 'synthetic-'||n end, 'test message',
  case when n=7 then 'queued' else 'processing' end,
  now()-case when n=3 then interval '1 minute' else interval '20 minutes' end, null, null
from generate_series(1,12) n;
insert into recovery_jobs values ('sent-other','fixture-device','synthetic-9','test message','sent',now()-interval '20 minutes',now()-interval '20 minutes',null);
insert into recovery_activity
select n::text, case when n=6 then 'other-device' else 'fixture-device' end, 'sms',
  case when n=4 then 'incoming' else 'outgoing' end, 'synthetic-'||n,
  case when n=5 then 'different message' else 'test message' end,
  now()-case when n=3 then interval '1 minute' when n=10 then interval '10 minutes' else interval '20 minutes' end,
  case when n=8 then 'another-job' else null end
from generate_series(1,11) n;
insert into recovery_activity select 'duplicate-2',device_id,record_type,direction,phone,message,occurred_at,null from recovery_activity where id='2';`];
const client = {async query(sql) {
  statements.push(sql.replaceAll("public.sms_jobs", "pg_temp.recovery_jobs")
    .replaceAll("public.phone_activity", "pg_temp.recovery_activity")
    .replaceAll("$1", "'fixture-device'") + ";");
  return {rowCount:0, rows:[{}]};
}};
await recoverSmsProcessing(client, "fixture-device", false);
statements.push(`do $$ begin
  if (select count(*) from recovery_jobs where status='sent' and job_id<>'sent-other') <> 1 then raise exception 'Recovery must only confirm one unambiguous stale job'; end if;
  if not exists(select 1 from recovery_jobs where job_id='1' and status='sent' and completed_at=processing_at) then raise exception 'Wrong completion timestamp'; end if;
  if not exists(select 1 from recovery_activity where id='1' and linked_sms_job_id='1') then raise exception 'Recovered send must link its activity'; end if;
  if exists(select 1 from recovery_jobs where job_id not in ('1','sent-other','7') and status<>'processing') then raise exception 'Recovery altered unconfirmed or fresh jobs'; end if;
end $$;`);
await recoverSmsProcessing(client, "fixture-device", true);
statements.push(`do $$ begin
  if (select count(*) from recovery_jobs where status='failed') <> 8 then raise exception 'Explicit close must affect exactly eight stale unconfirmed jobs'; end if;
  if (select count(*) from recovery_jobs where status='processing') <> 2 then raise exception 'Recent and other-device jobs must remain processing'; end if;
  if (select count(*) from recovery_jobs where status='queued') <> 1 then raise exception 'Recovery must never enqueue a resend or cancel a queued job'; end if;
  if exists(select 1 from recovery_jobs where status='failed' and error not like '발송 결과 미확인%') then raise exception 'Missing unknown-result explanation'; end if;
end $$;
select 'passed' as recovery_fixture_result, 12 as scenarios;
rollback;`);
process.stdout.write(statements.join("\n"));
