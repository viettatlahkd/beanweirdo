# backend

The backend is [Supabase](https://supabase.com) — a hosted Postgres database with an
auto-generated REST API and built-in auth. There is no server to write or deploy here;
`supabase/` holds the SQL that defines it.

## Set up your project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any name/region,
   set a database password (save it somewhere — you likely won't need it day to day,
   Supabase manages connections for you).
2. Wait for it to finish provisioning (~2 minutes).
3. Go to **Project Settings → API**. Copy two values:
   - **Project URL**
   - **anon public** key (this is safe to put in frontend code/env vars — it's the
     public client key; the RLS policies in `supabase/migrations/` are what actually
     keep your personal journal data private, not keeping this key secret)
4. Go to **Authentication → Providers**, make sure **Email** is enabled (it is by
   default). This app uses magic-link email sign-in for Ghi/bite-size — no passwords.
5. From the project's **Project Settings → General** page, copy the **Reference ID**.
   From `backend/`, run `npx supabase link --project-ref <ref>`, then
   `npx supabase db push` — this applies every migration in `supabase/migrations/`
   (tables, RLS policies, the `post-images` storage bucket) to the fresh project. Run
   `psql` or the SQL editor with the contents of `supabase/seed.sql` afterwards if you
   want the prototype content loaded too.

Give the URL and anon key to whoever is wiring up `frontend/.env` (see
`frontend/.env.example`).

## Local development

This project uses the [Supabase CLI](https://supabase.com/docs/guides/cli) for
migrations instead of pasting SQL into the dashboard by hand.

```bash
cd backend
npm install
npm run db:start   # starts local Postgres + Studio via Docker
npm run db:reset   # applies every migration in supabase/migrations/, then supabase/seed.sql
npm test           # verifies the schema landed correctly
```

To push migrations to your hosted Supabase project: `npx supabase link --project-ref <ref>`,
then `npx supabase db push`.

## Editing content

There's no admin UI yet. To add or edit a post: **Table Editor → posts** (or
**modules**) in the Supabase dashboard — it's a spreadsheet-style grid, click a cell to
edit it. `body` on a post is the full article, written as JSON (see the CGA post in
`seed.sql` for the shape). A row added this way defaults to `status = 'draft'` and is
not publicly readable — it won't show up on the public site until you edit that cell
to `'published'`. A nicer in-app editor can be built later if this gets tedious.

## Schema

- `modules`, `posts` — editorial content. `posts` has a `status` lifecycle
  (`draft`/`published`/`archived`/`deleted`); public (anon) read covers only
  `published` and `archived` rows — `draft` and `deleted` are readable only via the
  Table Editor or a trusted tool using the `service_role` key (never ship that key to
  the frontend). No client write access to any status.
- `templates` — reusable layout + colour presets (`band`/`specimen`/`sequence`) that a
  post can reference via `posts.template_id`. Public read, same no-client-write model
  as `modules`/`posts`.
- `storage.objects` in the `post-images` bucket — hero/inline images for posts. Public
  read; uploads go through a trusted tool using the `service_role` key.
- `activity_kinds`, `hour_logs`, `notes` — personal journal data (Ghi / bite-size).
  Row Level Security scopes every row to `auth.uid()`, so each signed-in user only
  ever sees their own.
