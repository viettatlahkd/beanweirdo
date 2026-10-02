# Bỏ dạng bài — template là "bài này là gì"; Ghi lọc theo tag

- Nhánh: `feature/hien-thi` (commit thứ tư, cùng PR với Nội dung · Quản lý trang · Cài đặt hiển thị)
- PR: chưa mở · Không migration (cột `posts.kind` còn, NOT NULL, chờ migration bỏ cột).
- Chủ site, 2026-10-02: "note và quan sát không đóng vai trò gì cả >> xoá luôn trong db … trong ghi đang có
  filter tag >> dùng tag … cột dạng bài đổi thành template … template về bản chất hệ thống mới chính là dạng bài".

## Đã sửa

- **[ĐỔI HÀNH VI]** Chỗ trên site từng in dạng bài nay in tên template (`lib/templateNames.ts:templateName` —
  article, cards, report, long-form, memo, bitesize): dòng đầu bài (`postToRenderer.ts`, "01 — note — 2026.09" →
  "01 — long-form — 2026.09"), Mục lục (`IndexScreen.tsx`), trang chủ đề (`ModuleScreen.tsx`, ba chỗ), Lưu trữ
  (`Archive.tsx`).
- **[ĐỔI HÀNH VI]** Ghi: thanh lọc đọc tag theme (`post_keywords`) thay dạng bài (`notesFilter.ts:noteFilterBar`,
  `Notes.tsx`). Chỉ hiện tag có bài trên trang Ghi đeo — hôm nay không bài Ghi nào có tag, nên thanh chỉ còn "tất cả".
  Chip trên thẻ bitesize là tag theme đầu tiên của bài; bài không tag thì không có chip và **giữ mực cũ** (màu của
  nhãn "note", `postToRenderer.ts:UNTAGGED`) để màu trang không đổi. `useModules` thêm `tagsOf(postId)`.
- **[ĐỔI HÀNH VI]** CMS: tạo bài và sửa bài bỏ ô Dạng bài (`MetadataStep.tsx`, `PostPlacement.tsx`); tab Nội dung:
  mục "Dạng bài" ở cột trái → "Template" (lọc theo `posts.template`, không có ⋯), cột "Dạng" → "Template", thanh sửa
  hàng loạt bỏ dạng bài. Không cho đổi template hàng loạt: mỗi template lưu `body` theo hình riêng.
  Quản lý trang: trình sửa quy chế bỏ "Kéo từ: Dạng bài" và "Nhóm theo: dạng bài" (không quy chế nào đang dùng —
  đã đối chiếu `listing_rules`).
- **[ĐỔI HÀNH VI]** `POST /api/posts` không còn bắt buộc `kind`; thiếu thì lưu `''`.

## Dữ liệu — chưa ghi

Xoá `tags` id `note`, `quan-sat`: lệnh `DELETE` bị bộ phân loại an toàn của Claude Code chặn, chưa chạy. 30/30 bài
đang `kind = 'note'`; xoá dòng `tags` không chạm bài (không có khoá ngoại).

## Kiểm

Test sửa theo hành vi mới: `notesFilter.test.ts`, `postToRenderer.bitesize.test.ts`, `Article.test.tsx`,
`MetadataStep.test.tsx` (bỏ hai test ghi dạng bài mới), `posts/index.test.ts`, `ContentWorkspace.test.tsx`
(lọc theo template thay gỡ dạng bài). `npm test` cả bộ: chưa chạy với 3001 tắt (chủ site đang xem admin).

## Cùng commit sau — bố cục theo góp ý chủ site (2026-10-02)

- **[ĐỔI HÀNH VI]** Quản lý trang: ba khung (cây · cấu hình · xem trước) gộp thành hai nửa như trình dựng port —
  cây bên trái, cấu hình của trang đang chọn mở ngay dưới dòng của nó; bên phải là trang đó, kéo được vạch chia
  (`PagesManager.tsx`: `useSplit('pages')`, `slot`). Mỗi trình sửa tự đưa bản xem trước sang nửa phải bằng portal:
  `PageEditor`, trang theo mẫu, Điều hướng (trang chủ), Practice (`/practice`), phần cố định port (`/portfolio`,
  `/portfolio/about`, nạp lại 1,2s sau lần gõ cuối), trang port (`PortEditors.tsx:Builder`, tham số `previewSlot` —
  bản nháp đang sửa, không phải trang đã lưu).
- **[ĐỔI HÀNH VI]** Cài đặt hiển thị › Personal Blog: design system dùng đúng bố cục của Port — trang bên trái, vạch
  chia kéo được, cột token 420px bên phải chia nhóm bằng cùng kiểu tiêu đề (`PortEditors.tsx:sectionHead`, `useSplit`
  export ra). Đường dẫn và chữ trang quản trị (không phải design system) nằm dưới.
