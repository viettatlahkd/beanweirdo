# spine/design-09-pinned-modules · Ghim bài ở mọi module

nhánh: spine/design-09-pinned-modules   base: origin/main

## Đã đổi — việc 5
- [ĐỔI HÀNH VI] Mỗi dòng bài trong Content management có **nút ghim**. Ghim
  được ở **mọi module**, không riêng Ghi 01.
- [ĐỔI HÀNH VI] `PATCH /api/posts/[id]` nhận `pinned` từ giao diện admin
  (backend đã cho từ PR #36; nay client gửi được).
- [SỬA LỖI] Sơ đồ trang trong CMS sắp bài bằng `a.sort_order - b.sort_order`,
  mà cột nay cho phép rỗng — bài chưa ai đặt vị trí sẽ xếp lung tung. Nay rỗng
  xuống cuối, giống trang công khai.

## Thứ tự thì đã có sẵn
Tầng ghim nằm trong thứ tự chuẩn từ PR #36 (`pinned desc, sort_order,
published_at desc`), và trang module dùng đúng thứ tự đó. Nên việc 5 chỉ cần
**chỗ để bật ghim** — phần đẩy bài lên đầu đã chạy.

## Phân biệt với ghim cũ
`PostsPanel` đã có nút ghim từ trước, nhưng cho **bảng `notes` cũ**, nhãn ghi
"Ghim lên đầu Ghi 01". Hai thứ khác nhau: cái cũ ghim ghi chú rời, cái mới ghim
bài và áp cho mọi module.

## Đụng dữ liệu
Không đổi schema. Cột `posts.pinned` có từ migration 0017.

## Kiểm chứng
`PostCard.pin.test.tsx` — 3 test: ghim được ở module bất kỳ, bấm lại là bỏ
ghim, và nhìn là biết bài nào đang ghim. 330 test xanh.

**Chưa thử trên dữ liệu thật** — ghim một bài là ghi vào production, tôi không
tự làm. Chủ site bấm thử một lần là biết.
