-- Màu của một bài.
--
-- Trước migration này, màu một bài mặc là màu module nó thuộc về, và không có
-- cách nào nói khác đi. Hai chỗ hỏng vì thế: bài trong Ghi 01 và các module đặc
-- biệt không có màu nào tự nhiên để mặc, còn bài trong module thường thì không
-- lệch đi được dù chỉ một lần.
--
-- `theme_color` rỗng nghĩa là **theo module** — không phải "chưa đặt màu". Chỉ
-- khi chủ site chọn khác thì mới ghi vào đây. Nhờ vậy đổi màu một module vẫn
-- lan tới mọi bài chưa ai đặt riêng, đúng như hôm nay.
--
-- Số hiệu 0021: 0020 là migration cuối đã chạy.

alter table public.posts add column if not exists theme_color text;

comment on column public.posts.theme_color is
  'Màu riêng của bài, dạng #rrggbb. Rỗng nghĩa là theo màu module.';

-- Chỉ nhận mã màu sáu chữ số. Một chuỗi bất kỳ lọt vào đây sẽ đi thẳng ra
-- thuộc tính CSS của trang, nên chặn ngay ở đây thay vì tin phía trước.
alter table public.posts drop constraint if exists posts_theme_color_hex;
alter table public.posts add constraint posts_theme_color_hex
  check (theme_color is null or theme_color ~ '^#[0-9A-Fa-f]{6}$');
