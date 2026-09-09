-- 0022: template thứ sáu — bitesize note.
--
-- Dạng ghi ngắn của Ghi 01. Nó vốn không phải một template mà là một loại thực
-- thể riêng: bảng `notes`, mô hình riêng, bộ vẽ nằm thẳng trong màn Ghi 01.
-- 0021+ đã gộp ghi chép vào bài đăng và bộ vẽ ấy mất theo; chủ site muốn giữ
-- đúng dàn trang ấy nên nó quay lại như một template, dùng được dưới bất kỳ
-- module nào chứ không riêng Ghi 01.
--
-- Không cột mới: độ dài, khung dọc, chữ gợi ý trong ô ảnh và ô ảnh phụ đều nằm
-- trong `body` jsonb, đúng cách bốn template kia mang phần riêng của chúng.

alter table posts drop constraint if exists posts_template_check;
alter table posts
  add constraint posts_template_check
  check (template in ('article', 'cards', 'report', 'longform', 'memo', 'bitesize'));
