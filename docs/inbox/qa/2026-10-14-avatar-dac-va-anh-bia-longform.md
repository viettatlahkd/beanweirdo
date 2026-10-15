# Avatar chồng không còn trong suốt · ảnh bìa ở đầu bài long-form

PR: #88 · nhánh `claude/project-thread-7qtcke`

## [SỬA LỖI] Avatar tác giả chồng nhau bị trong suốt

- Trước: ô chữ cái thay ảnh (tác giả chưa có ảnh) có nền `rgba(127,127,127,.22)`,
  nên avatar thứ hai đè lên avatar thứ nhất mà vẫn nhìn xuyên qua.
- Sau: mọi avatar có nền đặc `#E4E0D8`, chữ `#3A3833`; viền khi chồng là trắng
  đặc `#fff`. — `frontend/src/components/Byline.tsx:Avatar`
- Tái hiện: bài "jurisprudence: ai xét người phán xét?" (hai tác giả, người thứ
  hai không có ảnh).

## [ĐỔI HÀNH VI] Long-form vẽ ảnh bìa ở đầu cột đọc

- Trước: khuôn long-form không vẽ `hero_image_url` ở đâu trên trang bài; ảnh bìa
  chỉ hiện ở thẻ bài trong danh sách (`lib/postThumb.ts:postThumb`) và ở băng ảnh
  bìa của màn sửa (`admin/components/CoverBand.tsx`). Bản
  `backup/norway-main-2026-10-04` cũng vậy — không phải mất khi gộp upstream.
- Sau: có ảnh bìa thì vẽ một ô rộng hết cột đọc, tỉ lệ 1200/628, trên tên bài.
  Không có thì không đổi gì. — `LongformPostData.cover` (`post-renderer/src/types.ts`),
  `Longform` (`post-renderer/src/Longform.tsx`, `data-testid="lf-cover"`),
  `toLongformData` (`frontend/src/lib/postToRenderer.ts`).
- Màn sửa long-form cũng vẽ ảnh này (như article/bitesize/memo đã vẽ ảnh bìa thật).
- Cards và report vẫn không vẽ ảnh bìa trên trang bài.

## Dữ liệu đã đọc (chỉ đọc)

- `posts`: `id, en, vi, template, status, hero_image_url, thumbnail_url, updated_at`
  của bài trên, qua REST bằng khoá publishable công khai. `hero_image_url` vẫn còn.
- `post_authors` + `authors(id, name, avatar_url)` của bài đó.
