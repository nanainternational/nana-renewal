import { getPgPool } from "./credits";

export type PageVisitInput = {
  pagePath: string;
  visitorKey: string;
  sessionId: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
};

export async function ensurePageVisitTable() {
  const pool = getPgPool();
  if (!pool) return;

  await pool.query(`
    create table if not exists public.page_visits (
      id uuid primary key default gen_random_uuid(),
      page_path text not null,
      visitor_key text,
      session_id text,
      referrer text,
      utm_source text,
      utm_medium text,
      utm_campaign text,
      utm_content text,
      visited_at timestamptz not null default now()
    );

    create index if not exists idx_page_visits_path_time
      on public.page_visits(page_path, visited_at desc);

    create index if not exists idx_page_visits_visitor_key
      on public.page_visits(visitor_key);

    create index if not exists idx_page_visits_visited_at
      on public.page_visits(visited_at desc);
  `);

  const legacyTable = await pool.query(`select to_regclass('public.blog_visits') as table_name`);
  if (legacyTable.rows?.[0]?.table_name) {
    await pool.query(`
      insert into public.page_visits(id, page_path, visitor_key, visited_at)
      select id, page_slug, visitor_key, visited_at
      from public.blog_visits
      on conflict (id) do nothing
    `);
  }
}

export async function recordPageVisit(args: PageVisitInput) {
  const pool = getPgPool();
  if (!pool) throw new Error("db_not_configured");
  await ensurePageVisitTable();

  await pool.query(
    `insert into public.page_visits(
       page_path, visitor_key, session_id, referrer,
       utm_source, utm_medium, utm_campaign, utm_content
     ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      args.pagePath,
      args.visitorKey,
      args.sessionId,
      args.referrer || null,
      args.utmSource || null,
      args.utmMedium || null,
      args.utmCampaign || null,
      args.utmContent || null,
    ],
  );
}

export async function getPageVisitStats(days: 7 | 30) {
  const pool = getPgPool();
  if (!pool) throw new Error("db_not_configured");
  await ensurePageVisitTable();

  const interval = `${days} days`;
  const [totalsResult, pagesResult, sourcesResult, campaignsResult] = await Promise.all([
    pool.query(
      `select count(*)::int as page_views,
              count(distinct visitor_key)::int as unique_visitors,
              count(*) filter (where page_path = '/startup-center')::int as startup_center_views
       from public.page_visits
       where visited_at >= now() - $1::interval`,
      [interval],
    ),
    pool.query(
      `select page_path, count(*)::int as count
       from public.page_visits
       where visited_at >= now() - $1::interval
       group by page_path
       order by count desc, page_path asc`,
      [interval],
    ),
    pool.query(
      `select utm_source, count(*)::int as count
       from public.page_visits
       where visited_at >= now() - $1::interval
         and nullif(utm_source, '') is not null
       group by utm_source
       order by count desc, utm_source asc`,
      [interval],
    ),
    pool.query(
      `select utm_campaign, count(*)::int as count
       from public.page_visits
       where visited_at >= now() - $1::interval
         and nullif(utm_campaign, '') is not null
       group by utm_campaign
       order by count desc, utm_campaign asc`,
      [interval],
    ),
  ]);

  const totals = totalsResult.rows?.[0] || {};
  return {
    days,
    pageViews: Number(totals.page_views || 0),
    uniqueVisitors: Number(totals.unique_visitors || 0),
    startupCenterViews: Number(totals.startup_center_views || 0),
    pages: pagesResult.rows || [],
    utmSources: sourcesResult.rows || [],
    utmCampaigns: campaignsResult.rows || [],
  };
}
