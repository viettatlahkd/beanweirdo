-- Ảnh Trang chủ và ảnh trang module là hai thứ khác nhau.
--
-- `img1..3` / `shot1..3` phục vụ cả hai bề mặt, nên sửa ảnh ở một nơi là đổi cả
-- hai — và tệ hơn, hai bề mặt cần số ảnh khác nhau. Dải ảnh Trang chủ luôn ba ô,
-- còn trang module thì tuỳ dàn trang:
--
--   band     — 1 ô, dải hero cao 208
--   specimen — 3 ô
--   sequence — 4 ô, dải rang 01…04
--
-- Roasting cần bốn ảnh cho trang của nó và Trang chủ chỉ có ba cột, nên ô thứ
-- tư không có chỗ nào để ở. Đây là chỗ hai khái niệm phải tách ra.
--
-- `img1..3` giữ nguyên nghĩa cũ: ảnh giới thiệu module ở Trang chủ.
-- `page_img1..4` là ảnh trên chính trang module.
--
-- Để rỗng thì trang module lấy theo ảnh Trang chủ, nên không có gì đổi mặt sau
-- migration này: mọi module đang rỗng cả bốn cột, và trang module vẫn vẽ đúng
-- cái nó đang vẽ.

alter table public.modules
  add column if not exists page_img1 text,
  add column if not exists page_img2 text,
  add column if not exists page_img3 text,
  add column if not exists page_img4 text,
  add column if not exists page_shot1 text not null default '',
  add column if not exists page_shot2 text not null default '',
  add column if not exists page_shot3 text not null default '',
  add column if not exists page_shot4 text not null default '';

comment on column public.modules.page_img1 is
  'Ảnh trên trang module. Rỗng thì trang module lấy theo img1 của Trang chủ.';
comment on column public.modules.page_img4 is
  'Chỉ dàn trang sequence dùng tới ô thứ tư (dải rang 04 — phát triển).';
