-- 0013: templates get a table, because they are their own thing.
--
-- Until now "template" meant three unrelated things in this codebase:
--
--   1. `posts.template` — which renderer draws a post. That is a shape, and it
--      stays.
--   2. Starting content — which lived as constants compiled into the frontend
--      bundle (SAMPLE_CARDS, SAMPLE_BLOCKS). Unsaveable, uneditable, and
--      useless as the thing you reach for when writing the next post.
--   3. Nothing at all, for article / long-form / memo.
--
-- A template is stored content you keep so the next similar post starts from
-- it. It is not a post: no status, never published or archived, never in a
-- listing. Creating a post copies a template's body and then goes its own way
-- — the post is independent from that moment on.

create table if not exists templates (
  -- Generated, not a hand-written slug: templates are added from the admin the
  -- same way posts are, and inventing an id should not be part of that.
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',

  -- Which renderer draws it. Separate from the template itself on purpose:
  -- many templates may share one renderer. "Bài luận" and "Bài dịch ngắn" are
  -- both article-shaped while starting from very different content, and adding
  -- either is a row, not a migration.
  --
  -- The list is closed because each value is a React component that has to
  -- exist. A new *template* is data and needs nothing from an engineer; a new
  -- *shape* nobody has drawn yet is code, and that is the boundary.
  renderer    text not null check (renderer in ('article', 'cards', 'report', 'longform', 'memo')),

  -- The starting content, in whatever shape `renderer` reads.
  body        jsonb,

  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists templates_renderer_idx on templates (renderer, sort_order);

alter table templates enable row level security;

-- Templates are a writing tool, not site content: nothing public reads them.
-- Reached through the backend only, the way posts are for writing.
grant all on templates to service_role;
revoke all on templates from anon, authenticated;
