import type { PoolClient } from "pg";

// Allow Android's multipart SMS callbacks time to finish before recovery.
export const STALE_PROCESSING_SECONDS = 600;

export async function recoverSmsProcessing(client: PoolClient, deviceId: string, closeUnconfirmed: boolean) {
  // The caller holds the device row lock used by polling and other recoveries.
  // Uncertain jobs must never be put back in the queue.
  const recovered = await client.query(
    `with matches as (
       select j.job_id, p.id as activity_id, p.occurred_at,
         count(*) over (partition by j.job_id) as job_matches,
         count(*) over (partition by p.id) as activity_matches
       from public.sms_jobs j join public.phone_activity p
         on p.device_id=j.device_id and p.record_type='sms' and p.direction='outgoing'
         and p.phone=j.phone and p.message=j.message
         and p.occurred_at between j.processing_at - interval '2 minutes'
           and j.processing_at + interval '2 minutes'
         and (p.linked_sms_job_id is null or p.linked_sms_job_id=j.job_id)
       where j.device_id=$1 and j.status='processing'
         and j.processing_at < now() - interval '${STALE_PROCESSING_SECONDS} seconds'
         and not exists (select 1 from public.sms_jobs other
           where other.device_id=j.device_id and other.job_id<>j.job_id
             and other.phone=j.phone and other.message=j.message
             and other.status in ('processing','sent')
             and coalesce(other.completed_at,other.processing_at)
               between p.occurred_at - interval '2 minutes' and p.occurred_at + interval '2 minutes')
     ), confirmed as (
       select * from matches where job_matches=1 and activity_matches=1
     ), updated as (
       update public.sms_jobs j set status='sent', error=null, completed_at=c.occurred_at
       from confirmed c where j.job_id=c.job_id and j.status='processing'
       returning j.job_id
     )
     update public.phone_activity p set linked_sms_job_id=c.job_id
     from confirmed c join updated u on u.job_id=c.job_id where p.id=c.activity_id`,
    [deviceId],
  );
  let closed = 0;
  if (closeUnconfirmed) {
    const result = await client.query(
      `update public.sms_jobs set status='failed', completed_at=now(),
         error='발송 결과 미확인: 관리자가 처리 종료 (자동 재발송 안 함)'
       where device_id=$1 and status='processing'
         and processing_at < now() - interval '${STALE_PROCESSING_SECONDS} seconds'`,
      [deviceId],
    );
    closed = result.rowCount || 0;
  }
  const { rows } = await client.query(
    `select count(*) filter (where status='processing')::int as processing,
       count(*) filter (where status='processing' and processing_at < now() - interval '${STALE_PROCESSING_SECONDS} seconds')::int as stale,
       count(*) filter (where status='queued')::int as queued
     from public.sms_jobs where device_id=$1 and status in ('queued','processing')`,
    [deviceId],
  );
  return { recovered: recovered.rowCount || 0, closed, ...rows[0] };
}
