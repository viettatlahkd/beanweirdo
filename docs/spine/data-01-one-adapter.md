# spine/data-01-one-adapter · Một bộ chuyển đổi cho cả hai đường

nhánh: spine/data-01-one-adapter   base: origin/main

## Đã đổi
- [ĐỔI HÀNH VI] Trang công khai và bản xem trước trong admin nay dùng **chung
  một bộ chuyển đổi** — `frontend/src/lib/postToRenderer.ts`. Trước đó mỗi bên
  một bộ, và chúng đã trôi khác nhau:
  - xem trước mất dải màu module;
  - xem trước lấy màu nhóm hương sai;
  - xem trước lấy dòng dẫn từ `lead`, trang thật lấy từ `further_reading`.
- [SỬA LỖI] Bản xem trước chỉ xử lý 3 trong 5 loại bài. Bài `longform` và
  `memo` rơi vào nhánh mặc định và **hiện ra như bài article**.
- [ĐỔI HÀNH VI] Khung sửa bài dạng thẻ trong Editor nay cũng nhận module, nên
  có màu giống bản sẽ đăng.

## Cách làm — và vì sao chỉ còn một bộ nối
Hình dạng chung **chính là hình dạng của database**. Nên phía công khai truyền
thẳng, không qua bước nào. Chỉ admin có một bộ nối `fromAdminPost`, và nó chỉ
làm đúng một việc: đổi tên trường ngược lại (`dateLabel` → `date_label`…).

Khi làm tiếp **đường A** (bỏ hẳn việc đổi tên ở API), bộ nối đó tự biến mất và
không có gì khác phải sửa.

## Đụng dữ liệu
- Không đổi schema, không đổi endpoint, không đổi hợp đồng API.

## Đụng luật
- Không mâu thuẫn luật nào. Củng cố luật nhóm 09 về màu module.

## Kiểm chứng
- Test mới: dựng cùng một bài qua **cả hai đường** và bắt buộc kết quả giống
  hệt nhau, cho cả 5 loại bài.
- Trên máy, xem trước bài memo: hiện đúng là memo (trước là article), dải màu
  `rgb(111,168,192)` = accent Ghi 01.
- 223 test xanh, typecheck cả ba phần sạch.

## Ghi chú
Dòng chữ trên trang xem trước — *"render bằng đúng component công khai"* —
trước đây là sai với 2/5 loại bài. Nay nó đúng, nên không phải sửa câu chữ.

## Việc tiếp theo đã thống nhất
**Đường A** — bỏ bước đổi tên ở API để cả hệ thống chỉ còn một hình dạng, xoá
luôn bộ nối cuối cùng. ~179 chỗ trên 23 file. Chủ site đã chốt làm sau khi
agent QA đóng các PR đang mở, để tránh giẫm chân.

## SPEC lỗi thời
- Mục "Khoảng trống đã biết" — dòng nói bản xem trước không giống bản thật nay
  đã hết đúng, gỡ đi được.
