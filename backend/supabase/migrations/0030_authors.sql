-- Nhiều tác giả.
--
-- Chủ site (2026-09-30): "nhiều author khác nhau có thể lên đây viết bài và 1
-- bài có thể có nhiều co authored với nhau, nên sẽ cần 1 màn quản lý".
--
-- Hai bảng:
--
--   authors        hồ sơ công khai — tên, slug, ảnh, tiểu sử, còn hoạt động
--                  hay đã tắt. Trang công khai đọc bảng này bằng khoá anon để
--                  vẽ dòng tác giả, nên nó KHÔNG được chứa gì bí mật.
--   post_authors   ai viết bài nào, theo thứ tự hiện trên dòng tác giả.
--
-- Tác giả không có tài khoản riêng: chủ site (2026-09-30) chốt khu quản trị
-- vẫn chỉ có một mã đăng nhập chung như hiện nay.
--
-- Dự án không có default privileges (xem 0006, 0029): mọi bảng mới phải tự
-- `grant` cho service_role, nếu không API nhận 42501.
--
-- Số hiệu 0030: 0029 là migration cuối đã chạy.

create table if not exists public.authors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  avatar_url  text,
  bio         text not null default '',
  -- Tắt thì không chọn được cho bài mới; bài cũ vẫn giữ tên họ trên dòng
  -- tác giả.
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.post_authors (
  post_id    uuid not null references public.posts(id) on delete cascade,
  -- restrict: xoá một tác giả còn đứng tên bài thì bài mất tên người viết mà
  -- không ai hay. API từ chối trước; đây là chốt chặn cuối.
  author_id  uuid not null references public.authors(id) on delete restrict,
  position   int  not null default 0,
  primary key (post_id, author_id)
);

create index if not exists post_authors_author_idx on public.post_authors (author_id);

alter table public.authors enable row level security;
alter table public.post_authors enable row level security;

drop policy if exists "authors đọc công khai" on public.authors;
create policy "authors đọc công khai" on public.authors for select using (true);

-- Chỉ lộ tác giả của bài mà người đọc vốn thấy được: câu `exists` chạy dưới
-- RLS của `posts`, nên bài nháp không lộ ra ai đang viết nó.
drop policy if exists "post_authors theo bài đọc được" on public.post_authors;
create policy "post_authors theo bài đọc được" on public.post_authors for select
  using (exists (select 1 from public.posts p where p.id = post_id));

grant select on public.authors, public.post_authors to anon, authenticated;
grant all on public.authors, public.post_authors to service_role;

-- Kiểm: phải ra đúng 2 dòng, mỗi bảng một dòng, cột `service_role` là 'ok'.
select t.table_name,
       case when exists (
         select 1 from information_schema.role_table_grants g
          where g.table_name = t.table_name and g.grantee = 'service_role' and g.privilege_type = 'INSERT'
       ) then 'ok' else 'THIẾU' end as service_role
  from information_schema.tables t
 where t.table_schema = 'public' and t.table_name in ('authors', 'post_authors')
 order by t.table_name;
