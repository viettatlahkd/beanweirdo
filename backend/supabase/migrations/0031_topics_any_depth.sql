-- Cây chủ đề lồng sâu bao nhiêu tầng cũng được.
--
-- Chủ site chọn ngày 2026-10-08: cây trang của site phải thêm được mục và kéo
-- mục vào trong hay ra ngoài mục khác ở mọi tầng, như cây module cũ (PR #30).
-- 0027 giới hạn hai tầng (subject › topic) bằng trigger `topics_two_levels`.
-- Bản này bỏ giới hạn ấy, và thay bằng đúng một luật mà cây nào cũng cần:
-- không có vòng (một mục không được nằm trong chính nó hay trong con cháu của nó).
--
-- Nút gốc (parent_id null) vẫn là subject; mọi nút sâu hơn là topic.

drop trigger if exists topics_two_levels on public.topics;
drop function if exists public.topics_two_levels();

create or replace function public.topics_no_cycle() returns trigger
language plpgsql as $$
begin
  if new.parent_id is not null and exists (
    with recursive up(id) as (
      select new.parent_id
      union
      select t.parent_id from public.topics t join up on t.id = up.id where t.parent_id is not null
    )
    select 1 from up where id = new.id
  ) then
    raise exception 'chủ đề % không thể nằm trong chính nó hay trong mục con của nó', new.id;
  end if;
  return new;
end $$;

drop trigger if exists topics_no_cycle on public.topics;
create trigger topics_no_cycle
  before insert or update of parent_id on public.topics
  for each row execute function public.topics_no_cycle();

-- Một nút xem được khi chính nó và mọi nút phía trên nó đều công khai: cấp hẹp
-- nhất thắng, như 0027, nhưng đi hết đường lên gốc thay vì chỉ một bậc.
create or replace function public.topic_is_public(t text) returns boolean
language sql stable security definer set search_path = public as $$
  with recursive up(id, parent_id, visibility) as (
    select id, parent_id, visibility from public.topics where id = t
    union
    select p.id, p.parent_id, p.visibility from public.topics p join up on p.id = up.parent_id
  )
  select coalesce(bool_and(visibility = 'public'), false) from up
$$;
