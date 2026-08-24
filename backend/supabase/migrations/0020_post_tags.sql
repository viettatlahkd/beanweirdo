-- `kind` là bốn chữ do lập trình chọn: note, essay, ref, log. Chủ site không
-- viết theo bốn chữ đó, và không có cách nào thêm chữ thứ năm ngoài việc sửa
-- ràng buộc trong cơ sở dữ liệu. Nay thành tag: chủ site tự đặt, tự dùng lại.
--
-- Số hiệu 0020, không phải 0019: 0017, 0018 đều đã có hai file trùng số và
-- 0019 đã bị dùng.

create table if not exists public.tags (
  id         text primary key,
  label      text not null,
  created_at timestamptz not null default now()
);

alter table public.tags enable row level security;

drop policy if exists "tags đọc công khai" on public.tags;
create policy "tags đọc công khai" on public.tags for select using (true);

grant select on public.tags to anon, authenticated;
grant all on public.tags to service_role;

-- Bốn `kind` cũ thành bốn tag đầu tiên, nên không bài nào mất nhãn.
insert into public.tags (id, label)
values ('note', 'note'), ('essay', 'essay'), ('ref', 'ref'), ('log', 'log')
on conflict (id) do nothing;

-- Bỏ ràng buộc bốn chữ. `kind` vẫn là cột cũ, vẫn bắt buộc, chỉ thôi bị giới
-- hạn — mọi bài đang có đều giữ nguyên giá trị.
alter table public.posts drop constraint if exists posts_kind_check;
