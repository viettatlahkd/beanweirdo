# Danh sách bài: dòng thông tin dưới mỗi bài dễ đọc hơn

PR: (số PR ghi ở mô tả PR) · nhánh `claude/project-thread-n3le4b`

Chủ site chê dòng "chưa xếp · 2026.10 · 25 phút đọc · long-form · Nháp ⋮" của
danh sách kiểu Medium (PR #92) khó nhìn.

## Thay đổi

1. **[ĐỔI HÀNH VI]** Trạng thái lên cạnh tên bài thành viên màu (`STATUS_PILL`,
   `PENDING_PILL` trong `ContentWorkspace.tsx`): Nháp xám xanh, Có sửa chưa đăng
   vàng cam, Lưu trữ nâu, Thùng rác đỏ; bài đã đăng không có viên. Trước: chữ
   trạng thái nằm cuối dòng phụ, lẫn với ngày và template.
2. **[ĐỔI HÀNH VI]** Dòng phụ (`story`): bỏ dấu "·", các mục cách nhau bằng
   khoảng trống; chữ 13.5px màu `ink.strong` (trước 13px `ink.soft`); ngày,
   phút đọc, template có icon riêng (`IconCalendar`, `IconClock`, `IconPage`
   mới trong `design/icons.tsx`); "chưa xếp" thành "Chưa xếp chủ đề" in nghiêng;
   tag vẽ như badge #màu ở trang công khai (`tagBadge` nay export từ
   `components/TagBadges.tsx`).
3. **[ĐỔI HÀNH VI]** Nút ⋮ ra mép phải của mỗi bài, sau ảnh bìa. Trước: nằm cuối
   dòng phụ, chạy theo độ dài dòng.

## Bảng, cột, endpoint đã đụng

Không có. Chỉ giao diện.
