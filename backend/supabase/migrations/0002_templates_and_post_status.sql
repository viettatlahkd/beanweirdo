-- 0002: templates library + post status lifecycle

create table templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
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
  add column template_id     uuid references templates(id),
  add column hero_image_url  text,
  add column published_at    timestamptz,
  add column deleted_at      timestamptz,
  add column previous_status text;

alter table templates enable row level security;
create policy "templates are publicly readable" on templates
  for select using (true);
