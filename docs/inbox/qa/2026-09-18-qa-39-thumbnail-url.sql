-- Chuẩn bị cho QA-39: cắt `body` ra khỏi danh sách bài ở khu admin.
--
-- Đây là DDL, REST API không chạy được — cần dán vào SQL Editor của Supabase.
-- File này để ở lane QA vì nó là thứ tôi chuẩn bị sẵn; thư mục
-- backend/supabase/migrations/ thuộc lane kiến trúc, ai đánh số thì do chủ site
-- phân công.
--
-- VÌ SAO: backend/lib/posts.ts → hằng POST_SUMMARY_COLUMNS đang chọn cả cột
-- `body`, chỉ để toPostSummary tìm tấm ảnh đầu tiên trong bài (hàm findSrc).
-- Nghĩa là mỗi lần mở /ad-post, toàn bộ nội dung của **mọi** bài đi qua mạng
-- để vẽ vài ô ảnh 44px. Cột dưới đây giữ sẵn câu trả lời ấy, để câu select
-- thôi phải kéo body về.

alter table posts
  add column if not exists thumbnail_url text;

-- Phần điền sẵn dễ: bài nào có ảnh bìa thì ảnh bìa chính là ảnh đại diện.
update posts
   set thumbnail_url = hero_image_url
 where thumbnail_url is null
   and hero_image_url is not null
   and hero_image_url <> '';

-- Phần còn lại — bài không có ảnh bìa nhưng có ảnh nằm trong thân bài — phải
-- đi qua đúng hàm findSrc, vì nó lần theo nhiều dạng lồng nhau (fig, items,
-- sections, blocks, cards) mà một câu SQL không tả lại cho gọn được. Đó là
-- migration **dữ liệu**, nên chạy bằng REST như CLAUDE.md nói, không phải ở đây.
--
-- THỨ TỰ PHẢI ĐÚNG, nếu không khu admin sẽ 500:
--   1. chạy file này (thêm cột)
--   2. chạy lượt điền REST cho các bài lấy ảnh từ thân bài
--   3. mới sửa POST_SUMMARY_COLUMNS bỏ `body` và cho toPostSummary đọc cột mới
--   4. và sửa chỗ ghi (POST /api/posts, PATCH /api/posts/:id) tính lại
--      thumbnail_url mỗi lần thân bài đổi
--
-- Làm bước 3 trước bước 1 thì mọi request tới danh sách bài đều 500 vì
-- PostgREST không biết cột `thumbnail_url` — đúng cái đã xảy ra một lần rồi,
-- xem chính comment trên POST_SUMMARY_COLUMNS.
