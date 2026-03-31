import { getPgPool } from "./credits";

const BLOG_VISIT_BASE = Number(process.env.BLOG_VISIT_BASE || 980000);

export async function ensureBlogVisitTable() {
  const pool = getPgPool();
  if (!pool) return;

  await pool.query(`
    create table if not exists public.blog_visits (
      id uuid primary key default gen_random_uuid(),
      page_slug text not null,
      visitor_key text,
      visited_at timestamptz not null default now()
    );

    create index if not exists idx_blog_visits_slug_time
      on public.blog_visits(page_slug, visited_at desc);

    create index if not exists idx_blog_visits_visited_at
      on public.blog_visits(visited_at desc);
  `);
}

export async function recordBlogVisit(args: { pageSlug: string; visitorKey?: string | null }) {
  const pool = getPgPool();
  if (!pool) return;
  await ensureBlogVisitTable();

  await pool.query(
    `insert into public.blog_visits(page_slug, visitor_key)
     values ($1, $2)`,
    [args.pageSlug, args.visitorKey || null],
  );
}

export async function getBlogVisitSummary(days = 7) {
  const pool = getPgPool();
  if (!pool) return { total: BLOG_VISIT_BASE, today: 0, daily: [] as Array<{ date: string; count: number }> };
  await ensureBlogVisitTable();

  const totalResult = await pool.query(`select count(*)::int as total from public.blog_visits`);
  const total = Number(totalResult.rows?.[0]?.total || 0);

  const safeDays = Math.max(1, Math.min(days, 30));
  const dailyResult = await pool.query(
    `select to_char(day_series::date, 'YYYY-MM-DD') as date,
            coalesce(count(v.id), 0)::int as count
     from generate_series((current_date - ($1::int - 1) * interval '1 day')::date, current_date::date, interval '1 day') as day_series
     left join public.blog_visits v
       on (v.visited_at at time zone 'UTC')::date = day_series::date
     group by day_series
     order by day_series asc`,
    [safeDays],
  );

  return {
    total: total + BLOG_VISIT_BASE,
    today: Number(dailyResult.rows?.[dailyResult.rows.length - 1]?.count || 0),
    daily: Array.isArray(dailyResult.rows) ? dailyResult.rows : [],
  };
}
