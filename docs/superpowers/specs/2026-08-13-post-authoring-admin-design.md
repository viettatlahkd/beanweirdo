# Post authoring & admin flow — design

**Date:** 2026-08-13
**Status:** approved, ready for planning

## Vấn đề

`beanweirdo` hiện có 1 frontend public (`frontend/`) hoàn toàn mockup tĩnh — nội dung
bài viết nằm trong `src/content/*.ts`, không đọc gì từ Supabase. Cách duy nhất để thêm
bài là vào Supabase Table Editor sửa tay từng cell, paste JSON vào cột `body`
(`backend/README.md`). Không có:

- Admin UI cho việc soạn/đăng bài.
- Trạng thái bài viết (draft/published/archived/deleted) — mọi row trong `posts` coi
  như public ngay khi tồn tại.
- Pipeline upload ảnh thật — ảnh hiện chỉ là khối màu placeholder
  (`nav.tsx`: "with real photography dropped in, these blocks become the `<img>` slots").
- Khái niệm "template" hiển thị tách khỏi module — `layout`/màu hiện gắn cứng vào
  từng module trong `modules` table.

Spec này thiết kế toàn bộ luồng "đăng 1 bài mới" và hạ tầng admin cần thiết.

## Phạm vi

**Trong scope:**
- Admin app (đăng nhập, dashboard, soạn/sửa bài, quản lý template).
- Status lifecycle đầy đủ cho `posts`.
- Template system (layout + màu) tách khỏi `modules`, admin tạo/sửa được.
- Upload ảnh thật (hero + inline trong section) qua Supabase Storage.
- Nối public frontend đọc dữ liệu thật từ Supabase thay vì static `content/*.ts`
  (bắt buộc — nếu không làm, admin publish xong public site vẫn không đổi gì).
- Refactor: tách logic render bài viết thành component dùng chung giữa public site và
  admin editor (true WYSIWYG).

**Ngoài scope (không làm ở lần này):**
- Đa tác giả / phân quyền — chỉ 1 admin duy nhất (xác nhận với user).
- Sửa nội dung phần "personal journal" (`hour_logs`, `notes`, `activity_kinds`) — không
  đổi gì ở đây.
- Trang/luồng quản lý riêng cho `modules` (thêm/sửa module) — module vẫn sửa tay qua
  Table Editor như hiện tại, chỉ `posts`/`templates` có admin UI.
- Comment, SEO, RSS, lịch đăng bài (scheduled publish) — có thể làm sau.

## Kiến trúc

```
beanweirdo/
  frontend/        # public site — hiện có, sẽ được nối đọc Supabase thật
  admin/           # MỚI — 1 app Next.js trên Vercel: FE (pages) + BE (API routes)
  backend/         # supabase/schema.sql mở rộng thêm bảng + policy
```

- **`admin/`** là 1 project Next.js duy nhất deploy trên Vercel — route FE (`/login`,
  `/posts`, `/posts/new`, `/templates`) và API routes (`/api/posts`, `/api/upload`, …)
  sống chung 1 project. Đây là cách khớp với stack "Vercel BE + Vercel FE" mà không
  phải tự dựng CORS giữa 2 deployment riêng.
- API routes giữ `service_role` key phía server, verify Supabase session JWT (gửi kèm
  từ FE) trước khi cho phép ghi. `service_role` không bao giờ lộ ra client — đây là lý
  do có BE riêng thay vì FE gọi thẳng Supabase như README hiện tại cảnh báo.
- Auth: tái dùng magic-link email hiện có trong Supabase Auth. Không có khái niệm role
  — bất kỳ ai đăng nhập được (biết email) đều là admin, vì chỉ có 1 tài khoản dùng app
  này trong thực tế.
- Public `frontend/` gọi thẳng Supabase với anon key (như thiết kế RLS hiện tại), chỉ
  đọc, không ghi — không đổi gì về nguyên tắc bảo mật đã có.

## Data model

Thêm vào `backend/supabase/schema.sql`:

