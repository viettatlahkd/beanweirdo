-- beanweirdo — Supabase schema
--
-- Run this in the Supabase project's SQL editor (Dashboard → SQL Editor → New query),
-- then run seed.sql to load the current prototype content.
--
-- Two kinds of data live here:
--   - modules / posts: editorial content. Public to read, write-protected so it can
--     only be edited from the Supabase Table Editor (or with the service_role key) —
--     that's the "where do I type in a new post" answer for now.
--   - activity_kinds / hour_logs / notes: personal journal data. Each row belongs to
--     exactly one signed-in user (auth.uid()) and only that user can read or write it.

create extension if not exists "pgcrypto";

-- ── Editorial content ──────────────────────────────────────────────────────

create table if not exists modules (
  id           text primary key,               -- slug: 'sensory', 'biochem', 'roasting'
  title        text not null,
  accent       text not null,                   -- module colour block
  on_color     text not null,                   -- text colour that sits on `accent`
  tint         text not null,
  tint2        text not null,
  layout       text not null check (layout in ('band', 'specimen', 'sequence')),
  concept      text not null,
  blurb        text not null,
  long_desc    text not null,
  treatment    text not null,
  layout_note  text not null,
  shot1        text not null,
  shot2        text not null,
  shot3        text not null,
  sort_order   int not null default 0
);

create table if not exists posts (
  id               uuid primary key default gen_random_uuid(),
  module_id        text not null references modules(id) on delete cascade,
  n                text not null,                -- display index, '01'..'06'
  en               text not null,                -- English title
  vi               text not null,                -- Vietnamese description
  kind             text not null check (kind in ('note', 'essay', 'ref', 'log')),
  date_label       text not null,                -- 'YYYY.MM' shown in listings
  slug             text unique,
  -- Full article body, only populated for posts that have a real essay written:
  -- an array of { h, p, fig? } sections — see frontend/src/content/article.ts
  -- for the shape `fig` takes.
  body             jsonb,
  hero_caption     text,
  lead             text,                          -- italic dek under the H1
  pull_quote       text,
  further_reading  text[],
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists posts_module_id_idx on posts (module_id);

-- ── Personal journal ────────────────────────────────────────────────────────

create table if not exists activity_kinds (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists hour_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  name        text not null default '',
  kind        text not null,
  mins        int not null check (mins > 0),
  at          time not null,
  done        boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists hour_logs_user_date_idx on hour_logs (user_id, date);

create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  d           date not null,
  k           text not null check (k in ('quan sát', 'video', 'cảm nhận', 'liên ngành')),
  t           text not null,
  b           text not null,
  len         text not null check (len in ('dài', 'vừa', 'ngắn', 'media')),
  media_hint  text,
  portrait    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notes_user_date_idx on notes (user_id, d desc);

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table modules enable row level security;
alter table posts enable row level security;
alter table activity_kinds enable row level security;
alter table hour_logs enable row level security;
alter table notes enable row level security;

-- Editorial content: readable by anyone (including signed-out visitors), no
-- insert/update/delete policy for anon or authenticated — edit from the Table
-- Editor (which uses the privileged service_role connection and bypasses RLS).
create policy "modules are publicly readable" on modules
  for select using (true);

create policy "posts are publicly readable" on posts
  for select using (true);

-- Personal journal: every operation is scoped to the row's own user_id.
create policy "users manage their own activity kinds" on activity_kinds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own hour logs" on hour_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own notes" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
