# Ghi 01: khối 8 ô cố định theo bản vẽ

PR: #50 · nhánh `claude/project-thread-12dfli`

Chủ site 2026-09-24 gửi bản vẽ tay và yêu cầu: "có 2 size bài viết … fix vị trí … bài 1 → index 7, bài 2 → index 6, … bài 8 → index 0 … tới bài thứ 9 → tạo thêm 1 cục layout 8 ô".

## [ĐỔI HÀNH VI] Bài vào ô cố định, bài cũ nhất ở ô 7

- Trước (PR #48): bài xếp theo thứ tự mới nhất trước, mỗi hàng hai bài một món trang trí, ba kiểu hàng xoay vòng. Thêm một bài mới là mọi bài cũ dời đi một chỗ.
- Sau: `placePosts` trong `frontend/src/lib/notesBlocks.ts`. Khối 8 ô (`BLOCK_SIZE`). Bài cũ nhất vào ô 7 của khối dưới cùng, bài kế vào ô 6, … bài thứ 8 vào ô 0. Bài thứ 9 mở khối mới **phía trên**, lại bắt đầu từ ô 7. Bài đã nằm ô nào thì không đổi ô khi có bài mới (test `notesBlocks.test.ts`, "thêm bài mới không dời chỗ bài cũ").
- "Cũ nhất" tính theo thời gian thôi: `byTimeNewestFirst` (cùng file) xếp theo `published_at`, thiếu thì `created_at`, hoà thì theo `id`. Ghim và `sort_order` bị bỏ qua **trên trang Ghi 01**, vì để chúng chen vào thì bài đổi ô. `usePublishedPosts` không đổi, các trang khác vẫn tôn trọng ghim.
- Lọc theo tag thì khối tính lại trên danh sách đã lọc.

## [ĐỔI HÀNH VI] Hình khối theo bản vẽ, hai cỡ bài

`SLOTS` trong `screens/Notes.tsx`, lưới 12 cột, ba dải:
- Dải trên: ô 0 lớn (5 cột) bên trái, ô 1 nhỏ (4 cột) bên phải, ảnh trang trí nhỏ ngay dưới ô 1 (`PHOTO_SPOT`).
- Dải giữa: câu trích bên trái (`QUOTE_SPOT`), ô 2 nhỏ ở giữa, ô 3 nhỏ lệch trái bên dưới, ô 4 lớn bên phải thấp xuống.
- Dải dưới: ô 5, 6, 7 nhỏ, cao thấp khác nhau.

Bản vẽ có bảy khung bài. Chủ site nói tám ô, nên tôi đặt ô thứ tám ở dải dưới (ba bài thay vì hai). Đây là chỗ tôi tự chọn.

Trang trí: mỗi khối một ảnh theo thứ tự F, hết ảnh thì thôi; câu trích xuất hiện một lần, ở khối đầu tiên có ô 2. Trang trí cạnh ô trống thì không vẽ (`blockLayout`).

Bài mở ra: nằm ở hàng trống ngay dưới dải của nó (`OPEN_ROW`), chín trên mười hai cột như trước.

Điện thoại: một cột theo thứ tự khối, ô; bài lớn rộng 92%, bài nhỏ xoay bốn cặp bề rộng/lề (`MOB_POSTS`).

## [ĐỔI HÀNH VI] Dọn phần không còn dùng

- Xoá ô F4 (`kind: 'count'`, ô đếm bài) khỏi `featureCells` trong `content/notes.ts`, cùng kiểu `'count'`. Trang đã không vẽ nó từ PR #47. Các ô khác giữ số cũ vì số được lưu cùng ảnh trong `modules.feature_cells`.
- `FeatureCellsEditor`: nhãn "Ảnh trang trí ở chân trang" thành "Ảnh trang trí", vì trang trí giờ nằm trong khối chứ không ở chân trang.

## Bảng, cột, endpoint

Không đụng. Chỉ đọc lại dữ liệu cũ của `usePublishedPosts` (thêm dùng `published_at`, `created_at` ở phía trang) và `modules.feature_cells`.

## Bằng chứng

`npm test` 1514 xanh. Kiểm bằng trình duyệt trên dữ liệu giả, 1/3/5/8/9/10 bài ở 390, 905, 1280, 1440px: không món nào đè món nào.
