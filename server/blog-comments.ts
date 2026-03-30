import { getPgPool } from "./credits";

export type BlogCommentRow = {
  id: string;
  post_slug: string;
  parent_id: string | null;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export async function ensureBlogCommentTable() {
  const pool = getPgPool();
  if (!pool) return;

  await pool.query(`
    create table if not exists public.blog_comments (
      id uuid primary key default gen_random_uuid(),
      post_slug text not null,
      parent_id uuid null,
      user_id text not null,
      author_name text not null,
      content text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table public.blog_comments
      add column if not exists parent_id uuid null;

    create index if not exists idx_blog_comments_post_created
      on public.blog_comments(post_slug, created_at desc);

    create index if not exists idx_blog_comments_user
      on public.blog_comments(user_id, created_at desc);

    create or replace function public.touch_blog_comment_updated_at()
    returns trigger as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$ language plpgsql;

    drop trigger if exists trg_blog_comment_updated_at on public.blog_comments;
    create trigger trg_blog_comment_updated_at
      before update on public.blog_comments
      for each row execute procedure public.touch_blog_comment_updated_at();
  `);
}

export async function listBlogComments(postSlug: string): Promise<BlogCommentRow[]> {
  const pool = getPgPool();
  if (!pool) return [];
  await ensureBlogCommentTable();

  const result = await pool.query(
    `select id, post_slug, parent_id, user_id, author_name, content, created_at, updated_at
     from public.blog_comments
     where post_slug = $1
     order by created_at desc`,
    [postSlug],
  );

  return Array.isArray(result.rows) ? result.rows : [];
}

export async function createBlogComment(args: {
  postSlug: string;
  parentId?: string | null;
  userId: string;
  authorName: string;
  content: string;
}) {
  const pool = getPgPool();
  if (!pool) return null;
  await ensureBlogCommentTable();

  const result = await pool.query(
    `insert into public.blog_comments (post_slug, parent_id, user_id, author_name, content)
     values ($1, $2, $3, $4, $5)
     returning id, post_slug, parent_id, user_id, author_name, content, created_at, updated_at`,
    [args.postSlug, args.parentId || null, args.userId, args.authorName, args.content],
  );

  return result.rows?.[0] ?? null;
}

export async function updateBlogComment(args: {
  commentId: string;
  userId: string;
  content: string;
}) {
  const pool = getPgPool();
  if (!pool) return null;
  await ensureBlogCommentTable();

  const result = await pool.query(
    `update public.blog_comments
     set content = $3
     where id = $1 and user_id = $2
     returning id, post_slug, parent_id, user_id, author_name, content, created_at, updated_at`,
    [args.commentId, args.userId, args.content],
  );

  return result.rows?.[0] ?? null;
}

export async function deleteBlogComment(args: { commentId: string; userId: string }) {
  const pool = getPgPool();
  if (!pool) return false;
  await ensureBlogCommentTable();

  const result = await pool.query(
    `delete from public.blog_comments
     where id = $1 and user_id = $2`,
    [args.commentId, args.userId],
  );

  return (result.rowCount ?? 0) > 0;
}
