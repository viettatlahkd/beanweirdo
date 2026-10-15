# Byline kiểu Medium trên trang bài, thẻ "Viết bởi" cuối bài

Nhánh `claude/medium-byline-izma3k` (cắt từ `main` sau PR #81) · PR mở ngày 2026-10-14 (số PR ở tiêu đề PR).

Chủ site (2026-10-14): phần tác giả, ngày đăng, metadata trên trang bài "không oke"; muốn kiểu Medium, chỉ hiện ô nào có giá trị. Chọn kiểu "A + B" trên mock: khối A (ảnh to, hai dòng, thẻ tác giả cuối bài) cộng ảnh chồng nhiều tác giả và tag của B.

## [SỬA LỖI] Vạch màu khuôn bitesize đè lên breadcrumb/byline
- Tái hiện: mở một bài bitesize có tác giả (vd. `/bean/post/ghi-p261001-i`), vạch hồng 8px nằm đè lên dòng "Viết bởi".
- Nguyên nhân: `Bitesize` vẽ vạch `post.band` **sau** `{breadcrumb}` rồi kéo lên mép trên bằng lề âm.
- Sửa: vẽ vạch trước `{breadcrumb}` (`packages/post-renderer/src/Bitesize.tsx`, hàm `Bitesize`).

## [ĐỔI HÀNH VI] Byline dưới breadcrumb
- Trước: `Byline` vẽ "Viết bởi An, Bình" cỡ 12px, ảnh 20px; tag là một hàng `TagBadges` riêng bên dưới (`screens/Article.tsx`).
- Sau: `Byline` (`frontend/src/components/Byline.tsx`) vẽ ảnh 40px (nhiều tác giả thì chồng lên nhau, có viền trắng), dòng 1 là tên ("kris", "kris và kay", "a, b và c"), dòng 2 là "N phút đọc · d tháng m, yyyy" rồi các badge `#tag`. Ô nào không có giá trị thì không vẽ; không có gì thì cả khối không vẽ.
- Ngày đăng = `posts.published_at`, chỉ khi `status === 'published'`.
- Phút đọc = `readMinutes(body)` (`frontend/src/lib/postText.ts`): đếm chữ trong mọi chuỗi của `body`, 200 chữ/phút, làm tròn lên, ít nhất 1.
- Không hiện ngày sửa: `posts.updated_at` đổi cả khi chỉ đổi thứ tự/ghim (`backend/api/posts/index.ts`, đoạn ghi `sort_order`), nên không phản ánh lần sửa nội dung.
- Ngày `date_label` của khuôn (vd. "2025.02") giữ nguyên.
- Trang xem trước của admin (`admin/screens/Preview.tsx`) vẽ cùng byline, không có tag (như trước).

## [ĐỔI HÀNH VI] Thẻ "Viết bởi" cuối bài
- Mới: `AuthorCard` (cùng file `Byline.tsx`) — mỗi tác giả một hàng: ảnh 56px, "VIẾT BỞI", tên, tiểu sử (`authors.bio`).
- Sáu khuôn nhận thêm prop `footer` (kiểu `Chrome` trong `PostRenderer.tsx`), vẽ ở cuối cột chữ: sau `renderAfterSections` (Article), `renderAfterCards` (Cards), `renderAfterElements` (Memo), `renderAfterBlocks` (Longform), dòng cuối lưới `ReportBody` (Report), cuối tờ trắng (Bitesize).

## Bảng, cột, endpoint
- `authors.bio` — đọc thêm trong `usePostAuthors` (public key). Không có endpoint mới, không ghi gì.
- `posts.published_at`, `posts.status`, `posts.body` — đọc, đã có trong `select('*')` của `usePost`.

## Kiểm tra
- `npm run typecheck`, `npm run lint` xanh.
- Mở trình duyệt (vite ở máy, Supabase thật, chỉ đọc): bài bitesize Detachment, longform "Course Menu", longform "5 ngày • 1 operating review" (2 tác giả, 1 tag, 1 tác giả không có ảnh).
