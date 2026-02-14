import { Pool } from "pg";

let _pool: Pool | null = null;

export function getPgPool() {
  if (_pool) return _pool;
  if (!process.env.DATABASE_URL) return null;

  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  return _pool;
}

// =======================================================
// Credits Tables (wallet / usage log / ai_results cache)
// - user_id는 Firebase UID 또는 canonical uid(email hash) 기반 문자열(text)
// - 이미지 저장은 하지 않음 (source_url + ai 결과만)
// =======================================================
export async function ensureCreditTables() {
  const pool = getPgPool();
  if (!pool) return;

  await pool.query(`
    create table if not exists public.user_wallet (
      user_id text primary key,
      balance int not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create or replace function public.touch_wallet_updated_at()
    returns trigger as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$ language plpgsql;

    drop trigger if exists trg_wallet_updated on public.user_wallet;
    create trigger trg_wallet_updated
    before update on public.user_wallet
    for each row execute procedure public.touch_wallet_updated_at();

    create table if not exists public.credit_usage_log (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      feature text not null,
      cost int not null,
      source_url text,
      request_key text,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_usage_user_time
    on public.credit_usage_log(user_id, created_at desc);

    create unique index if not exists uq_usage_request_key
    on public.credit_usage_log(request_key)
    where request_key is not null;

    create table if not exists public.ai_results (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      source_url text not null,

      ai_title text,
      ai_editor text,
      model text,
      prompt_version text,

      created_at timestamptz not null default now(),
      expires_at timestamptz not null default (now() + interval '30 days')
    );

    create index if not exists idx_ai_results_lookup
    on public.ai_results(user_id, source_url);

    create index if not exists idx_ai_results_expires
    on public.ai_results(expires_at);
  `);
}

export async function cleanupExpiredAiResults() {
  const pool = getPgPool();
  if (!pool) return;
  await pool.query(`delete from public.ai_results where expires_at < now()`);
}



export async function getAiHistory(userId: string, limit = 30) {
  const pool = getPgPool();
  if (!pool) return [];
  await ensureCreditTables();

  const r = await pool.query(
    `select source_url, ai_title, ai_editor, created_at, expires_at
     from public.ai_results
     where user_id=$1
     order by created_at desc
     limit $2`,
    [userId, Math.max(1, Math.min(Number(limit) || 30, 200))],
  );
  return Array.isArray(r.rows) ? r.rows : [];
}

export async function getUsageHistory(userId: string, limit = 50) {
  const pool = getPgPool();
  if (!pool) return [];
  await ensureCreditTables();

  const r = await pool.query(
    `select feature, cost, source_url, created_at
     from public.credit_usage_log
     where user_id=$1
     order by created_at desc
     limit $2`,
    [userId, Math.max(1, Math.min(Number(limit) || 50, 500))],
  );
  return Array.isArray(r.rows) ? r.rows : [];
}

export async function getWalletBalance(userId: string) {
  const pool = getPgPool();
  if (!pool) return null;
  await ensureCreditTables();
  const r = await pool.query(`select balance from public.user_wallet where user_id=$1 limit 1`, [userId]);
  return typeof r.rows?.[0]?.balance === "number" ? r.rows[0].balance : null;
}

export async function ensureInitialWallet(userId: string, initialBalance: number) {
  const pool = getPgPool();
  if (!pool) return;
  await ensureCreditTables();
  await pool.query(
    `insert into public.user_wallet(user_id, balance)
     values ($1, $2)
     on conflict (user_id) do nothing`,
    [userId, initialBalance],
  );
}

export async function getCachedAiResult(userId: string, sourceUrl: string) {
  const pool = getPgPool();
  if (!pool) return null;
  await ensureCreditTables();

  const r = await pool.query(
    `select ai_title, ai_editor, model, prompt_version, created_at, expires_at
     from public.ai_results
     where user_id=$1 and source_url=$2 and expires_at > now()
     order by created_at desc
     limit 1`,
    [userId, sourceUrl],
  );
  return r.rows?.[0] || null;
}


