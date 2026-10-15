# Sửa tên bài và slug ở ngăn "Thông tin bài"

PR: (số PR ghi ở mô tả PR) · nhánh `claude/project-thread-y8z0tm`

Chủ site (2026-10-15): tên bài không khớp với heading trong bài, và không có chỗ
nào sửa tên; muốn sửa được từ danh sách và trong ngăn bên, có slug tự sinh từ
tên (không dấu, khoảng trắng thành "-"), và thứ tự ngăn: tên bài → slug → tác
giả → module…

## Tìm thấy

- Tên bài luôn là cột `posts.en`, không bao giờ đọc từ heading
  (`postTitle` trong `frontend/src/lib/postText.ts`, `toLongformData` trong
  `frontend/src/lib/postToRenderer.ts`). Nó được đặt một lần ở hộp "Bài mới";
  heading trong thân bài viết riêng nên hai thứ trôi khỏi nhau.
- Khuôn long-form không có ô sửa tên trên trang (`LongformEditor` trong
  `Editor.tsx` không truyền `renderTitle`; `Longform` của post-renderer cũng
  không nhận) — trước PR này bài long-form không đổi tên được ở đâu cả.

## Thay đổi

1. **[ĐỔI HÀNH VI]** Ngăn "Thông tin bài" (`PostSettings`) có ô **Tên bài** ở
   đầu, ghi `en` qua đúng đường patch của màn soạn / danh sách. Bài đã đăng thì
   tên mới vào bản nháp như mọi chữ khác (`DRAFT_FIELDS` trong
   `backend/lib/drafts.ts`), ngăn nói điều đó. Tên rỗng bị bỏ qua.
   Nếu heading đầu bài (`proseOf`) khác tên, dưới ô hiện heading ấy kèm nút
   "Dùng làm tên".
2. **[ĐỔI HÀNH VI]** Thứ tự ngăn: trước là Vị trí (Chủ đề, Tag) · Người viết ·
   Hiển thị (Template, Màu mượn từ, Màu bài) · Địa chỉ & quyền xem. Sau là
   Tên & người viết (Tên bài, Slug, Tác giả) · Vị trí (Màu mượn từ, Chủ đề,
   Tag) · Hiển thị (Template, Màu bài, Quyền xem). Ô "Địa chỉ" đổi tên thành
   "Slug" và dời lên; mục "Địa chỉ cũ" bị bỏ.
3. **[ĐỔI HÀNH VI]** Địa chỉ của mọi bài tính từ tên bài mỗi lần đọc
   (`slugsFor` trong `frontend/src/lib/postSlug.ts`, `titleSlug`):
   "Cà phê Đặc" → `ca-phe-dac`, nháp `ca-phe-dac.draft`, trùng thì `-b`, `-c`
   (bài cũ hơn giữ tên trơn). Tên không có chữ/số thì về kiểu cũ
   `module-pYYMMDD`. Trước: luôn `module-pYYMMDD`, ghi cố định vào
   `posts.slug` ở lần Publish đầu. Sau: Publish không ghi slug nữa (`fixAddress`
   trong `status.ts` và tham số `slug` của `transitionStatus` bị xoá);
   `posts.slug` chỉ giữ slug gõ tay. Sổ địa chỉ công khai đọc thêm cột `en`.
4. **[ĐỔI HÀNH VI]** Slug gõ tay được làm sạch như tên rồi lưu, không đổi theo
   tên; nút "Theo tên bài" gửi `slug: null` để quay về địa chỉ theo tên
   (`PATCH /api/posts/:id` nay nhận `null`).
5. **[ĐỔI HÀNH VI]** Bỏ chuyển hướng địa chỉ cũ (chủ site: link không còn bài
   nào thì xoá). Xoá: ghi `post_slugs` khi đổi slug, `forget_slugs`, `old_slugs`
   trong GET/PATCH bài, `forwards` trong `usePostAddresses`, effect chuyển
   hướng trong `App.tsx`. Link cũ giờ ra trang "không có bài".
6. `toSlug` / `uniqueSlug` riêng trong `PortEditors.tsx` thay bằng `titleSlug` /
   `freeSlug` dùng chung.

## SQL

`backend/supabase/migrations/0037_post_slug_from_title.sql` — chạy sau khi
deploy: đặt `posts.slug = null` cho slug kiểu ngày (do Publish tự ghi), và
`drop table post_slugs`.

## Bảng, cột, endpoint

- Đọc: `posts.en` thêm vào truy vấn sổ địa chỉ công khai.
- Ghi: `posts.en` (hoặc `post_drafts.data.en` với bài đã đăng), `posts.slug`
  qua `PATCH /api/posts/:id`. `POST /api/posts/:id/status` thôi ghi `slug`.
- Bỏ: `post_slugs` (mọi đọc ghi; bảng bị drop ở 0037).

## Kiểm

- `usePostAddresses.test.ts`: địa chỉ theo tên, slug gõ tay giữ chỗ, nháp
  mang `.draft`.
- Harness `cms-harness.html?screen=edit`: đổi tên trong ngăn thì tiêu đề trên
  trang đổi theo; gõ "Đường Sữa đá" vào Slug lưu thành `duong-sua-da`.
