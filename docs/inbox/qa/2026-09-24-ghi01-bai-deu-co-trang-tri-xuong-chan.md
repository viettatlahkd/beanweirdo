# Ghi 01: mọi bài cùng một cỡ, trang trí dồn xuống chân trang

Nhánh `claude/project-thread-12dfli`, PR mở sau PR #46.

## [ĐỔI HÀNH VI] Lưới bài của Ghi 01

- Trước: `lib/notesGrid.ts:buildNotesGrid` xếp bài theo chu kỳ tám chỗ (`notePlacement`:
  span 4 hoặc 5, lệch trên 0–150px, ảnh rộng 72–94%), và chèn bảy ô trang trí F1–F7
  vào giữa (`afterPost`, `ml` âm tới -64px). Bản hẹp có bảng riêng (`notePlacementMobile`,
  `featureMobile`, `canTuck`).
- Sau: `screens/Notes.tsx` vẽ bài thẳng từ danh sách: ba bài một hàng, mỗi bài `span 4`,
  không lệch trên; bản hẹp một cột, cách nhau 48px. Mọi thẻ có khung ảnh 4:3 (`CARD_AR`);
  bài không có ảnh vẫn có khung, nền `#EFEDE4`. Thẻ bitesize luôn dựng theo kiểu xếp
  dọc (`mobile` của `BitesizeCard`), kể cả bài ảnh dọc. Tiêu đề thẻ chung từ 40px xuống 32px.
- Không còn "tối đa tám bài": tám là độ dài chu kỳ cũ, quá tám thì lặp lại. Nay không
  còn chu kỳ.
- Bài mở ra vẫn `2 / span 9` như cũ.
- Đã xoá: `lib/notesGrid.ts`, `lib/notesGrid.test.ts`, `screens/Notes.tuck.test.ts`,
  `notePlacement`, `notePlacementMobile`, `featureMobile`, `canTuck`, `FeatureCellView`,
  và các trường `afterPost`, `mt`, `ml`, `pl` của `FeatureCell`.

Lý do: chủ site 2026-09-24 trong thread, "các bài viết phải cùng size với nhau bất kể
layout", và các ô trang trí "không được để nó chèn lên các bài viết và size có thể bé đi".

## [ĐỔI HÀNH VI] Ô trang trí F1–F7

- Sau: `Notes.tsx:DecoStrip` vẽ chúng thành một dải thấp ngay trên chân trang: câu trích
  24px (bản hẹp 20px), ảnh cao 120px (bản hẹp 88px), mỗi ảnh giữ tỉ lệ khung cũ
  (`content/notes.ts:cellRatio`, chuyển từ `FeatureCellsEditor.ratioOf`), vì khung cắt
  trong CMS tính theo tỉ lệ ấy.
- Ô ảnh chưa có ảnh không vẽ nữa (trước là khung màu kèm dòng gợi ý của design).
- Ô đếm F4 không vẽ nữa; hàng lọc đầu trang đã in số bài. `FeatureCellsEditor` bỏ hàng F4.
- Nhãn nhóm trong CMS đổi từ "Ảnh feature dọc trang" thành "Ảnh trang trí ở chân trang".
- Hai ảnh chân trang (`img1`/`img2`, `FooterImage`) giữ nguyên.

## [SỬA LỖI] Ô ảnh của thẻ bitesize rộng hơn cột 28px

- `packages/post-renderer/src/Bitesize.tsx:Media` có `padding: 14` mà không có
  `boxSizing`, nên `width: '100%'` vẽ rộng hơn cột 28px. Đo trong Chromium: cột 963→1368,
  ô ảnh 963→1396. Thêm `boxSizing: 'border-box'`. Ảnh hưởng mọi chỗ vẽ thẻ và bài
  bitesize, kể cả bản điện thoại (đường `mobile` luôn dùng 100%). File thuộc lane kiến trúc.

## Kiểm

Trang thử dữ liệu giả trong Chromium, 390/905/1024/1280/1440px, 2–6 bài: không chữ
nào tràn khỏi ô. `npm test` xanh, `vite build` xanh.

Bảng/cột: `modules.feature_cells` (chỉ đọc, như cũ). Không đổi endpoint.
