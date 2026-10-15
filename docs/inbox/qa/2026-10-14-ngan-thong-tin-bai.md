# Ngăn "Thông tin bài" trong trang soạn

PR #90 · nhánh `claude/project-thread-ymdx0y`.

Chủ site chê dải thông tin trên đầu trang soạn rải rác (tám ô trên ba dòng, bảng
màu trôi sang phải) và chọn kiểu B trong mock: ngăn thuộc tính trượt ra bên phải,
như Notion. Sau đó dặn thêm: Xem trước / Lưu nháp lên trên cùng, đừng để dưới.

## Đã đổi

- **[ĐỔI HÀNH VI]** Trang soạn: Template, Tác giả, Chủ đề, Tag, Module, Quyền
  xem, Địa chỉ, Địa chỉ cũ và Màu bài chuyển vào ngăn `PostSettings`
  (`admin/components/PostSettings.tsx`), mở bằng nút "Thông tin bài". Trước: dải
  ngang trên đầu (`PostPlacement.tsx`, đã xoá). Sau: bốn nhóm Vị trí · Người
  viết · Hiển thị · Địa chỉ & quyền xem. Ngăn một nền trắng, các nhóm chỉ ngăn bằng đường kẻ, không khung bo (chủ site dặn). Esc trong ngăn thì đóng; mở hay đóng
  được nhớ trong `localStorage` (`SETTINGS_KEY` trong `Editor.tsx`). Màn rộng
  ≥1100px thì ngăn đẩy trang sang trái, hẹp hơn thì nằm đè lên.
- **[ĐỔI HÀNH VI]** Xem trước, Lưu nháp, Publish/Đăng thay đổi chuyển từ cuối
  trang lên thanh dính trên cùng (`EditorContent` trong `Editor.tsx`), cạnh một
  dòng tóm tắt: chấm màu · template · đường chủ đề · quyền xem, và dòng trạng
  thái lưu.
- **[ĐỔI HÀNH VI]** Ô Module đổi nhãn thành "Màu mượn từ", kèm ghi chú rằng nó
  quyết màu mặc định và địa chỉ tự sinh, còn chỗ bài hiện là do Chủ đề. Dữ liệu
  không đổi (`posts.module_id`).
- Quyền xem từ ô chọn thành `Choice` (Công khai | Riêng tư). Tag hiện bằng huy
  hiệu màu `tagColor`.
- `AuthorPicker` bỏ chữ "Tác giả:" đứng đầu (nhãn nay do ngăn vẽ); ảnh hưởng cả
  hộp `PostAuthorsDialog`.
- `cmsHarness.tsx` thêm `?screen=edit` để mở trang soạn với máy chủ giả.

## Bảng, cột, endpoint

Không thêm gì. Trang soạn đọc thêm `GET /api/tags?vocab=nodes&site=blog` (trước
do `PostPlacement` gọi, nay `Editor` gọi để vẽ dòng tóm tắt). Ghi vẫn qua
`PATCH /api/posts/:id` và `PUT /api/posts/:id?part=authors` như cũ.

## Đề xuất

Module gần như trùng Chủ đề. Bỏ hẳn nó cần đổi cách sinh địa chỉ
(`lib/postSlug.ts`) và trang cũ chưa có luật (`pagePosts` trong
`data/useModules.tsx`) — việc riêng, chờ chủ site quyết.
