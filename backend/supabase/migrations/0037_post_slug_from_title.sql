-- 0037 — Địa chỉ bài lấy theo tên bài; bỏ địa chỉ cũ.
--
-- Chủ site (2026-10-15): slug của mọi bài sinh từ tên bài (không dấu, nối bằng
-- "-"), đổi tên thì đổi theo, và link không còn bài nào trả lời thì xoá chứ
-- không giữ lại để chuyển hướng.
--
-- Từ bản code này, địa chỉ được tính từ `posts.en` mỗi lần đọc
-- (frontend/src/lib/postSlug.ts:slugsFor); `posts.slug` chỉ còn giữ địa chỉ gõ
-- tay. Những slug kiểu `ghi-p260824` mà lần Publish đầu tiên tự ghi vào
-- (migration 0027) không phải gõ tay, nên xoá để bài về địa chỉ theo tên.
--
-- Chạy SAU khi bản code này đã lên production.

-- Xem trước: các bài sẽ về địa chỉ theo tên.
select id, en, slug from public.posts where slug ~ '^[a-z0-9-]+-[a-z]+[0-9]{6}(-[a-z])?$';

update public.posts
   set slug = null
 where slug ~ '^[a-z0-9-]+-[a-z]+[0-9]{6}(-[a-z])?$';

-- Địa chỉ cũ không còn chuyển hướng: code không đọc bảng này nữa.
drop table if exists public.post_slugs;

-- Kiểm: phải ra 0 và null.
select count(*) as con_slug_kieu_ngay from public.posts where slug ~ '^[a-z0-9-]+-[a-z]+[0-9]{6}(-[a-z])?$';
select to_regclass('public.post_slugs') as bang_dia_chi_cu;
