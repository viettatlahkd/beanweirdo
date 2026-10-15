-- Một kho bài cho mọi site; mỗi bài tự chọn hiện ở trang chủ nào.
--
-- Chủ site (2026-10-15): biz, bean và personal blog không được mỗi nơi giữ một
-- bản bài, vì một bài có thể hiện ở cả ba. Chỉ một kho bài; cột `shown_on` ghi
-- bài hiện ở trang chủ nào ("true ở đâu thì appear ở trang chủ cái đó").
--
-- Một cột danh sách thay vì ba cột đúng/sai: thêm site thứ tư là thêm một giá
-- trị vào ràng buộc, không phải thêm cột.
--
-- Mọi bài đang có hiện ở personal blog như hôm nay. Trang chủ biz và bean
-- không đổi gì cho tới khi chủ site bật nguồn "bài tick trang này" ở một khối.
--
-- Chạy file này TRƯỚC khi merge code mới: code mới đọc cột này trong danh
-- sách bài, và thiếu cột thì danh sách báo lỗi.
--
-- Số hiệu 0038: 0037 là migration cuối.

begin;

alter table public.posts
  add column if not exists shown_on text[] not null default '{blog}';

alter table public.posts
  drop constraint if exists posts_shown_on_known;
alter table public.posts
  add constraint posts_shown_on_known check (shown_on <@ array['biz', 'bean', 'blog']::text[]);

commit;

-- Kiểm tra: dán kết quả câu này lại cho Claude.
-- Mong đợi: một dòng, hien_o = {blog}, so_bai = tổng số bài.
select shown_on as hien_o, count(*) as so_bai from public.posts group by shown_on;
