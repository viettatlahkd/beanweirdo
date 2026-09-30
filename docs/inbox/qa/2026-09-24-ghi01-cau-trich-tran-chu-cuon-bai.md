# Ghi 01: sửa câu trích, chữ tràn ô, cuộn tới bài vừa mở

Nhánh `claude/project-thread-12dfli`. Số PR: điền khi mở.

## [ĐỔI HÀNH VI] Câu trích của trang sửa được ở mục Trang Ghi chép

- Trước: câu "Ghi lại thì mới thấy mình đã nghĩ gì." (ô F2, `kind: 'quote'` trong
  `content/notes.ts:featureCells`) chỉ sửa được trong form module Ghi 01 ở Cây
  module (`FeatureCellsEditor`). Chủ site tìm ở mục Trang Ghi chép, không thấy.
- Sau: mục Trang Ghi chép (`screens/Cms.tsx`, `Section id="notes"`) có thêm ô
  "Câu trích giữa trang". Ghi vào cùng chỗ: `modules.feature_cells` của `ghi01`,
  qua `patchModule`. Ô cũ trong `FeatureCellsEditor` vẫn còn; cả hai ô gắn
  `key` theo giá trị nên sửa bên này thì bên kia hiện chữ mới.
- Thêm `patchOverride` và `QUOTE_CELL` trong `content/notes.ts`; `FeatureCellsEditor.set` nay gọi `patchOverride`.
- `CONFIG_BOXES` (thẻ "Trang Ghi chép") thêm chữ "câu trích" vào mô tả.

Bảng/cột: `modules.feature_cells` (ghi, cột đã có). Endpoint: `PATCH` module như cũ.

## [SỬA LỖI] Tiêu đề bài bitesize dọc tràn sang ô bên cạnh

- `screens/Notes.tsx:Collapsed` truyền `mediaWidth` của chỗ đặt (72–94%) cho
  `BitesizeCard`. Thẻ dọc đặt ảnh BÊN CẠNH chữ, nên cột chữ còn khoảng 20px và
  tiêu đề tràn ra ngoài ô lưới.
- Tái hiện trong Chromium (trang thử với dữ liệu giả, 1440px, bài bitesize
  `portrait: true` "governance reading list"): khung chữ tiêu đề 1032→1136, ô
  lưới 629→1034, tràn khoảng 100px.
- Sửa: thẻ dọc bỏ qua `mediaWidth` (dùng 40% mặc định của thẻ); ô hẹp dưới
  300px thì xếp ảnh lên trên (`useNarrow(card, 300)`, `mobile` của `BitesizeCard`).
- Đo lại: 0px tràn ở 390/905/1024/1280/1440, với 2/3/4/6 bài, ba loại bài.
- `lib/useNarrow.ts`: kiểu tham số `max` đổi sang `number` (trước là literal 899).

Chưa chắc đây đúng là lỗi chủ site thấy: tôi không đọc được dữ liệu thật để
biết bài governance có phải bitesize dọc hay không.

## [SỬA LỖI] Mở bài từ bài thứ hai trở đi, bài nằm dưới mép màn

- Mở một bài làm lưới xếp lại (bài rộng 9 cột, `gridAutoFlow: 'row dense'`),
  nên bài vừa mở rơi xuống dưới. Trang thử ở 1440×900: bài thứ hai mở ra ở
  y≈1030, ngoài màn.
- Sửa: `Notes` có `useEffect` theo `openNote`, gọi `scrollIntoView` tới bài vừa
  mở (`data-note`), `scrollMarginTop` 32px (16px trên điện thoại). Tôn trọng
  `prefers-reduced-motion`.

## Chưa sửa: Taste Modality vẫn đứng đầu dù đã bỏ ghim

Thứ tự công khai: `pinned` desc, `sort_order` asc nulls last, `published_at`
desc (`data/usePublishedPosts.ts`, `lib/postOrder.ts:comparePosts`). Bài
taste modality là bài cũ nhất của Ghi 01 (`docs/spine/design-02-module-surfaces.md`),
nên nếu nó vẫn đứng đầu khi `pinned = false` thì nhiều khả năng nó có
`sort_order` từ một lần kéo thả, còn bài đăng sau có `sort_order` null và xếp
sau mọi bài đã kéo. Chưa kiểm được trên dữ liệu thật.

Ghi chú bên lề: danh sách tab Bài viết (`PostsPanel.tsx`, `ordered`) chỉ xếp
theo ghim rồi theo thứ tự máy chủ, không theo `comparePosts`, nên không nhìn
thấy được thứ tự ngoài site ở đó.
