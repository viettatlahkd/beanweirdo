-- Tầng nội dung: cây chủ đề, tag theme, địa chỉ bài cố định, quyền xem.
--
-- Khung ba tầng (feature · nội dung · display) chủ site duyệt 2026-10-01; cây
-- chủ đề chốt 2026-10-02. Series tạm chưa làm (chủ site: ít dùng) — chuỗi bài
-- được đánh dấu bằng tag. Đây
-- là phần **mở rộng** của tầng nội dung: chỉ thêm bảng và cột, không bỏ gì.
-- Cột cũ (`posts.module_id`, `pinned`, `sort_order`) vẫn chạy song
-- song cho tới khi tầng feature thay chỗ chúng; khi đó một migration khác mới
-- bỏ chúng đi.
--
-- Dạng bài để nguyên (chủ site 2026-10-02: lưu riêng, can thiệp sau):
-- posts.kind cùng bảng tags (note, ref, log, book-film…) từ giờ mang nghĩa
-- "dạng bài". Tag theme nối các bài là một bộ từ vựng khác hẳn, nên nằm ở bảng
-- riêng `keywords` (schema.org: keywords) thay vì trộn vào bảng tags.
--
-- Không chép dữ liệu ở đây: gắn bài vào cây chủ đề và gắn tag chạy bằng REST
-- sau khi chủ site duyệt bản xếp 31 bài.
--
-- Số hiệu 0027: 0026 là migration cuối đã có.

-- ---------------------------------------------------------------------------
-- 1. Cây chủ đề: subject › topic, một bảng, sâu tối đa hai tầng.
--
-- Một bảng chứ không phải hai, theo SKOS (broader/narrower) và taxonomy của
-- Drupal: gộp, tách, dời một topic sang subject khác chỉ là đổi parent_id.
-- Nút gốc (parent_id null) là subject, nút con là topic.
-- ---------------------------------------------------------------------------
create table if not exists public.topics (
  -- Đi thẳng vào URL sau này, nên cùng khuôn slug với portfolio_pages.
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  parent_id   text references public.topics(id) on delete restrict,
  title       text not null,
  intro       text not null default '',
  -- Danh tính thị giác đi theo chủ đề chứ không theo trang: bài hiện ở feature
  -- nào cũng mang màu của chủ đề nó. Topic để null thì lấy màu của subject.
  accent      text,
  on_color    text,
  tint        text,
  tint2       text,
  image_url   text,
  sort_order  int  not null default 0,
  visibility  text not null default 'public' check (visibility in ('public', 'private')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create index if not exists topics_parent_idx on public.topics (parent_id, sort_order);

-- Sâu tối đa hai tầng. CHECK không nhìn được hàng khác, nên dùng trigger.
create or replace function public.topics_two_levels() returns trigger
language plpgsql as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.topics where id = new.parent_id and parent_id is not null) then
      raise exception 'cây chủ đề sâu tối đa hai tầng: % đã là topic', new.parent_id;
    end if;
    if exists (select 1 from public.topics where parent_id = new.id) then
      raise exception 'subject % đang có topic, không thể thành topic', new.id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists topics_two_levels on public.topics;
create trigger topics_two_levels
  before insert or update of parent_id on public.topics
  for each row execute function public.topics_two_levels();

-- Một nút xem được khi chính nó và subject của nó đều công khai: cấp hẹp nhất
-- thắng. security definer để chính sách của posts gọi được mà không cần anon
-- có quyền đọc hàng riêng tư của topics.
create or replace function public.topic_is_public(t text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(bool_and(visibility = 'public'), false)
  from public.topics
  where id = t or id = (select parent_id from public.topics where id = t)
$$;

-- ---------------------------------------------------------------------------
-- 2. Bài: chỗ trên cây, quyền xem.
-- ---------------------------------------------------------------------------
alter table public.posts
  add column if not exists topic_id   text references public.topics(id) on delete restrict,
  add column if not exists visibility text not null default 'public';

alter table public.posts drop constraint if exists posts_visibility_check;
alter table public.posts add constraint posts_visibility_check
  check (visibility in ('public', 'private'));

create index if not exists posts_topic_idx on public.posts (topic_id);

-- Xoá module từng xoá luôn bài của nó (0001, on delete cascade), không qua
-- thùng rác. Đổi thành chặn: module còn bài thì không xoá được.
alter table public.posts drop constraint if exists posts_module_id_fkey;
alter table public.posts add constraint posts_module_id_fkey
  foreign key (module_id) references public.modules(id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 3. Tag theme: phẳng, mỗi bài 0 đến nhiều tag (chủ site chốt).
--
-- Xoá một tag thì bài chỉ bỏ tag đó (cascade trên bảng nối), không còn cảnh
-- cột NOT NULL chặn ngang như posts.kind.
-- ---------------------------------------------------------------------------
create table if not exists public.keywords (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label       text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.post_keywords (
  post_id     uuid not null references public.posts(id) on delete cascade,
  keyword_id  text not null references public.keywords(id) on delete cascade on update cascade,
  primary key (post_id, keyword_id)
);

create index if not exists post_keywords_keyword_idx on public.post_keywords (keyword_id);

-- ---------------------------------------------------------------------------
-- 4. Địa chỉ bài cố định.
--
-- posts.slug (có từ 0001, chưa ai ghi) thành địa chỉ chính thức, ghi một lần
-- lúc đăng. Địa chỉ cũ giữ ở đây để tự chuyển hướng khi bài đổi địa chỉ.
-- ---------------------------------------------------------------------------
create table if not exists public.post_slugs (
  slug        text primary key,
  post_id     uuid not null references public.posts(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists post_slugs_post_idx on public.post_slugs (post_id);

-- ---------------------------------------------------------------------------
-- 5. Quyền đọc: cấp hẹp nhất thắng, chặn ở database.
--
-- Trước: anon đọc mọi bài đã đăng hoặc lưu trữ, kể cả bài trong module riêng
-- tư. Sau: bài phải công khai, và chủ đề của nó (nếu đã gắn) cũng công khai.
-- topic_id null là bài chưa được gắn lên cây — giữ đọc được trong lúc chuyển,
-- để site không trống trang trước khi chép dữ liệu xong.
-- ---------------------------------------------------------------------------
drop policy if exists "posts are publicly readable" on public.posts;
create policy "posts are publicly readable" on public.posts
  for select using (
    status in ('published', 'archived')
    and visibility = 'public'
    and (topic_id is null or public.topic_is_public(topic_id))
  );

alter table public.topics    enable row level security;
alter table public.keywords      enable row level security;
alter table public.post_keywords enable row level security;
alter table public.post_slugs enable row level security;

drop policy if exists "topics đọc công khai" on public.topics;
create policy "topics đọc công khai" on public.topics
  for select using (public.topic_is_public(id));

-- Bảng nối và lịch sử địa chỉ đi theo bài: đọc được khi đọc được bài.
drop policy if exists "keywords đọc công khai" on public.keywords;
create policy "keywords đọc công khai" on public.keywords for select using (true);

drop policy if exists "post_keywords đọc công khai" on public.post_keywords;
create policy "post_keywords đọc công khai" on public.post_keywords
  for select using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists "post_slugs đọc công khai" on public.post_slugs;
create policy "post_slugs đọc công khai" on public.post_slugs
  for select using (exists (select 1 from public.posts p where p.id = post_id));

grant select on public.topics, public.keywords, public.post_keywords, public.post_slugs to anon, authenticated;
grant all on public.topics, public.keywords, public.post_keywords, public.post_slugs to service_role;
grant execute on function public.topic_is_public(text) to anon, authenticated, service_role;
