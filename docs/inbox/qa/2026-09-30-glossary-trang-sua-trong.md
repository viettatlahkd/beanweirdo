PR: #59    nhánh: claude/project-thread-tkjhw7

# Bài glossary đã đăng nhưng mở trang sửa thì trống

Chủ site báo 2026-09-30: bài glossary về roasting đã lên trang và API sửa bài
trả đủ nội dung, nhưng màn sửa không hiện gì.

## [SỬA LỖI] Mặt soạn cards đổ khi thẻ thiếu chữ hoặc nhóm là một chuỗi

Tôi không đọc được dữ liệu thật của bài (phiên này không vào được
`*.vercel.app` hay DB). Nguyên nhân dưới đây là suy ra: tôi thử từng dạng
thẻ, dạng nào trang công khai vẽ được mà màn sửa đổ:

- `groups` lưu thành chuỗi (`"Roasty"`) thay vì mảng: trang công khai vẽ
  được, còn màn sửa đổ ở `GroupPicker` (`chosen.filter is not a function`).
- Thẻ thiếu `title` / `sub` / `tag`: trang công khai vẽ được, còn màn sửa đổ ở
  `EditableField` (`Cannot read properties of undefined (reading 'length')`).

Sửa: `Editor.tsx:editableCards` lấp các chỗ thiếu trước khi `CardsEditor`
vẽ. Dữ liệu chỉ bị ghi lại khi chủ site sửa thẻ đó. Test nằm ở
`Editor.templates.test.tsx`, "opens a cards deck the public page accepts".

## [ĐỔI HÀNH VI] Mặt soạn đổ thì báo lỗi thay vì trắng trang

`Editor.tsx:CanvasFailure` bọc `EditorCanvas`. Nếu mặt soạn còn đổ vì một dạng
dữ liệu khác, màn sửa hiện một khung có câu lỗi thay vì trống, còn tiêu đề,
tác giả và nút đăng vẫn dùng được.

## Đã đụng

Không có bảng, cột hay endpoint nào. Chỉ thay frontend.

## Còn mở

Nếu bài hỏng vì một dạng dữ liệu ngoài hai dạng trên, khung lỗi mới sẽ hiện
đúng câu lỗi để sửa tiếp.
