-- 0008: the personal journal, rebuilt for a site with one author.
--
-- 0001 modelled activity_kinds / hour_logs / notes for Supabase Auth: every
-- row carries `user_id references auth.users(id)`, and RLS scopes each one to
-- `auth.uid() = user_id`.
--
-- The app that actually got built never uses Supabase Auth. It signs in with a
-- single static password and issues its own HMAC bearer token
-- (backend/lib/auth.ts). There is no row in auth.users, so `auth.uid()` is
-- always null and those policies deny every read and every write — which is
-- why all three tables have sat empty since they were created.
--
-- This is one person's journal. Rather than bolt an auth system on to populate
-- a column that would only ever hold one value, the column goes, and these
-- tables are reached the way `posts` already is: through the backend, which
-- holds the service-role key. The login still guards them — just at the API
-- door rather than at the row.

-- ── Drop the per-user coupling ──────────────────────────────────────────────
-- Order matters: each policy's `auth.uid() = user_id` is a dependency on the
-- column, and Postgres will not let the column be pulled out from under it
-- (2BP01). Dismiss the policies first, then the column — which takes its
-- foreign key, its unique constraint and the (user_id, date) index with it.

drop policy if exists "users manage their own activity kinds" on activity_kinds;
drop policy if exists "users manage their own hour logs" on hour_logs;
drop policy if exists "users manage their own notes" on notes;

alter table hour_logs drop column if exists user_id;
alter table activity_kinds drop column if exists user_id;
alter table notes drop column if exists user_id;

-- Kind names were unique per user; with one author they are simply unique.
alter table activity_kinds drop constraint if exists activity_kinds_user_id_name_key;
create unique index if not exists activity_kinds_name_key on activity_kinds (name);

-- The journal is always read a span of days at a time.
create index if not exists hour_logs_date_idx on hour_logs (date);
create index if not exists notes_d_idx on notes (d desc);

-- ── Who may touch what ──────────────────────────────────────────────────────

-- 0006 handed `all` on these three to `authenticated`, for the Supabase Auth
-- flow that never arrived. Nothing signs in that way, so take it back.
revoke all on activity_kinds, hour_logs, notes from authenticated;
revoke all on activity_kinds, hour_logs, notes from anon;

-- Ghi 02 is private: the practice log and its kinds are readable only through
-- the backend. RLS stays on with no permissive policy, so the anon key sees
-- nothing even if the grant above were ever restored by mistake — two locks,
-- because this is the table that would hurt most to leak.
alter table activity_kinds enable row level security;
alter table hour_logs enable row level security;

-- Ghi 01 is a public page: anyone may read the notes, only the backend writes.
alter table notes enable row level security;
drop policy if exists "notes are publicly readable" on notes;
create policy "notes are publicly readable" on notes for select using (true);
grant select on notes to anon, authenticated;

grant all on activity_kinds, hour_logs, notes to service_role;

-- ── Seed the four kinds the journal ships with ──────────────────────────────
-- Matches KINDS in frontend/src/content/hours.ts. More can be added from the
-- journal itself; these exist so the first visit has something to file under.

insert into activity_kinds (name, sort_order) values
  ('đọc', 1), ('thực hành', 2), ('viết', 3), ('quan sát', 4)
on conflict (name) do nothing;
