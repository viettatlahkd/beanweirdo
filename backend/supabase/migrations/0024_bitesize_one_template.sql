-- 0024: bitesize chỉ còn MỘT template.
--
-- 0023 gieo hai hàng, (img) và (vid), vì lúc ấy hai dàn trang là hai lựa chọn
-- người viết phải chọn trước khi viết. Nhưng hệ đã tự đọc được tệp — ảnh hay
-- clip, ngang hay dọc — nên bắt chọn trước là bắt khai một thứ máy tự biết, và
-- chọn sai thì bài mở ra sai dàn trang cho tới khi ai đó để ý.
--
-- Chủ site chốt: "gộp image / video thành 1 trường (...) ở template chỉ còn
-- chung 1 template duy nhất là bitesize note, không phân ra làm 2".
--
-- `body` không mang `media` nữa: đính tệp vào thì tệp quyết định.

delete from templates where renderer = 'bitesize' and name in ('Bitesize note (img)', 'Bitesize note (vid)');

insert into templates (name, description, renderer, body, sort_order)
select 'Bitesize note', 'Ghi ngắn — một quan sát, một ảnh hoặc một clip, hai dòng.', 'bitesize',
       '{"len": "ngắn", "text": ""}'::jsonb, 60
where not exists (select 1 from templates where name = 'Bitesize note');