```sql
-- Template: layout + màu, độc lập với module. Post chọn 1 template khi đăng,
-- không bị ràng buộc phải theo layout của module chứa nó.
create table templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  layout      text not null check (layout in ('band', 'specimen', 'sequence')),
  accent      text not null,
  on_color    text not null,
  tint        text not null,
  tint2       text not null,
  created_at  timestamptz not null default now()
);

alter table posts
  add column status          text not null default 'draft'
                              check (status in ('draft', 'published', 'archived', 'deleted')),
  add column template_id     uuid references templates(id),
  add column hero_image_url  text,
  add column published_at    timestamptz,
  add column deleted_at      timestamptz,
  add column previous_status text; -- status trước khi Delete, dùng để Restore từ Trash
```

- `body` (jsonb, đã có) giữ nguyên shape `Section[]` (`h`, `p`, `fig?`) — thêm 1 field
  `image_url` vào `fig` khi có ảnh minh hoạ cho section đó. Không cần migration cho
  field mới trong jsonb.
- Seed 3 template mặc định tương ứng 3 bộ màu/layout hiện có trong `modules` (band/
  blush, specimen/leaf, sequence/apricot), để không mất context thiết kế cũ.
- `modules` giữ nguyên schema — cột `layout`/màu của nó vẫn dùng cho trang module
  landing (`ModuleScreen.tsx`), chỉ không còn quyết định giao diện của *từng post* nữa.

**RLS / quyền đọc:**

| status | ai đọc được | có trong listing/trang chủ? |
|---|---|---|
| draft | chỉ admin (qua `admin/`, JWT) | không |
| published | mọi người | có |
| archived | mọi người, chỉ qua link trực tiếp (slug) | không |
| deleted | chỉ admin (màn Trash) | không |

`posts` policy public-read đổi từ `for select using (true)` thành
`for select using (status = 'published')`; truy cập `draft`/`archived`/`deleted` đi qua
API route của `admin/` (dùng service_role, tự kiểm tra status phù hợp với ngữ cảnh:
trang public gọi `/api/posts/[slug]` cho phép `published` hoặc `archived`, không cho
`draft`/`deleted`).

## Status lifecycle

```
        Publish                Archive
Draft ────────────► Published ────────────► Archived
  ▲                     │                       │
  └─────── Unpublish ───┘                       │
  ▲                                              │
  └──────────────── Restore ────────────────────┘

Draft / Published / Archived ── Delete ──► Deleted (Trash, giữ 30 ngày)
Deleted ── Restore ──► trạng thái trước khi xoá (lưu trong cột phụ trước khi soft-delete)
Deleted ── Permanently delete (tay hoặc tự động sau 30 ngày) ──► xoá cứng khỏi DB
```

Action nào set field nào:

| Action | status trước | status sau | field khác |
|---|---|---|---|
| Tạo bài mới | — | `draft` | |
| Publish | `draft` | `published` | `published_at = now()` |
| Unpublish | `published` | `draft` | |
| Archive | `published` | `archived` | |
| Restore (từ archived) | `archived` | `published` | |
| Delete | bất kỳ | `deleted` | `deleted_at = now()`, `previous_status = status cũ` |
| Restore (từ trash) | `deleted` | `previous_status` | `deleted_at = null`, `previous_status = null` |
| Permanently delete | `deleted` | — (xoá row) | |

## Template system

- `templates` là thư viện độc lập, quản lý qua admin UI (tạo mới: chọn 1 trong 3
  `layout` + 4 màu `accent`/`on_color`/`tint`/`tint2`). Font **không** nằm trong
  template — cố định toàn site (Playfair Display + Be Vietnam Pro, theo
  `design/tokens.ts`), không đổi theo bài.
- 1 post thuộc 1 module (phân loại nội dung) nhưng chọn 1 template độc lập (giao diện)
  — post của module `roasting` hoàn toàn có thể dùng template mang layout/màu vốn
  "thuộc" `sensory`.

## Shared renderer

