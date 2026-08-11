# backend

The backend is [Supabase](https://supabase.com) — a hosted Postgres database with an
auto-generated REST API and built-in auth. There is no server to write or deploy here;
`supabase/` holds the SQL that defines it.

## Set up your project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any name/region,
   set a database password (save it somewhere — you likely won't need it day to day,
   Supabase manages connections for you).
2. Wait for it to finish provisioning (~2 minutes).
3. Open **SQL Editor** → **New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), run it.
4. New query again, paste [`supabase/seed.sql`](supabase/seed.sql), run it. This loads
   the 3 modules and 18 posts (one with a full article body) so the site isn't empty.
5. Go to **Project Settings → API**. Copy two values:
   - **Project URL**
   - **anon public** key (this is safe to put in frontend code/env vars — it's the
     public client key; the RLS policies in `schema.sql` are what actually keep your
     personal journal data private, not keeping this key secret)
6. Go to **Authentication → Providers**, make sure **Email** is enabled (it is by
   default). This app uses magic-link email sign-in for Ghi/bite-size — no passwords.

Give the URL and anon key to whoever is wiring up `frontend/.env` (see
`frontend/.env.example`).

## Editing content

There's no admin UI yet. To add or edit a post: **Table Editor → posts** (or
**modules**) in the Supabase dashboard — it's a spreadsheet-style grid, click a cell to
edit it. `body` on a post is the full article, written as JSON (see the CGA post in
`seed.sql` for the shape). A nicer in-app editor can be built later if this gets
tedious.

## Schema

- `modules`, `posts` — editorial content. Public read, no client write access (edit
  from the Table Editor, or later from a trusted admin tool using the `service_role`
  key — never ship that key to the frontend).
- `activity_kinds`, `hour_logs`, `notes` — personal journal data (Ghi / bite-size).
  Row Level Security scopes every row to `auth.uid()`, so each signed-in user only
  ever sees their own.
