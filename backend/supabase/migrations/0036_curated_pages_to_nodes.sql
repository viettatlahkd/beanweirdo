-- Trang chọn tay của bean ("tư duy tư duy", "ghi") thành mục trong cây `nodes`.
--
-- Chủ site (2026-10-14) duyệt bước 2 "dời dữ liệu": hai trang này đứng trong
-- Mục lục bean từ PR #79 nhưng vẫn nằm ở bảng `pages`, nên không kéo thả được
-- như chủ đề. Một trang chọn tay chỉ khác chủ đề ở chỗ nó tự chọn bài bằng quy
-- chế riêng — mà chủ đề đã có sẵn chỗ cho quy chế riêng: `page_overrides`
-- (0028). Nên mỗi trang thành:
--
--   * một dòng `nodes` site 'blog', gốc (parent_id null), cùng id, đứng sau
--     các subject theo thứ tự đang có trên thanh điều hướng;
--   * một dòng `page_overrides` mang quy chế (blocks[0]), cách bày
--     (presentation, kể cả `screen` của trang Ghi) và địa chỉ cũ (aliases).
--
-- Cờ hiện ở thanh bên / trang chủ blog đi theo: mục `page:<id>` trong danh
-- sách điều hướng đổi thành `topic:<id>`. Trang chưa từng có mục ở đó vốn ẩn
-- (trang chọn tay mặc định không hiện), còn chủ đề gốc mặc định hiện, nên nó
-- được thêm một mục ẩn để trang công khai không đổi.
--
-- Trang Ghi 02 (`screen` = 'hours') là của Practice, không thuộc Mục lục: giữ
-- nguyên ở `pages`.
--
-- Code đang chạy đọc chủ đề có cài đặt đè như một trang bình thường, nên chạy
-- file này trước khi deploy code mới vẫn an toàn. Trùng id với một chủ đề có
-- sẵn thì cả file dừng, không đổi gì.
--
-- Số hiệu 0036: 0035 là migration cuối đã chạy.

begin;

create temporary table moving on commit drop as
select p.*, row_number() over (order by coalesce(nav.pos, 1000000), p.created_at) as n
from public.pages p
left join lateral (
  select i.pos
  from public.pages navp,
       jsonb_array_elements(coalesce(navp.presentation -> 'items', '[]'::jsonb)) with ordinality as i(item, pos)
  where navp.kind = 'nav' and i.item ->> 'ref' = 'page:' || p.id
  limit 1
) nav on true
where p.kind = 'curated' and coalesce(p.presentation ->> 'screen', '') <> 'hours';

insert into public.nodes (id, site, slug, parent_id, title, status, sort_order, created_at, updated_at)
select m.id, 'blog', m.id, null, coalesce(nullif(m.title, ''), m.id),
       case m.visibility when 'public' then 'published' else 'draft' end,
       (select coalesce(max(sort_order), 0) from public.nodes where site = 'blog' and parent_id is null) + m.n,
       m.created_at, now()
from moving m;

insert into public.page_overrides (node_type, node_id, rule_id, presentation, aliases)
select 'topic', m.id, m.blocks[1], m.presentation, m.aliases
from moving m;

update public.pages navp
set presentation = jsonb_set(
      navp.presentation, '{items}',
      (select coalesce(jsonb_agg(
                case when exists (select 1 from moving m where i.item ->> 'ref' = 'page:' || m.id)
                     then jsonb_set(i.item, '{ref}', to_jsonb('topic:' || substr(i.item ->> 'ref', 6)))
                     else i.item end
                order by i.pos), '[]'::jsonb)
       from jsonb_array_elements(coalesce(navp.presentation -> 'items', '[]'::jsonb)) with ordinality as i(item, pos))),
    updated_at = now()
where navp.kind = 'nav';

update public.pages navp
set presentation = jsonb_set(navp.presentation, '{items}',
      coalesce(navp.presentation -> 'items', '[]'::jsonb)
      || coalesce((select jsonb_agg(jsonb_build_object('ref', 'topic:' || m.id, 'sidebar', false, 'home', false) order by m.n)
                   from moving m
                   where not exists (select 1 from jsonb_array_elements(coalesce(navp.presentation -> 'items', '[]'::jsonb)) i
                                     where i ->> 'ref' = 'topic:' || m.id)), '[]'::jsonb))
where navp.kind = 'nav';

delete from public.pages where id in (select id from moving);

commit;

-- Kiểm tra: dán kết quả câu này lại cho Claude.
-- Mong đợi: một dòng cho mỗi trang đã dời, có_quy_che = true, va_nav = topic:<id>
-- (hoặc ẩn: sidebar/home = false); trang_cu = 0.
select n.id, n.title, n.status, n.sort_order,
       o.rule_id is not null as co_quy_che,
       o.presentation ->> 'screen' as man_rieng,
       (select i ->> 'ref' from public.pages navp, jsonb_array_elements(navp.presentation -> 'items') i
         where navp.kind = 'nav' and i ->> 'ref' = 'topic:' || n.id limit 1) as va_nav,
       (select count(*) from public.pages where kind = 'curated' and coalesce(presentation ->> 'screen', '') <> 'hours') as trang_cu
from public.nodes n join public.page_overrides o on o.node_type = 'topic' and o.node_id = n.id
where n.site = 'blog' and n.parent_id is null and o.rule_id is not null
order by n.sort_order;
