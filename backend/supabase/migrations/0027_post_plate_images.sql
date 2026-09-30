-- Ảnh cho những ô ảnh **cố định** của một khuôn bài.
--
-- Mỗi template vẽ sẵn vài ô ảnh mà *vị trí* là một phần của dàn trang: article
-- có cặp ô mở đầu và ô vuông ở cột phải, ngoài tấm hero đã có cột riêng
-- (`hero_image_url`). Ba ô ấy xưa nay **không có chỗ nào để lưu ảnh cả**:
-- `lib/postToRenderer.ts` điền thẳng `imageUrl: null` vào chúng, nên trên trang
-- chúng vĩnh viễn là mảng màu mang chữ "chưa có ảnh".
--
-- Một cột jsonb chứ không phải `plate_primary`, `plate_secondary`, … mỗi ô một
-- cột: ô ảnh cố định là chuyện của template, mà thêm một template hay đổi dàn
-- trang một template đã có thì không được kéo theo một migration nữa. Khoá là
-- tên ô mà chính template đặt ('primary', 'secondary', 'detail'), giá trị là
-- địa chỉ ảnh.
--
-- Những ô ảnh đã có chỗ lưu thì **ở nguyên chỗ cũ**, không dọn vào đây: hero
-- của article và memo, ảnh của bitesize là `hero_image_url`; ô ảnh phụ của
-- bitesize, khung ảnh của long-form và ô ảnh trong từng phần của article đều
-- nằm trong `body`. Đây là chỗ cho những ô còn lại, không phải một kho ảnh thứ
-- hai cho mọi thứ.
--
-- Số hiệu 0027: 0026 là migration cuối đã chạy.

alter table public.posts add column if not exists plate_images jsonb;

comment on column public.posts.plate_images is
  'Ảnh của các ô ảnh cố định do template đặt tên, dạng {"primary": "https://…"}. Rỗng nghĩa là chưa ô nào có ảnh.';
