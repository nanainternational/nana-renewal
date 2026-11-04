-- Private server-only data. Website sessions are verified by Express, not Supabase Auth.
begin;
create schema if not exists happy_call;
revoke all on schema happy_call from public, anon, authenticated, service_role;
create table if not exists happy_call.settings (
  owner_id text primary key,
  store_name text not null default '',
  support_text text not null default '상품에 이상이 있거나 불편한 점이 있으시면 이 번호로 편하게 답장 주세요. 확인 후 안내해 드리겠습니다.',
  delay_days integer not null default 2 check(delay_days between 0 and 30),
  send_hour integer not null default 10 check(send_hour between 8 and 19),
  paused boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists happy_call.devices (
  id uuid primary key default gen_random_uuid(), owner_id text not null,
  name text not null, token_hash text not null unique, android_id text,
  pairing_expires_at timestamptz not null default now() + interval '15 minutes',
  last_seen_at timestamptz, revoked_at timestamptz, next_send_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists happy_call_one_device on happy_call.devices(owner_id) where revoked_at is null;
create table if not exists happy_call.orders (
  id uuid primary key default gen_random_uuid(), owner_id text not null,
  order_no text not null, customer_name text not null default '', phone text not null,
  product_name text not null, product_option text not null default '', delivered_on date not null,
  created_at timestamptz not null default now(), expires_at timestamptz not null default now() + interval '180 days',
  unique(owner_id, order_no)
);
create table if not exists happy_call.exclusions (
  owner_id text not null, phone text not null, created_at timestamptz not null default now(),
  primary key(owner_id, phone)
);
create table if not exists happy_call.jobs (
  id uuid primary key default gen_random_uuid(), owner_id text not null,
  order_id uuid not null unique references happy_call.orders(id) on delete cascade,
  phone text not null, message text not null, scheduled_at timestamptz not null,
  status text not null default 'queued' check(status in ('queued','processing','sent','failed','cancelled')),
  device_id uuid references happy_call.devices(id), processing_at timestamptz, completed_at timestamptz,
  error text, created_at timestamptz not null default now()
);
create index if not exists happy_call_orders_owner on happy_call.orders(owner_id, created_at desc);
create index if not exists happy_call_jobs_due on happy_call.jobs(owner_id, scheduled_at) where status='queued';
create index if not exists happy_call_jobs_sent on happy_call.jobs(owner_id,phone,completed_at) where status='sent';
create index if not exists happy_call_jobs_device on happy_call.jobs(device_id);
create index if not exists happy_call_orders_expiry on happy_call.orders(expires_at);
create index if not exists happy_call_devices_owner_created on happy_call.devices(owner_id,created_at);
alter table happy_call.settings enable row level security;
alter table happy_call.devices enable row level security;
alter table happy_call.orders enable row level security;
alter table happy_call.exclusions enable row level security;
alter table happy_call.jobs enable row level security;
revoke all on all tables in schema happy_call from public, anon, authenticated, service_role;
commit;
