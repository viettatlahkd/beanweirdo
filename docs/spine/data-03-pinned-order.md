# spine/data-03-pinned-order · Ghim, thứ tự ba tầng, và tách hai nhóm element

nhánh: spine/data-03-pinned-order   base: origin/main

## Schema
**Migration 0017** — chủ site đã chạy 2026-08-22:
- `posts.pinned boolean not null default false`
- `posts.sort_order` cho phép rỗng, và **xoá hết giá trị cũ** (chúng do hệ thống
  tự đánh, không phải người dùng chọn — sensory từng có hai bài cùng `sort=1`)
- chỉ mục `(module_id, pinned desc, sort_order, published_at desc)`

## Đã đổi
- [ĐỔI HÀNH VI] Thứ tự bài trong một module nay ba tầng:
  1. bài ghim lên trước
  2. vị trí người dùng tự chọn (`sort_order`) — rỗng thì xuống dưới
  3. bài đăng mới nhất trước (`published_at`)
  Trước đó chỉ xếp theo `sort_order`, mà mọi bài đều có số nên không phân biệt
  được "người dùng chọn" với "hệ thống đánh".
- [ĐỔI HÀNH VI] Trang chủ và Mục lục thôi ép `orderBy: 'sort_order'`, dùng thứ
  tự chuẩn.
- [SỬA LỖI] `PATCH /api/posts/[id]` bỏ trường `n` (cột đã xoá ở migration 0016),
  thêm `pinned`.

## Tách hai nhóm element
`Filler` → **`FeatureCell`**, đánh số riêng **F1…F7**, và `after` → `afterPost`
để nói rõ nó đếm theo bài nào.

Hai nhóm ở Ghi 01, ghi thành chú thích ngay trong `content/notes.ts`:
- **ô feature** — thuộc dàn trang, đặt cùng lúc dựng trang, không ai "đăng" nó
- **bài** — người dùng đăng vào module, đặt ở khu soạn bài

## Còn nợ — việc 3, 4, 5
| | |
|---|---|
| 3 | Ô feature vẫn là **chữ cứng** trong `content/notes.ts`, CMS chưa sửa được. CMS hiện chỉ sửa 3 ảnh trang Mục lục và 3 ảnh mỗi module. |
| 4 | Lưới batch 15 ô (8 bài + 7 ô feature), ảnh hiện theo số bài đã lấp |
| 5 | Ghim áp cho mọi trang module, chưa chỉ Ghi 01 |

## Kiểm chứng
306 test xanh. Test mới khoá thứ tự ba tầng và hệ đánh số riêng của hai nhóm.
