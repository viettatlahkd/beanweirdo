# Lỗi trình bày bài đăng: thanh màu Article, nhân bản bài, lề tên bài Long form

PR: #33 · nhánh `claude/project-thread-1onmw2`

## Đã đổi

1. **[ĐỔI HÀNH VI] Thanh màu đầu bài Article cao vừa với chữ.**
   `packages/post-renderer/src/Article.tsx` → `Article`: lề dưới của khối màu
   (desktop) đổi 124px → 72px, lấy từ `gridRules` → padding trong
   `frontend/src/content/designSystem.ts` ("72px dưới mỗi section"). Dòng mô tả
   (lead) không được vẽ khi rỗng và không có `renderLead`; màn sửa vẫn có ô.
   Tấm hero bên phải kéo dài theo khối màu nên cũng thấp đi theo.
   Màn sửa: ô mô tả của `ArticleEditor` (`frontend/src/admin/screens/Editor.tsx`)
   đổi sàn `rows` 2 → 1, thêm placeholder "mô tả".
   Trước: bài không có mô tả vẫn mang một khoảng trống 124px dưới tiêu đề.
   Sau: khối màu kết thúc 72px dưới dòng chữ cuối cùng của nó.

2. **[ĐỔI HÀNH VI] Nhân bản bài không chép ảnh.**
   `backend/lib/posts.ts` → `withoutImages` (mới), gọi trong
   `backend/api/posts/index.ts` → `handleCreate`, nhánh `fromPostId`.
   Trước: bản sao mang theo `hero_image_url`, `hero_caption` và mọi ảnh trong
   `body`, nên bản sao của bài jurisprudence mở ra với ảnh hạt cà phê và thẻ
   danh sách cũng hiện ảnh ấy (`thumbnail_url` tính từ `body`).
   Sau: mọi khoá `src`, `imageUrl`, `poster` dạng chuỗi trong `body` thành
   `null`; `hero_image_url`, `hero_caption` thành `null`; `thumbnail_url` vì thế
   là `null`. Chữ giữ nguyên. Tạo bài từ template (`templateId`) không đổi.
   Test cũ `copies an existing post` trong `backend/api/posts/index.test.ts`
   đã sửa theo — nó từng khẳng định bản sao giữ `hero_image_url`.

3. **[ĐỔI HÀNH VI] Ô ảnh trống của Long form là khung màu.**
   `packages/post-renderer/src/Longform.tsx` → khối `fig` và `fig` trong
   `AsideBlock`: chưa có ảnh thì nền `palette.tint` thay cho nền trắng viền
   xám. Có ảnh thì vẫn nền trắng như cũ (ảnh vẽ `contain`).

4. **[SỬA LỖI] Lề dưới tên bài Long form.**
   `Longform.tsx` → hằng `TITLE_GAP` (30px). Khoảng này đã có sẵn ở nhánh
   "không có khối tiêu đề" (phụ đề `margin: 0 0 30px`); nhánh thường chỉ có
   8px vì bản export gốc luôn có dòng `meta` tự mang 26px. Nay: khối kế tiếp
   là `meta` thì giữ 8px, còn lại 30px. Tái hiện: nhân bản bài jurisprudence
   (không có dòng meta), tên bài và phụ đề đứng sát đoạn đầu.
   Tôi không tìm được luật đánh số nào trong `designSystem.ts` nói đúng khoảng
   này; 30px là con số chính khuôn Long form đã dùng.

5. **[SỬA LỖI] Khung ghi chú và công thức chèn từ menu `+` không có ô gõ.**
   `frontend/src/admin/screens/Editor.tsx` → `ReportBlockFields`: `aside` và
   `formula` đã vào kho (`packages/post-renderer/src/elements/longform.tsx`)
   nên menu `+` của mọi khuôn chèn được, nhưng kiểu `ReportBlock` không kể
   tên chúng và `switch` rơi qua không vẽ gì. Thêm nhánh cho cả hai, cùng
   component mới `AsideFields` (mỗi đoạn cách dòng trống là một khối
   `paragraph` trong `items`).
   Bằng chứng: `body` của bài AI Twin do chủ site chạy SQL gửi lại — ba phần tử
   cuối là `{ type: 'aside', items: [{ type: 'paragraph', text: '' }] }`.
   Ba khung ấy vẫn rỗng trong dữ liệu; chữ phải gõ lại sau khi PR này lên.

## Chưa làm

- Có **hai** bài khớp `en ilike '%AI Twin%'`. Một bài lặp phần 4–7 ba lần, xen
  một ảnh và một khối `meta` rỗng. Chưa tìm nguyên nhân; chưa sửa dữ liệu.
- Bài jurisprudence hiện có vẫn giữ ảnh hạt cà phê trong dữ liệu; thay đổi số 2
  chỉ áp cho bản sao từ nay. Gỡ ảnh ở bài có sẵn thuộc luồng ảnh.

## Bảng, cột, endpoint đã đụng

- `POST /api/posts` (nhánh `fromPostId`): đọc bớt `hero_image_url`,
  `hero_caption` từ `posts`; ghi `body`, `hero_image_url`, `hero_caption`,
  `thumbnail_url` như trước nhưng giá trị khác.
- Không migration.
