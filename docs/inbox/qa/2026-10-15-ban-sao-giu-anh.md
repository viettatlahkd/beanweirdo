# Bản sao giữ ảnh, mọi ô ảnh qua cùng một hộp cắt

Nhánh `claude/duplicate-images-resize-1wmcwg` · PR: mở sau khi chủ site đồng ý.

## [ĐỔI HÀNH VI] Bản sao của bài mang theo ảnh

- Trước: `POST /api/posts` với `fromPostId` gỡ hết ảnh khỏi thân bài
  (`withoutImages` trong `backend/lib/posts.ts`) và để `hero_image_url`,
  `hero_caption` rỗng; `plate_images` không được chép.
- Sau: thân bài chép nguyên (cả ảnh), cùng `hero_image_url`, `hero_caption`,
  `plate_images`. Bản nháp chưa đăng (`post_drafts`) vẫn thắng bản đang hiện,
  nay cho cả ba cột ảnh. `thumbnail_url` tính lại từ thân bài như trước.
- Hai bài trỏ cùng một tệp trong kho; không có đường nào xoá tệp đã tải lên
  (`backend/api/upload.ts` chỉ cấp vé ký), nên xoá bài gốc không làm mất ảnh
  của bản sao.
- `withoutImages` và bài kiểm của nó đã xoá.
- Bảng/cột đọc thêm: `posts.hero_image_url`, `posts.hero_caption`,
  `posts.plate_images` (select của nguồn), và cùng ba khoá trong
  `post_drafts.data`. Endpoint: `POST /api/posts`.

## [ĐỔI HÀNH VI] Mọi ô ảnh của khu quản trị mở `CropPicker`

- `FramingProvider` chuyển từ `Editor` lên `AdminShell`, nên Cấu hình và Tác
  giả dùng chung hộp cắt với màn sửa bài.
- `FocusPicker` (chỉ đặt điểm căn) đã xoá. Ba chỗ dùng nó — `ModuleImages`,
  `FeatureCellsEditor`, `ImageSlot` trong `screens/Cms.tsx` — nay gọi
  `useFraming()` với tỉ lệ ô. `ImageSlot` trước đây tải lên xong không mở hộp;
  nay mở.
- Ảnh tác giả (`AuthorDialog` trong `AuthorsPanel.tsx`) mở hộp với khung 1:1.
- `ImageField` của Port (`PortEditors.tsx`) mở hộp cắt tự do (ô ảnh Port đổi
  hình theo màn hình, không có một tỉ lệ ô).
- Phông chữ tải qua `uploadImage` (`addFont`) không đi qua hộp — không phải ảnh.

## [SỬA LỖI] Chỗ vẽ ảnh đọc được khung cắt

- `coverStyle` (`packages/post-renderer/src/focus.ts`): ảnh có `#crop=` cắt
  một phần thì phóng đúng phần đã cắt (như `cropStyle`, bỏ `aspectRatio`);
  cắt nguyên tấm vẫn `cover`. Trước đó `coverStyle` chỉ lấy tâm khung cắt.
- `postThumbnail` (`frontend/src/lib/postThumb.ts`) đổi khung cắt thành điểm
  căn, vì ô danh sách có hình riêng.
- `imageOf` (`frontend/src/portfolio/layout.ts`) dùng `readFocus`, nên ảnh
  `<img>` của Port và ảnh bìa ở `PostHead` lấy tâm khung cắt thay vì bỏ qua.
- Ảnh đại diện ở `Byline` và `Avatar` (AuthorsPanel) vẽ bằng `coverStyle`
  thay vì `<img>`, vì thẻ ảnh bỏ qua khung cắt.

## Đã kiểm

- `npx vitest run` cho `backend/lib/posts.test.ts`,
  `backend/api/posts/index.test.ts`, `frontend/src/lib/imageFocus.test.ts`,
  `frontend/src/lib/postThumb*.test.ts`, `frontend/src/portfolio` — xanh.
- `cms-harness.html?tab=authors`: tải ảnh tác giả → hộp "Cắt ảnh" mở với "Vừa
  ô"; thu khung rồi Xong → ảnh đại diện hiện đúng phần đã cắt.

## Đề xuất

- Ô ảnh Port vẫn chỉ lấy tâm khung cắt, không phóng — muốn phóng thì cần biết
  tỉ lệ từng ô Port lúc mở hộp.
