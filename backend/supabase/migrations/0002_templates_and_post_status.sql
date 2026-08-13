-- 0002: templates library + post status lifecycle

create table templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  layout      text not null check (layout in ('band', 'specimen', 'sequence')),
  accent      text not null,
  on_color    text not null,
  tint        text not null,
  tint2       text not null,
  created_at  timestamptz not null default now()
);

alter table posts
  add column status          text not null default 'draft'
                              check (status in ('draft', 'published', 'archived', 'deleted')),
  -- Nullable: every new draft starts with no template chosen.
  add column template_id     uuid references templates(id) on delete restrict,
  add column hero_image_url  text,
  add column published_at    timestamptz,
  add column deleted_at      timestamptz,
  add column previous_status text,
  add column updated_at      timestamptz not null default now(),
  add constraint posts_previous_status_check
    check (previous_status is null or previous_status in ('draft', 'published', 'archived')),
  add constraint posts_deleted_has_previous_status
    check (status <> 'deleted' or previous_status is not null);

create index if not exists posts_status_idx on posts (status);

alter table templates enable row level security;
drop policy if exists "templates are publicly readable" on templates;
create policy "templates are publicly readable" on templates
  for select using (true);
