-- 0007: site copy + module photography, both editable from the CMS screen.
--
-- The Content-management screen (design v4) edits two things the schema had no
-- home for: the site's own copy (mastheads, intros, plate captions, sidebar
-- section names) and a photo per module image slot.
--
-- Copy lands in one row of one table rather than a column per string. It is a
-- flat bag of ~25 strings with no relations and no queries beyond "give me all
-- of it", and it grows every time a screen gains a heading — a jsonb blob keeps
-- that growth out of migrations. Blank values are absent keys: the frontend
-- falls back to SITE_DEFAULTS (frontend/src/content/site.ts), so clearing a
-- field in the CMS restores the shipped copy instead of blanking the page.

create table if not exists site_settings (
  -- One row, enforced: `id` can only ever be true.
  id boolean primary key default true check (id),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into site_settings (id, data) values (true, '{}'::jsonb)
on conflict (id) do nothing;

alter table site_settings enable row level security;

-- The public screens read their own copy with the anon key, same as modules.
drop policy if exists "site settings are publicly readable" on site_settings;
create policy "site settings are publicly readable" on site_settings
  for select using (true);

grant select on site_settings to anon, authenticated;
grant all on site_settings to service_role;

-- Module image slots. The captions (shot1..3) already exist and describe what
-- each slot should hold; these carry the uploaded photo's public URL, and stay
-- null until one is uploaded (the tinted placeholder block shows meanwhile).
alter table modules add column if not exists img1 text;
alter table modules add column if not exists img2 text;
alter table modules add column if not exists img3 text;

-- Design v4 renames roasting and swaps it ahead of biochemistry, so the reading
-- order matches how the modules are introduced on the landing screen. Both are
-- CMS-editable now, so these updates are guarded to the seeded values — an
-- install where someone has already renamed or reordered is left alone.
update modules set title = 'roasting 101' where id = 'roasting' and title = 'roasting';
update modules set sort_order = 2 where id = 'roasting' and sort_order = 3;
update modules set sort_order = 3 where id = 'biochem' and sort_order = 2;
