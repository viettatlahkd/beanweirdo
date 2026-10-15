# Nội dung có ba tab con: Tác giả · Chuyên mục · Tag

- Nhánh: `feature/noi-dung-subtab` (cắt từ `main` c95be68) · PR: chưa mở · Không migration.
- Chủ site, 2026-10-15: "Nội dung cần … sub tab … tag và tác giả: lấy từ cấu hình phần beanweirdo lên … thêm 1 sub tab là Cây
  nội dung … thứ tự: Tác giả, cây nội dung, tag"; rồi: "quản lý cây nội dung (các chủ đề và sub-topic đang có): thêm/sửa/xoá,
  xoá thì đổi vị trí (cho phép gộp vào đâu khác)" — giữ tên "Chuyên mục".

## Đã sửa

- **[ĐỔI HÀNH VI]** Thanh bên quản trị: dưới "Nội dung" có ba dòng con Tác giả · Chuyên mục · Tag (`AdminShell.tsx:CONTENT_LISTS`).
  Breadcrumb "Quản trị › Nội dung › …".
- **[ĐỔI HÀNH VI]** Cấu hình › beanweirdo bỏ thẻ Tag, Tác giả (còn Trang chủ · Mục lục · Khung chung · Ghi 02).
- **[ĐỔI HÀNH VI]** Nội dung › Chuyên mục: cả cây chủ đề và chủ đề con trong một danh sách (con thụt vào), kéo để đổi chỗ/đưa
  vào trong, "Thêm" chủ đề, bấm một mục để sửa (Thông tin, Mục con), ⋮ → Xoá. Không có cờ hiện trên site và "Nội dung trang" —
  phần đó là của trang Mục lục (giữ nguyên ở Cấu hình › journal, tên cũ, còn "Chữ cố định").
- **[ĐỔI HÀNH VI]** Xoá chủ đề là gộp (`NodeFields.tsx:RetireTopic`, `lib/retire.ts:retireTopic`): trước đây chủ đề còn mục con
  thì không xoá được ("chuyển hay xoá chúng trước"); nay chọn chủ đề đích, mục con và bài cùng chuyển sang rồi mới xoá. Cây hai
  tầng nên khi còn mục con, đích chỉ là chủ đề tầng trên. Hoàn tác đưa cả mục con về. Áp cho cả Mục lục (cùng component).
- Ba tab là trang cũ trong `ConfigTree.tsx` mở với tham số `only` (thay `openAuthors`): chỉ nhóm đó, không vẽ cây site vào thanh
  bên, không đổi site đang mở, breadcrumb bỏ phần trỏ về site.
- Địa chỉ: `/ad-authors` → Tác giả (như cũ); `/ad-taxonomy` (trước là Phân loại, trỏ về Nội dung) → Chuyên mục; từ mới `adTags`
  = `tags` → `/ad-tags`, có trong tab Đường dẫn và danh sách không được trùng (`routeWords.ts:MUST_DIFFER`). `CmsTab` thêm
  `'topics'`, `'tags'`. Nhãn từ `adTaxonomy` trong tab Đường dẫn: "Phân loại" → "Chuyên mục".

## Kiểm

- Trình duyệt (dữ liệu hosted, chặn mọi lệnh ghi): thanh bên "Nội dung · Tác giả · Chuyên mục · Tag"; Tác giả 4 người; Tag 4 tag;
  Chuyên mục 6 chủ đề + các chủ đề con; Cấu hình › journal: Trang chủ · Mục lục · Hình trang.
- Xoá thử "business writing" (2 mục con, 0 bài): bảng "Gộp 2 mục con vào [entrepreneur]", đích chỉ gồm 5 chủ đề tầng trên;
  bấm → lệnh lẽ ra đã gửi: `PATCH nodes business-features, writing-about-writing {parent_id: business}`, `PUT overrides business
  {aliases: [writing]}`, `DELETE nodes writing`; báo "2 mục con, 0 bài → entrepreneur · đã xoá business writing · Hoàn tác".
  Không ghi gì thật.
- Mở thẳng `/ad-tags` từng không ra tab (thiếu trong `adminPages`) — đã sửa; `routes.test.ts` khẳng định `/ad-taxonomy` → topics,
  `/ad-tags` → tags. `npm test` 881 xanh (3001 tắt), `vite build` xanh.
