-- Trang chủ của biz và của bean, thay cho cờ `is_home` của 0034.
--
-- Chủ site (2026-10-14): "https://beanweirdo.vercel.app/been-hkd trang chủ khối
-- bean là cái này". Cả /biz-hkd lẫn /been-hkd đều là trang dựng bằng khối, nằm
-- ở site 'port' (đường hiển thị trang khối đọc site ấy). Cờ `is_home` của 0034
-- chỉ cho mỗi site một trang chủ, nên không đánh dấu được hai trang cùng site
-- 'port' cho hai site con khác nhau. `home_of` nói thẳng trang là trang chủ của
-- site con nào.
--
-- Chỉ đổi cột mà code đang chạy không đọc: chạy trước khi deploy code mới vẫn an toàn.
--
-- Số hiệu 0035: 0034 là migration cuối đã chạy.

begin;

alter table public.nodes
  add column if not exists home_of text check (home_of in ('biz', 'bean'));

create unique index if not exists nodes_home_of_key on public.nodes (home_of) where home_of is not null;

update public.nodes set home_of = 'biz'  where site = 'port' and slug = 'biz-hkd';
update public.nodes set home_of = 'bean' where site = 'port' and slug = 'been-hkd';

drop index if exists public.nodes_one_home_per_site;
alter table public.nodes drop column if exists is_home;

commit;

-- Kiểm tra: dán kết quả câu này lại cho Claude.
-- Mong đợi: hai dòng, bean · been-hkd và biz · biz-hkd.
select home_of, slug, title, status from public.nodes where home_of is not null order by home_of;
