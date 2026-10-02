-- Tầng feature: quy chế nối lớp trang với lớp nội dung.
--
-- Thiết kế chủ site duyệt 2026-10-02 (artifact "Tầng feature", bản 2):
--   * một quy chế = kéo gì (tầng + nút) → lọc thêm → nhóm → xếp → giới hạn → bày
--   * trang theo tầng: mỗi subject, topic, tag tự có trang theo một mẫu chung;
--     một nút có thể đè mẫu bằng cài đặt riêng
--   * trang dựng tay: trang có địa chỉ riêng, gồm các khối, mỗi khối một quy chế
--   * thanh điều hướng: tự thêm mọi subject theo thứ tự cây, xếp tay đè lên
--   * thứ tự tay là của quy chế, không của bài; bài mới vào đầu danh sách xếp tay
--
-- Chỉ thêm. `modules`, `posts.module_id`, `posts.pinned`, `posts.sort_order` vẫn
-- ở đó tới khi CMS chuyển hẳn sang quy chế (bước 3c) và một migration khác bỏ chúng.
--
-- Số hiệu 0028: 0027 là migration cuối đã có.

-- ---------------------------------------------------------------------------
-- 1. Quy chế
-- ---------------------------------------------------------------------------
create table if not exists public.listing_rules (
  id               uuid primary key default gen_random_uuid(),

  -- Kéo từ tầng nào. `topic` là một nút bất kỳ trên cây chủ đề (subject hay
  -- topic); `kind` là dạng bài, `template` là khuôn bài; `pick` là chọn tay
  -- từng bài; `all` là mọi bài.
  tier             text not null check (tier in ('topic', 'keyword', 'kind', 'template', 'pick', 'all')),
  -- Nút cố định (id chủ đề, id tag, dạng bài, khuôn, hoặc id bài với `pick`).
  nodes            text[] not null default '{}',
  -- Lấy nút từ chính trang đang mở thay vì `nodes`: một quy chế phục vụ cả một
  -- tầng (contextual filter của Drupal).
  from_page        boolean not null default false,
  -- Kéo một subject có kéo cả bài ở topic con của nó không.
  include_children boolean not null default true,
  -- Với tag: bài khớp bất kỳ tag nào, hay phải mang đủ mọi tag.
  match            text not null default 'any' check (match in ('any', 'all')),
  -- Nút loại trừ, cùng tầng với `tier`.
  exclude          text[] not null default '{}',
  -- Lọc thêm, rỗng là không lọc.
  kinds            text[] not null default '{}',
  templates        text[] not null default '{}',

  group_by         text not null default 'none' check (group_by in ('none', 'topic', 'keyword', 'kind', 'year')),
  sort             text not null default 'newest' check (sort in ('newest', 'oldest', 'manual', 'tree')),
  -- Với `manual`: bài chưa có trong `manual_order` đứng đầu (true) hay cuối.
  new_first        boolean not null default true,
  manual_order     uuid[] not null default '{}',
  -- Bài ghim đứng trước mọi cách xếp, theo đúng thứ tự trong mảng.
  pinned           uuid[] not null default '{}',
  limit_n          int check (limit_n is null or limit_n > 0),
  -- Bố cục, thẻ bài, cách mở — tầng display (bước 4) đọc phần này.
  display          jsonb not null default '{}'::jsonb,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Trang: trang dựng tay, mẫu theo tầng, thanh điều hướng
-- ---------------------------------------------------------------------------
create table if not exists public.pages (
  id            text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind          text not null check (kind in ('curated', 'template_subject', 'template_topic', 'template_keyword', 'nav')),
  title         text not null default '',
  -- Chữ cố định của trang (nhãn, lời dẫn).
  copy          jsonb not null default '{}'::jsonb,
  -- Bày trang: bố cục, màu, ảnh… Với `nav`: danh sách mục và cờ hiện.
  presentation  jsonb not null default '{}'::jsonb,
  -- Các khối của trang, theo thứ tự; mỗi phần tử là id một quy chế.
  blocks        uuid[] not null default '{}',
  -- Địa chỉ cũ vẫn mở được trang này (vd. id module trước đây).
  aliases       text[] not null default '{}',
  visibility    text not null default 'public' check (visibility in ('public', 'private')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Cài đặt đè của một nút lên mẫu tầng của nó
-- ---------------------------------------------------------------------------
create table if not exists public.page_overrides (
  node_type     text not null check (node_type in ('topic', 'keyword')),
  node_id       text not null,
  -- Quy chế riêng thay cho quy chế của mẫu; null là dùng mẫu.
  rule_id       uuid references public.listing_rules(id) on delete set null,
  presentation  jsonb not null default '{}'::jsonb,
  aliases       text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (node_type, node_id)
);

-- Xoá một nút thì cài đặt đè của nó đi theo: không để lại dòng mồ côi trỏ vào
-- một chủ đề hay tag không còn.
create or replace function public.drop_page_override() returns trigger
language plpgsql as $$
begin
  delete from public.page_overrides
  where node_type = tg_argv[0] and node_id = old.id;
  return old;
end $$;

drop trigger if exists topics_drop_override on public.topics;
create trigger topics_drop_override after delete on public.topics
  for each row execute function public.drop_page_override('topic');

drop trigger if exists keywords_drop_override on public.keywords;
create trigger keywords_drop_override after delete on public.keywords
  for each row execute function public.drop_page_override('keyword');

-- ---------------------------------------------------------------------------
-- 4. Quyền đọc: cấu hình trang là công khai, như site_settings
-- ---------------------------------------------------------------------------
alter table public.listing_rules  enable row level security;
alter table public.pages          enable row level security;
alter table public.page_overrides enable row level security;

drop policy if exists "listing_rules đọc công khai" on public.listing_rules;
create policy "listing_rules đọc công khai" on public.listing_rules for select using (true);

drop policy if exists "pages đọc công khai" on public.pages;
create policy "pages đọc công khai" on public.pages for select using (visibility = 'public');

drop policy if exists "page_overrides đọc công khai" on public.page_overrides;
create policy "page_overrides đọc công khai" on public.page_overrides for select using (true);

grant select on public.listing_rules, public.pages, public.page_overrides to anon, authenticated;
grant all on public.listing_rules, public.pages, public.page_overrides to service_role;
