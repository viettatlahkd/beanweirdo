# Cây Port vẽ giống cây Blog: chấm màu, dòng phụ, ô Màu

Nhánh `claude/project-thread-oa1vgt` · PR mở ngày 2026-10-13 (số PR ghi ở tiêu đề PR). Chủ site báo (ảnh chụp, 2026-10-13): cây blog có chấm màu trước mỗi mục, cây port không có.

## [ĐỔI HÀNH VI] Dòng trang port trong Mục lục có chấm màu
- Trước: dòng trang port và About không có chấm (`ConfigTree.tsx`, `portSite.toc.items` không truyền `dot`).
- Sau: chấm = `accent` của node, không có thì màu `c500` của giao diện trang đang mặc (`portDot`). About không phải node nên là vòng rỗng, như mục blog chưa có màu.

## [ĐỔI HÀNH VI] Dòng phụ hai cây cùng một kiểu
- `tocMeta` trong `ConfigTree.tsx`: trạng thái khác "đã đăng" (hoặc "ẩn" khỏi thanh trên) đứng trước, rồi đến đường dẫn (port) hay số bài (blog).
- Trước: port nháp chỉ ghi "nháp", port ẩn chỉ ghi "ẩn"; blog không ghi trạng thái. Sau: "nháp · /bean", "ẩn · /x", và blog "nháp · 3 bài".

## [ĐỔI HÀNH VI] Trường của trang port xếp như của chủ đề blog
- Thêm hàng Màu (ghi `accent`, `on_color`, `tint`, `tint2` của node) — dùng chung `ColorRow` trong `NodeFields.tsx` với chủ đề blog.
- Tên trang đổi ở tiêu đề phía trên (như chủ đề blog), bỏ hàng "Tiêu đề". "Intro" đổi tên thành "Lời dẫn" (cùng cột `intro`).

## Bảng, cột, endpoint
- Ghi thêm `nodes.accent`, `on_color`, `tint`, `tint2` cho node `site = 'port'` qua `PATCH /api/tags?vocab=nodes` (cột có từ 0032). Không đổi schema.

## Còn lệch (ý kiến)
- Blog chưa có hàng Đường dẫn và Giao diện trong Thông tin (cột `slug`, `look` đã có từ 0032 nhưng địa chỉ blog vẫn theo `id`); port chưa có Nằm trong (cây port phẳng).
