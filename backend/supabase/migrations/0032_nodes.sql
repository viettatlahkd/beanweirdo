-- Một bảng cho mọi trang của mọi site: `nodes`.
--
-- Chủ site (2026-10-13): "lưu type trong db khác nhau type? một cái là blog
-- một cái là port cùng trong 1 bảng sql và code cũng thế để sau còn scale".
-- Trước đây blog ở `topics` (cây chủ đề, 0027/0031) còn port ở
-- `portfolio_pages` (0025): hai khuôn, hai API, tính năng lệch nhau.
--
-- Cách làm:
--
--   1. `topics` ĐỔI TÊN thành `nodes` chứ không tạo bảng mới. Đổi tên giữ
--      nguyên khoá ngoại posts.topic_id, trigger xoá cài đặt đè (0028), chính
--      sách đọc — không phải chép lại một bài nào.
--   2. Thêm cột `site` ('blog' | 'port'), `slug`, `blocks`, `look`, `status`.
--      Trạng thái chung (chủ site chọn 2026-10-13): published / draft /
--      archived. Chủ đề "riêng tư" cũ thành nháp — người xem vẫn không thấy.
--   3. Chép trang port vào `nodes` với site = 'port', GIỮ NGUYÊN id (uuid dạng
--      chữ) — header.links và home.features trong site_settings trỏ vào id ấy.
--   4. `portfolio_pages` giữ nguyên, không ai ghi nữa. Xoá ở migration sau,
--      khi chủ site đã xem site chạy đúng.
--   5. View `topics` (chỉ đọc) cho bản code đang chạy: từ lúc chạy file này
--      đến lúc code mới deploy, site công khai vẫn đọc được cây blog.
--
-- Số hiệu 0032: 0031 là migration cuối đã chạy.

begin;

alter table public.topics rename to nodes;

alter table public.nodes
  add column if not exists site   text  not null default 'blog',
  add column if not exists slug   text,
  add column if not exists blocks jsonb not null default '[]'::jsonb,
  add column if not exists look   text,
  add column if not exists status text  not null default 'published';

update public.nodes set slug = id where slug is null;
update public.nodes set status = case visibility when 'private' then 'draft' else 'published' end;

alter table public.nodes
  alter column slug set not null,
  add constraint nodes_site_check   check (site in ('blog', 'port')),
  add constraint nodes_slug_check   check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint nodes_status_check check (status in ('draft', 'published', 'archived')),
  add constraint nodes_blocks_check check (jsonb_typeof(blocks) = 'array'),
  add constraint nodes_site_slug_key unique (site, slug);

-- Chặn vòng như 0031, và thêm: mục cha phải cùng site.
create or replace function public.nodes_no_cycle() returns trigger
language plpgsql as $$
begin
  if new.parent_id is not null then
    if not exists (select 1 from public.nodes where id = new.parent_id and site = new.site) then
      raise exception 'mục % phải nằm trong một mục cùng site', new.id;
    end if;
    if exists (
      with recursive up(id) as (
        select new.parent_id
        union
        select t.parent_id from public.nodes t join up on t.id = up.id where t.parent_id is not null
      )
      select 1 from up where id = new.id
    ) then
      raise exception 'mục % không thể nằm trong chính nó hay trong mục con của nó', new.id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists topics_no_cycle on public.nodes;
drop function if exists public.topics_no_cycle();
create trigger nodes_no_cycle
  before insert or update of parent_id, site on public.nodes
  for each row execute function public.nodes_no_cycle();

-- Trang port: id cũ giữ nguyên. Mục gốc (parent_id null) như subject của blog.
insert into public.nodes (id, site, slug, title, intro, look, blocks, status, sort_order, created_at, updated_at)
select id::text, 'port', slug, title, intro, palette, blocks, status, sort_order, created_at, updated_at
from public.portfolio_pages
on conflict (id) do nothing;

-- Xem được khi chính nó và mọi mục phía trên đã đăng (cấp hẹp nhất thắng, 0031).
-- Tên hàm giữ nguyên: chính sách đọc của posts (0027) gọi nó.
create or replace function public.topic_is_public(t text) returns boolean
language sql stable security definer set search_path = public as $$
  with recursive up(id, parent_id, status) as (
    select id, parent_id, status from public.nodes where id = t
    union
    select p.id, p.parent_id, p.status from public.nodes p join up on p.id = up.parent_id
  )
  select coalesce(bool_and(status = 'published'), false) from up
$$;

alter table public.nodes drop column visibility;

drop policy if exists "topics đọc công khai" on public.nodes;
drop policy if exists "nodes đọc công khai" on public.nodes;
create policy "nodes đọc công khai" on public.nodes
  for select using (public.topic_is_public(id));

create index if not exists nodes_site_idx on public.nodes (site, parent_id, sort_order);

grant select on public.nodes to anon, authenticated;
grant all on public.nodes to service_role;

-- Cầu tạm cho bản code cũ, đúng hình `topics` trước đây. security_invoker để
-- người xem đi qua chính sách đọc của nodes, không phải quyền chủ view.
create view public.topics with (security_invoker = true) as
  select id, parent_id, title, intro, accent, on_color, tint, tint2, image_url, sort_order,
         case status when 'published' then 'public' else 'private' end as visibility,
         created_at, updated_at
  from public.nodes where site = 'blog';

grant select on public.topics to anon, authenticated, service_role;

commit;

-- Kiểm tra: dán kết quả câu này lại cho Claude.
-- Mong đợi: một dòng blog với số chủ đề cũ, một dòng port với số trang port cũ,
-- và cột cuối bằng nhau ở dòng port.
select n.site, count(*) as so_muc,
       count(*) filter (where n.status = 'published') as da_dang,
       (select count(*) from public.portfolio_pages) as trang_port_cu
from public.nodes n group by n.site order by n.site;
