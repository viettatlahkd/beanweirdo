-- Mỗi site có đúng một trang chủ, đánh dấu trong `nodes`.
--
-- Chủ site (2026-10-14): "https://beanweirdo.vercel.app/biz-hkd đây chính là
-- trang chủ của bizops". PR #87 nhận ra trang ấy bằng slug `biz-hkd` viết cứng
-- trong code: đổi slug là tab biz mất thẻ Trang chủ. Cột `is_home` thay cho hằng
-- ấy, và site thứ ba sau này chỉ cần đánh dấu một dòng.
--
-- Chỉ thêm cột có mặc định: code đang chạy không đọc nó nên chạy file này trước
-- khi deploy code mới vẫn an toàn.
--
-- Số hiệu 0034: 0033 là migration cuối đã chạy.

begin;

alter table public.nodes
  add column if not exists is_home boolean not null default false;

-- Một site, một trang chủ.
create unique index if not exists nodes_one_home_per_site on public.nodes (site) where is_home;

update public.nodes set is_home = true where site = 'port' and slug = 'biz-hkd';

commit;

-- Kiểm tra: dán kết quả câu này lại cho Claude.
-- Mong đợi: đúng một dòng, site port, slug biz-hkd.
select site, slug, title, status from public.nodes where is_home;
