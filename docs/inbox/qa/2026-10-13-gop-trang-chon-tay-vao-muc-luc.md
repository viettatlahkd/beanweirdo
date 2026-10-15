# Cấu hình blog: trang chọn tay nằm trong Mục lục

Nhánh `claude/port-home-add-block-1y0dlh` (cắt lại từ `main` sau PR #78) · PR mở ngày 2026-10-13 (số PR ở tiêu đề PR).

Chủ site (2026-10-13, ảnh thẻ "Trang chọn tay" với tư duy tư duy, ghi): hỏi vì sao trang này tách riêng mà không nằm chung với blog, rồi bảo "gộp đi".

## [ĐỔI HÀNH VI] Bỏ thẻ "Trang chọn tay", trang chọn tay vào Mục lục blog
- Trước: Cấu hình › Personal Blog có thẻ riêng "Trang chọn tay" liệt kê các trang `kind = 'curated'`; Mục lục chỉ có cây chủ đề.
- Sau: Mục lục liệt kê subject theo cây, rồi các trang chọn tay (meta "chọn tay · /<id>", không kéo được), đúng thứ tự thanh bên đang vẽ (`arrange` trong `useModules.tsx`: cây trước, mục khác sau). Thẻ "Trang chọn tay" và màn nhóm của nó bị xoá (`Group` không còn `'curated'`). `topicToc`, `blogSite` trong `ConfigTree.tsx`.
- Mở một trang chọn tay: breadcrumb là Personal Blog › Mục lục; xoá xong quay về Mục lục.
- Nút "+ Thêm subject" thành "+ Thêm" với lựa chọn "là: subject | trang chọn tay" (`addToBlog`). Trang chọn tay vẫn tạo bằng `createPage` như trước.
- Danh sách trong Mục lục đổi tên "Các subject" → "Các mục"; thẻ Mục lục bên trái đếm thêm số trang chọn tay.

## [SỬA LỖI] Kéo thả chỉ tính các dòng kéo được
- `tocList` truyền vào `dragOf` chỉ các dòng `movable`, để trang chọn tay (không nằm trong `nodes`) không lọt vào thứ tự gửi `reorderNodes`. Bên Port, trang nháp/lưu trữ cũng không còn trong danh sách đó; `movePortLink` vốn đã lọc chúng.

## Không đổi
- Dữ liệu: trang chọn tay vẫn ở bảng `pages`, chưa chuyển sang `nodes` (không có migration). Địa chỉ, quy chế chọn bài, công tắc menu/trang chủ (`NavFlags`) giữ nguyên.

## Bảng, cột, endpoint
- Không đụng thêm; chỉ đổi giao diện admin.

## Kiểm tra
- `ConfigTree.test.tsx` (đổi tên danh sách và nút thêm). Xem tay trên `frontend/cms-harness.html`.
