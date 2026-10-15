# Nội dung có hai tab con: Tác giả, Tag (chuyển lên từ Cấu hình › beanweirdo)

- Nhánh: `feature/noi-dung-subtab` (cắt từ `main` c95be68) · PR: chưa mở · Không migration.
- Chủ site, 2026-10-15: "Nội dung cần … sub tab … tag và tác giả: lấy từ cấu hình phần beanweirdo lên … thứ tự: Tác giả,
  cây nội dung, tag". Tab "cây nội dung" chưa làm — chờ chủ site chọn hướng (cây chủ đề tới từng bài, hay sơ đồ site).

## Đã sửa

- **[ĐỔI HÀNH VI]** Thanh bên quản trị: dưới "Nội dung" có hai dòng con Tác giả, Tag (`AdminShell.tsx:CONTENT_LISTS`).
  Breadcrumb "Quản trị › Nội dung › Tác giả / Tag".
- **[ĐỔI HÀNH VI]** Cấu hình › beanweirdo bỏ hai thẻ Tag, Tác giả (còn Trang chủ · Mục lục · Khung chung · Ghi 02).
- Hai tab vẫn là trang cũ trong `ConfigTree.tsx`, mở với tham số mới `only` (thay `openAuthors`): chỉ nhóm đó, không vẽ cây
  site vào thanh bên, không đổi site đang mở, breadcrumb bỏ phần trỏ về site.
- Địa chỉ: `/ad-authors` (như cũ) → Nội dung › Tác giả; thêm từ địa chỉ `adTags` = `tags` → `/ad-tags`, có trong tab Đường
  dẫn và danh sách không được trùng (`routeWords.ts:MUST_DIFFER`). `CmsTab` thêm `'tags'`.
- Đã thử rồi bỏ trong cùng nhánh: đưa Mục lục lên Nội dung với tên "Chuyên mục" — chủ site: sai ý; Mục lục ở nguyên Cấu hình
  › journal, tên cũ.

## Kiểm

Trình duyệt (dữ liệu hosted, chặn mọi lệnh ghi, không lệnh nào phát ra): thanh bên "Nội dung · Tác giả · Tag"; Tác giả hiện
4 tác giả, chỉ dòng Tác giả sáng; Tag hiện 4 tag; Cấu hình › beanweirdo không còn Tag, Tác giả; Cấu hình › journal: Trang
chủ · Mục lục · Hình trang, Mục lục còn "Chữ cố định".