export async function chargeUsage(args: {
  userId: string;
  cost: number;
  feature: string;
  sourceUrl?: string | null;
  requestKey?: string | null;
}) {
  const pool = getPgPool();
  if (!pool) throw new Error("db_not_configured");
  await ensureCreditTables();

  const { userId, cost, feature, sourceUrl, requestKey } = args;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (requestKey) {
      const exists = await client.query(
        `select 1 from public.credit_usage_log where request_key=$1 limit 1`,
        [requestKey],
      );
      if (exists.rowCount > 0) {
        await client.query("ROLLBACK");
        return { ok: false, duplicate: true };
      }
    }

    const upd = await client.query(
      `update public.user_wallet
       set balance = balance - $2
       where user_id=$1 and balance >= $2
       returning balance`,
      [userId, cost],
    );

    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return { ok: false, insufficient: true };
    }

    await client.query(
      `insert into public.credit_usage_log(user_id, feature, cost, source_url, request_key)
       values ($1, $2, $3, $4, $5)`,
      [userId, feature, cost, sourceUrl || null, requestKey || null],
    );

    await client.query("COMMIT");
    return { ok: true, balance: upd.rows[0]?.balance ?? null };
  } catch (e: any) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    const msg = String(e?.message || e);
    if (msg.toLowerCase().includes("uq_usage_request_key") || msg.toLowerCase().includes("duplicate key")) {
      return { ok: false, duplicate: true };
    }
    throw e;
  } finally {
    client.release();
  }
}

export async function chargeAndSaveAiResult(args: {
  userId: string;
  cost: number;
  feature: string;
  sourceUrl: string;
  requestKey?: string | null;
  aiTitle: string;
  aiEditor: string;
  model?: string | null;
  promptVersion?: string | null;
}) {
  const pool = getPgPool();
  if (!pool) throw new Error("db_not_configured");
  await ensureCreditTables();

  const {
    userId,
    cost,
    feature,
    sourceUrl,
    requestKey,
    aiTitle,
    aiEditor,
    model,
    promptVersion,
  } = args;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) (선택) request_key로 중복 결제 방지: 이미 기록이 있으면 결제/저장 스킵
    if (requestKey) {
      const exists = await client.query(
        `select 1 from public.credit_usage_log where request_key=$1 limit 1`,
        [requestKey],
      );
      if (exists.rowCount > 0) {
        // 이미 결제된 요청 -> 결과 저장은 "캐시 조회"로 처리하는 편이 안전하지만,
        // 여기서는 호출부에서 캐시 조회를 먼저 하기 때문에, 그냥 종료 처리.
        await client.query("ROLLBACK");
        return { ok: false, duplicate: true };
      }
    }

    // 2) 잔액 차감 (원자적으로)
    const upd = await client.query(
      `update public.user_wallet
       set balance = balance - $2
       where user_id=$1 and balance >= $2
       returning balance`,
      [userId, cost],
    );

    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return { ok: false, insufficient: true };
    }

    // 3) 사용 로그
    await client.query(
      `insert into public.credit_usage_log(user_id, feature, cost, source_url, request_key)
       values ($1, $2, $3, $4, $5)`,
      [userId, feature, cost, sourceUrl, requestKey || null],
    );

    // 4) 결과 저장 (TTL 30일)
    await client.query(
      `insert into public.ai_results(user_id, source_url, ai_title, ai_editor, model, prompt_version, expires_at)
       values ($1, $2, $3, $4, $5, $6, now() + interval '30 days')`,
      [userId, sourceUrl, aiTitle, aiEditor, model || null, promptVersion || null],
    );

    await client.query("COMMIT");
    return { ok: true, balance: upd.rows[0]?.balance ?? null };
  } catch (e: any) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    // request_key unique 충돌이면 중복으로 간주
    const msg = String(e?.message || e);
    if (msg.toLowerCase().includes("uq_usage_request_key") || msg.toLowerCase().includes("duplicate key")) {
      return { ok: false, duplicate: true };
    }
    throw e;
  } finally {
    client.release();
  }
}
