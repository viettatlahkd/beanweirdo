-- Màu cho tag (`keywords`): mỗi tag là một badge, hiện "#tên" trên bài.
--
-- Chủ site (2026-10-13): "tạo badge và chọn màu badge, nếu badge chưa có màu
-- thì đính thêm vào". Cột để trống được: tag chưa chọn màu tự lấy một màu cố
-- định theo id (`tagColor` ở frontend/src/lib/tagColor.ts), nên không cần
-- điền dữ liệu cho tag cũ.
--
-- Chạy được nhiều lần.

alter table public.keywords add column if not exists color text
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');

-- Kiểm tra: phải ra một dòng "color | text".
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'keywords' and column_name = 'color';
