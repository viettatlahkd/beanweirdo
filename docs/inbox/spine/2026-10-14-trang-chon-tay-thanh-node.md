# Trang chọn tay của bean thành mục trong `nodes`

- **PR:** #91 · nhánh `claude/config-one-tree-539wvd`
- **Migration:** `backend/supabase/migrations/0036_curated_pages_to_nodes.sql`, chủ site chạy tay.

## Đã đổi

### [ĐỔI HÀNH VI] "tư duy tư duy" và "ghi" kéo thả được trong Mục lục bean
Trước: hai trang này là dòng `pages` (kind `curated`). `ConfigTree.tsx: topicToc` vẽ chúng sau cây với `movable: false`.
Sau: 0036 chép mỗi trang thành:
- một dòng `nodes` (site `blog`, gốc, cùng id, `sort_order` xếp sau các subject theo thứ tự trên thanh điều hướng);
- một dòng `page_overrides` (`node_type` = `topic`) mang quy chế `blocks[0]`, `presentation` (kể cả `screen` = `notes` của Ghi) và `aliases`.

Mục `page:<id>` trong `pages.presentation.items` (dòng `nav`) đổi thành `topic:<id>`. Trang nào chưa có mục ở đó thì được thêm một mục với `sidebar` và `home` = false, để giữ đúng trạng thái ẩn như trước (`useModules.tsx: arrange` mặc định hiện chủ đề gốc). Cuối cùng xoá các dòng `pages` đã dời. Trang có `screen` = `hours` (Ghi 02, Practice) vẫn để ở `pages`.

Admin hiện chúng như mọi subject. "Cài đặt riêng" của chủ đề (`PageEditor`, kind `override`) có quy chế, giao diện mượn, và chữ cố định của Ghi (`describePage`: `copyKey = 'notes'` khi `page.screen === 'notes'`).

### [ĐỔI HÀNH VI] "+ Thêm" trong Mục lục bean
Trước: có lựa chọn "là: subject | trang chọn tay" (`addToBlog`).
Sau: chỉ tạo subject (`addTopic(null)`). Muốn trang tự chọn bài thì tạo subject rồi bấm "+ cài đặt riêng".

### Code bỏ
`ConfigTree.tsx`: `addToBlog`, nhánh `curated` của `groupOf`, `deleteOf` và phần chi tiết. `PageSettings.tsx`: kind `curated` của `BlogSelected`, `pageDeleteBlocker`, khối "Thông tin" của trang chọn tay. `apiClient.ts`: `createPage`, `deletePage`. `NodeFields.tsx`: `VISIBILITY`. `backend/lib/layout.ts`: POST và DELETE `?vocab=pages`. PATCH `?vocab=pages` vẫn giữ vì `NavFlags` dùng nó để ghi dòng `nav`.

`useModules.tsx: buildPages` vẫn đọc `curated` vì Ghi 02 còn là một trang như thế.

### [SỬA LỖI] Địa chỉ của chủ đề có màn riêng
`ConfigTree.tsx`, phần `topic`: địa chỉ và xem trước dùng `pagePath` (`PageSettings.tsx`), nên Ghi trỏ vào trang ghi chứ không vào `/bean/module/ghi`.

## Bảng, cột, endpoint đã đụng
- `pages`: đọc, xoá dòng curated, sửa `presentation.items` của `nav`.
- `nodes`: thêm dòng.
- `page_overrides`: thêm dòng.
- Endpoint bỏ: `POST /api/tags?vocab=pages`, `DELETE /api/tags?vocab=pages&id=`.

## Đối chiếu bộ luật
`frontend/src/content/logic.ts` không có trong repo, nên chưa đối chiếu được.

## Ghi chú
- Trang subject nay xếp `template_subject.presentation` bên dưới `presentation` riêng (`buildPages`, nhánh topics). Trang chọn tay trước đây không có lớp này. Trường nào chỉ mẫu đặt mà trang riêng không đặt thì giờ sẽ hiện.
- "bỏ cài đặt riêng" trên Ghi sẽ xoá quy chế riêng của nó, và trang quay về quy chế chung của subject.