Tách phần render bài viết (hero band theo layout, section heading+paragraph, figure,
pull-quote) hiện nằm rải rác trong `frontend/src/screens/Article.tsx` /
`Landing.tsx` / `ModuleScreen.tsx` thành 1 bộ component nhận
`(template, sections, heroImageUrl)` làm props, xuất ra như 1 package/module dùng
chung. Public site import bản read-only; `admin/` import cùng bộ, bọc thêm lớp overlay
cho phép edit-in-place (input đè lên chỗ hiển thị text, vùng kéo-thả đè lên chỗ hiển thị
ảnh) — đảm bảo canvas soạn bài trong admin **là** bản render thật, không phải bản vẽ
lại gần giống.

## Admin flow

Đã duyệt qua wireframe trong phiên brainstorm (`.superpowers/brainstorm/`, screens:
`status-lifecycle.html`, `dashboard-v2.html`, `full-mockup.html`).

1. **Đăng nhập** (`/login`) — magic-link email, dùng Supabase Auth hiện có.
2. **Dashboard** (`/posts`) — tab lọc theo status (Tất cả/Draft/Published/Archived/
   Trash); mỗi row: thumbnail (hero image), tiêu đề, badge status, meta (module · kind
   · tác giả · ngày đăng/sửa), preview 2 dòng đầu nội dung, action phù hợp với status
   hiện tại của post đó (bảng ở trên).
3. **Bài mới / Sửa bài** — 3 bước:
   - *Bước 1 — Metadata*: chọn module, chọn kind (note/essay/ref/log), tiêu đề EN/VI.
   - *Bước 2 — Template*: chọn từ thư viện `templates` (mini-preview đúng tỉ lệ layout
     thật, không phải khối màu phẳng), hoặc tạo template mới.
   - *Bước 3 — Soạn bài*: canvas WYSIWYG (shared renderer) — sửa tiêu đề/nội dung
     inline, kéo-thả ảnh thẳng vào khung hero hoặc từng section (không có bước "upload
     ảnh" tách riêng). Autosave định kỳ. Có nút **Xem trước** (render full trang public
     thật, có sidebar, không giới hạn bề rộng canvas) trước khi quyết định Lưu nháp
     hay Publish.

## Upload ảnh

- Supabase Storage bucket `post-images`, public-read.
- Admin FE upload qua API route của `admin/` (không upload thẳng từ browser lên
  Storage bằng anon key, để kiểm soát được kích thước/định dạng file phía server).
- Lưu URL vào `posts.hero_image_url` (ảnh hero) hoặc `body[i].fig.image_url` (ảnh
  trong section).

## Kế hoạch triển khai (cho bước writing-plans)

3 mảng việc, tối đa hoá song song theo yêu cầu — ranh giới phụ thuộc thật sự:

- **A. Schema & data**: migration `templates` + cột mới trên `posts` + RLS + seed —
  không phụ thuộc gì, làm trước/song song với B và C.
- **B. Shared renderer + nối public FE đọc Supabase thật**: phụ thuộc A (cần schema có
  sẵn để biết shape dữ liệu đọc). Độc lập với C.
- **C. Admin app (`admin/`)**: BE (API routes, CRUD + upload + status actions) và FE
  (login/dashboard/wizard) có thể chạy song song với nhau vì nói chuyện qua 1 hợp đồng
  API cố định (định nghĩa trước trong plan); C phụ thuộc A (schema) và phần renderer
  của B (để bước 3 dùng shared component) nhưng **không** phụ thuộc việc B nối xong
  public FE.

Thứ tự khả thi: A trước (nhanh, ~vài giờ) → B và C chạy song song ngay sau đó (C tách
tiếp BE/FE con song song với nhau).

## Giả định cần xác nhận khi bắt đầu implement

- `admin/` là 1 Next.js app duy nhất (FE+API routes chung project) — nếu bạn muốn 2
  project Vercel tách biệt thật (FE tĩnh + BE riêng, cần CORS), báo lại trước khi
  writing-plans generate task cho phần này.
- Trash tự động xoá cứng sau 30 ngày cần 1 cron job (Supabase pg_cron hoặc Vercel Cron)
  — nằm trong C, sẽ chi tiết hoá ở plan.
