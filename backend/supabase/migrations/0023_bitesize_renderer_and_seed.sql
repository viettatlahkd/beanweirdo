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

-- Một template để chọn ngay, giống năm cái kia. Thân bài để trống: bitesize
-- đọc `body` jsonb, và bài mới bắt đầu từ một tờ trắng đúng như dạng ghi ngắn
-- vốn thế.
insert into templates (name, description, renderer, body, sort_order)
select 'Bitesize note', 'Ghi ngắn — một quan sát, một ảnh, hai dòng.', 'bitesize',
       '{"len": "ngắn", "portrait": false, "text": ""}'::jsonb, 60
where not exists (select 1 from templates where renderer = 'bitesize');
