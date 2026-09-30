-- Bản nháp của một bài **đã đăng**.
--
-- Trước migration này màn sửa ghi thẳng vào hàng `posts`, nên sửa một chữ ở
-- bài đã đăng là chữ ấy lên trang ngay khi rời ô, không cần bấm gì. Chủ site
-- (2026-09-24): "nếu không bấm publish thì coi như chỉ là auto lưu nháp …
-- publish là phải click thì mới chuyển sang state publish".
--
-- Nên bài đã đăng giữ hai bản: hàng `posts` là bản đang đăng, trang công khai
-- đọc nó như cũ; hàng ở đây là những ô đã sửa mà chưa đăng, cùng tên cột với
-- `posts`. Bấm Publish thì API chép `data` vào `posts` rồi xoá hàng này.
-- Bài còn là nháp thì không cần bảng này — nó chưa lên trang — nên màn sửa vẫn
-- ghi thẳng như trước.
--
-- Một bảng riêng chứ không phải một cột jsonb trên `posts`: trang công khai
-- đọc `posts` bằng khoá anon với `select('*')` (`frontend/src/data/usePost.ts`),
-- nên một cột nháp ở đó sẽ gửi chữ chưa đăng tới trình duyệt của mọi người đọc.
-- Bảng này bật RLS và không có policy nào, nên chỉ khoá service của API đọc
-- được.
--
-- Số hiệu 0028: 0027 là migration cuối đã chạy.

create table if not exists public.post_drafts (
  post_id    uuid primary key references public.posts(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.post_drafts enable row level security;

comment on table public.post_drafts is
  'Những ô đã sửa mà chưa đăng của một bài đã đăng, cùng tên cột với posts. Publish chép vào posts rồi xoá hàng.';
