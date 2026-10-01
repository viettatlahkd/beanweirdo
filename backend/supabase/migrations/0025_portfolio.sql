-- Portfolio: trang port và design system của nó.
--
-- Portfolio là một khu riêng trong admin, đứng trên Content management. Nó có
-- hai thứ phải lưu:
--
--   1. Trang port — mỗi trang là một danh sách khối (component của design
--      system) xếp từ trên xuống. Khối không chứa bài: nó chứa *cách lấy bài*
--      (theo module, theo tag, bài ghim, hay chọn tay), nên bài mới đăng tự
--      hiện vào trang mà không ai phải sửa lại port.
--   2. Design system — mã màu, font, cỡ chữ, khoảng cách, bo góc. Một dòng duy
--      nhất, cùng khuôn với site_settings (0007): một túi jsonb lớn dần theo
--      màn hình chỉnh sửa, không đáng mỗi lần thêm một cột.
--
-- Số hiệu 0025: 0024 là migration cuối đã có.

create table if not exists public.portfolio_pages (
  id          uuid primary key default gen_random_uuid(),

  -- Đường dẫn công khai /portfolio/<slug>. Chỉ chữ thường, số và gạch nối,
  -- vì nó đi thẳng vào URL.
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  intro       text not null default '',

  -- Bảng màu của trang, là một khoá trong portfolio_design.data.palettes
  -- ('biz', 'baen', hoặc bảng chủ site tự thêm). Không ràng buộc danh sách ở
  -- đây vì danh sách đó do chủ site sửa, không phải lập trình.
  palette     text not null default 'biz',

  -- Mảng khối, theo thứ tự hiển thị. Hình dạng mỗi khối do frontend định
  -- nghĩa (frontend/src/portfolio/blocks.ts); cơ sở dữ liệu chỉ giữ nó.
  blocks      jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),

  status      text not null default 'draft' check (status in ('draft', 'published')),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.portfolio_pages enable row level security;

-- Người xem chỉ thấy trang đã đăng; nháp chỉ đọc qua API có đăng nhập.
drop policy if exists "portfolio đã đăng đọc công khai" on public.portfolio_pages;
create policy "portfolio đã đăng đọc công khai" on public.portfolio_pages
  for select using (status = 'published');

grant select on public.portfolio_pages to anon, authenticated;
grant all on public.portfolio_pages to service_role;

create table if not exists public.portfolio_design (
  -- Một dòng, bắt buộc: `id` chỉ có thể là true.
  id          boolean primary key default true check (id),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

insert into public.portfolio_design (id, data) values (true, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.portfolio_design enable row level security;

-- Trang công khai cần token để vẽ, nên đọc được bằng anon key. Rỗng nghĩa là
-- dùng giá trị mặc định trong frontend/src/portfolio/tokens.ts.
drop policy if exists "portfolio design đọc công khai" on public.portfolio_design;
create policy "portfolio design đọc công khai" on public.portfolio_design
  for select using (true);

grant select on public.portfolio_design to anon, authenticated;
grant all on public.portfolio_design to service_role;
