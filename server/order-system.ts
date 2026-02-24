import crypto from "crypto";
import { getPgPool } from "./credits";

export type AdminRole = "OWNER" | "ADMIN" | "VIEWER";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_CONFIRMED"
  | "CN_CENTER_INBOUND"
  | "CN_CENTER_RECEIVED"
  | "KR_CENTER_INBOUND"
  | "KR_CENTER_RECEIVED";

const ORDER_STATUS_FLOW: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "CN_CENTER_INBOUND",
  "CN_CENTER_RECEIVED",
  "KR_CENTER_INBOUND",
  "KR_CENTER_RECEIVED",
];

export function normalizeEmail(email?: string | null): string {
  return String(email || "").trim().toLowerCase();
}

export function stableUuidFromEmail(email?: string | null): string {
  const normalized = normalizeEmail(email);
  const hex = crypto.createHash("sha1").update(normalized || "guest").digest("hex").slice(0, 32);
  const parts = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ];
  return parts.join("-");
}

export function getNextOrderStatus(current: OrderStatus): OrderStatus | null {
  const idx = ORDER_STATUS_FLOW.indexOf(current);
  if (idx < 0) return null;
  return ORDER_STATUS_FLOW[idx + 1] || null;
}

export async function ensureOrderSystemTables() {
  const pool = getPgPool();
  if (!pool) return;

  await pool.query(`
    create table if not exists public.admin_invites (
      id uuid primary key default gen_random_uuid(),
      email text not null unique,
      role text not null check (role in ('OWNER', 'ADMIN', 'VIEWER')),
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.admin_users (
      id uuid primary key default gen_random_uuid(),
      user_uuid uuid not null unique,
      email text not null,
      role text not null check (role in ('OWNER', 'ADMIN', 'VIEWER')),
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.order_no_sequences (
      date_key text primary key,
      last_seq int not null default 0,
      updated_at timestamptz not null default now()
    );

    create table if not exists public.orders (
      id uuid primary key default gen_random_uuid(),
      order_no text not null unique,
      user_id text not null,
      user_email text,
      status text not null default 'PENDING_PAYMENT',
      source_payload jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    do $$
    begin
      if exists (
        select 1
        from pg_constraint c
        where c.conrelid = 'public.orders'::regclass
          and c.conname = 'orders_status_check'
      ) then
        alter table public.orders drop constraint orders_status_check;
      end if;

      alter table public.orders
        add constraint orders_status_check
        check (status in ('PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'CN_CENTER_INBOUND', 'CN_CENTER_RECEIVED', 'KR_CENTER_INBOUND', 'KR_CENTER_RECEIVED'));
    exception when duplicate_object then
      null;
    end $$;

    create index if not exists idx_orders_user_id_created_at on public.orders(user_id, created_at desc);

    create table if not exists public.order_items (
      id uuid primary key default gen_random_uuid(),
      order_id uuid not null references public.orders(id) on delete cascade,
      product_url text,
      title text not null,
      options jsonb,
      quantity int not null default 1,
      price numeric(18,2),
      raw_item jsonb,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_order_items_order_id on public.order_items(order_id);

    create table if not exists public.order_status_logs (
      id uuid primary key default gen_random_uuid(),
      order_id uuid not null references public.orders(id) on delete cascade,
      from_status text,
      to_status text not null,
      changed_by text not null,
      changed_by_role text,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_order_status_logs_order_id_created_at on public.order_status_logs(order_id, created_at desc);
  `);
}

export async function ensureOwnerInviteFromEnv() {
  const pool = getPgPool();
  if (!pool) return;
  await ensureOrderSystemTables();

  const ownerEmails = String(process.env.ADMIN_OWNER_EMAILS || "")
    .split(",")
    .map((v) => normalizeEmail(v))
    .filter(Boolean);

  for (const email of ownerEmails) {
    await pool.query(
      `insert into public.admin_invites(email, role, is_active)
       values ($1, 'OWNER', true)
       on conflict (email)
       do update set role='OWNER', is_active=true, updated_at=now()`,
      [email],
    );
  }
}

export async function syncAdminUserByEmail(email?: string | null) {
  const pool = getPgPool();
  const normalized = normalizeEmail(email);
  if (!pool || !normalized) return null;

  await ensureOrderSystemTables();

  const invite = await pool.query(
    `select email, role, is_active
     from public.admin_invites
     where email = $1
     limit 1`,
    [normalized],
  );

  const row = invite.rows[0];
  if (!row || !row.is_active) return null;

  const userUuid = stableUuidFromEmail(normalized);

  const upsert = await pool.query(
    `insert into public.admin_users(user_uuid, email, role, is_active)
     values ($1::uuid, $2, $3, true)
     on conflict (user_uuid)
     do update set email=excluded.email, role=excluded.role, is_active=true, updated_at=now()
     returning user_uuid::text as user_uuid, email, role, is_active`,
    [userUuid, normalized, row.role],
  );

  return upsert.rows[0] || null;
}

export async function getAdminUserByEmail(email?: string | null) {
  const pool = getPgPool();
  const normalized = normalizeEmail(email);
  if (!pool || !normalized) return null;

  await ensureOrderSystemTables();
  const userUuid = stableUuidFromEmail(normalized);
  const result = await pool.query(
    `select user_uuid::text as user_uuid, email, role, is_active
     from public.admin_users
     where user_uuid = $1::uuid
     limit 1`,
    [userUuid],
  );

  return result.rows[0] || null;
}

export async function generateOrderNo(client: any) {
  const now = new Date();
  const dateKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  const seqResult = await client.query(
    `insert into public.order_no_sequences(date_key, last_seq)
     values ($1, 1)
     on conflict (date_key)
     do update set last_seq = public.order_no_sequences.last_seq + 1, updated_at=now()
     returning last_seq`,
    [dateKey],
  );

  const seq = Number(seqResult.rows?.[0]?.last_seq || 1);
  return `CP${dateKey}${String(seq).padStart(4, "0")}`;
}


export async function upsertAdminInvite(email: string, role: AdminRole, isActive = true) {
  const pool = getPgPool();
  if (!pool) throw new Error("db_not_configured");
  await ensureOrderSystemTables();

  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("email_required");

  const result = await pool.query(
    `insert into public.admin_invites(email, role, is_active)
     values ($1, $2, $3)
     on conflict (email)
     do update set role=excluded.role, is_active=excluded.is_active, updated_at=now()
     returning id, email, role, is_active, updated_at`,
    [normalized, role, isActive],
  );

  await syncAdminUserByEmail(normalized);
  return result.rows[0] || null;
}

export async function getActiveOwnerCount() {
  const pool = getPgPool();
  if (!pool) return 0;
  await ensureOrderSystemTables();

  const result = await pool.query(
    `select count(*)::int as cnt
     from public.admin_invites
     where role='OWNER' and is_active=true`,
  );

  return Number(result.rows?.[0]?.cnt || 0);
}
