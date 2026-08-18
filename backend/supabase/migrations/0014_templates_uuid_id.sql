-- 0014: fix 0013 — `templates.id` should be a generated uuid.
--
-- 0013 was applied in an earlier form that gave `id` a text type and no
-- default, so every insert had to invent one. The corrected version was run
-- afterwards and did nothing at all: `create table if not exists` guards the
-- table's existence, not its shape, so a rewritten definition is silently a
-- no-op once the table is there. Worth remembering — the guard that makes a
-- migration safe to re-run is the same guard that hides an edit to it.
--
-- The table never took a row, so this replaces it outright rather than altering
-- the column type in place.

drop table if exists templates;

create table templates (
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
grant all on templates to service_role;
revoke all on templates from anon, authenticated;
