-- 0023: cho `templates` nhận renderer thứ sáu, và gieo một template dùng ngay.
--
-- 0022 mới nới `posts.template`. Nhưng form "bài mới" không chọn renderer —
-- nó chọn một hàng trong bảng `templates` — và cột `renderer` ở đó có ràng
-- buộc riêng, vẫn đóng ở năm giá trị. Nghĩa là sau 0022 thì bitesize vẽ được
-- nhưng KHÔNG TẠO ĐƯỢC từ giao diện. Đây là chỗ tôi để lọt ở PR #93.
--
-- Ràng buộc ấy đóng là có lý (0014): mỗi giá trị là một component React phải
-- tồn tại. `Bitesize` nay tồn tại, nên nới đúng một giá trị.

alter table templates drop constraint if exists templates_renderer_check;
alter table templates
  add constraint templates_renderer_check
  check (renderer in ('article', 'cards', 'report', 'longform', 'memo', 'bitesize'));

-- Hai template để chọn ngay, cùng một renderer.
--
-- Bảng này sinh ra đúng cho việc ấy (0014): "nhiều template có thể dùng chung
-- một renderer... thêm một cái là một hàng, không phải một migration". Hai dàn
-- trang của bitesize khác nhau ở `body.media`, nên chúng là hai hàng chứ không
-- phải hai renderer.
insert into templates (name, description, renderer, body, sort_order)
select v.name, v.description, 'bitesize', v.body::jsonb, v.sort_order
from (values
  ('Bitesize note (img)', 'Ghi ngắn có ảnh — tiêu đề dẫn đầu, chữ chảy quanh ảnh.',
   '{"media": "img", "len": "ngắn", "portrait": false, "text": ""}', 60),
  ('Bitesize note (vid)', 'Ghi ngắn có clip — clip dẫn đầu bên trái, chữ đứng cạnh.',
   '{"media": "vid", "len": "ngắn", "portrait": false, "text": ""}', 61)
) as v(name, description, body, sort_order)
where not exists (select 1 from templates where templates.name = v.name);
