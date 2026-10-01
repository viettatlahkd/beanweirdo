# Bài viết — bốn lỗi: lọc tag, xoá tag, link portfolio, cửa Ghi 01

- Nhánh: `hotfix/bai-viet-4-loi` (cắt từ `origin/main` fb0fcb8)
- PR: #110
- Không đụng database thật. Không có migration.

## Đã sửa

### 1. [SỬA LỖI] Thanh lọc `/ghi` không lọc được tag có tên khác id

`posts.kind` lưu **id** của tag (slug do `backend/api/tags.ts:slug` tạo, ví dụ
`quan-sat`), nhưng `frontend/src/lib/notesFilter.ts:noteFilterBar` so `kind`
với **tên hiển thị** (`tags.map(t => t.label)`). Tag nào có tên khác id thì
không bao giờ có chip, và không lọc được bài nào.

- `notesFilter.ts:noteFilterBar` — đếm và lọc theo `tag.id`; chip mang thêm
  trường `label` để hiển thị. `FilterChip.f` giờ là id. Màu chip vẫn tính theo
  tên (`tagColor(label)` / `tagWash(label)`), nên màu của tag hiện có không đổi.
- `frontend/src/screens/Notes.tsx` — chip hiện `f.label` thay vì `f.f`. State
  `noteFilter` giữ id (hoặc `'tất cả'`).
- Test: `frontend/src/lib/notesFilter.test.ts` — dữ liệu mẫu có thêm `id`; thêm
  một ca tên ≠ id (`quan-sat` / `quan sát`).

Bảng đọc: `tags` (id, label), `posts` (kind) — không đổi so với trước.

### 2. [SỬA LỖI] Xoá tag với `{to: null}` trả 500

`DELETE /api/tags?id=…` với `{to: null}` ghi `posts.kind = null`, mà
`posts.kind` là NOT NULL (migration 0001; 0020 chỉ bỏ CHECK). `notes.k` cũng
NOT NULL (0001; 0010 chỉ bỏ CHECK) — nên nhánh "bỏ trống" sai cho cả hai bảng,
không riêng bài.

- `backend/api/tags.ts` (handler, nhánh DELETE) — khi còn bài hoặc ghi chép
  đang đeo mà `to` là `null`: trả 400
  `posts and notes cannot be left without a tag; pass a replacement in to`
  kèm `wearing`, **trước** mọi lệnh ghi. Không còn gì đeo thì `to: null` vẫn
  xoá thẳng như cũ.
- `frontend/src/screens/Cms.tsx:TagsPanel` — ô "chuyển sang" bỏ lựa chọn
  "(bỏ trống)"; dòng đầu giờ là `—` bị khoá (chỉ làm chỗ đứng). Thực tế lựa
  chọn cũ không gửi được `null` (nó là giá trị mặc định nên `onChange` không
  bắn), nên đây chỉ là bỏ một lựa chọn chết.
- Test: `backend/api/tags.test.ts` — thêm ca `to: null` còn bài đeo → 400,
  không có `update`/`delete` nào được gọi.

Endpoint: `DELETE /api/tags`. Bảng: `tags`, `posts` (kind), `notes` (k) — đọc
như cũ; lệnh ghi bị chặn sớm hơn.

### 3. [SỬA LỖI] Link bài trong portfolio ra `#`

`frontend/src/portfolio/data.ts:postHref` đọc `p.slug`, mà `posts.slug` chỉ có
khi chủ site gõ tay — gần như mọi bài ra `#`.

- `portfolio/data.ts` — thay hằng `postHref` bằng hook `usePostHref()`, lấy
  địa chỉ qua `usePostAddresses().slugOf(id)` (cùng sổ địa chỉ mà mọi chỗ khác
  trong site dùng, `data/usePostAddresses.tsx`), rồi `toPath({area:'public',
  screen:'article', slug})`. Slug gõ tay vẫn thắng, vì sổ địa chỉ đã đọc cột
  `slug`.
- `screens/PortfolioPage.tsx:PortfolioPage` và
  `admin/screens/Portfolio.tsx:Builder` — gọi `usePostHref()` thay vì import
  hằng.
- Trang port công khai vẽ full-bleed trong `App.tsx:Routed`, nhưng `Routed` đã
  nằm trong `PostAddressProvider` (bọc ở `App`), nên không cần thêm provider.

Bảng đọc: `posts` (id, module_id, created_at, status, slug) — qua
`PostAddressProvider`, vốn đã đọc sẵn.

### 4. [SỬA LỖI] Bài Ghi 01 có hai cửa

`frontend/src/screens/Article.tsx` (eyebrow `renderEyebrow` của template
article) gọi thẳng `nav.openModule(post.module_id)`, nên bài dưới Ghi 01 dẫn
về `/module/ghi` thay vì `/ghi`.

- Giờ đi qua `lib/moduleTarget.ts:openModule` như `screens/IndexScreen.tsx`
  vẫn làm. Module chưa tải xong thì rơi về `nav.openModule` như cũ.
- Cửa thứ hai, dùng ở **mọi** template chứ không riêng article: dải đường dẫn.
  Chặng module (`lib/crumbs.ts:buildCrumbs`, hàm `mod`) và mũi tên ←
  (`lib/crumbs.ts:crumbBack`, nhánh `article` khi `articleFrom === 'module'`)
  cũng gọi thẳng `nav.openModule`. Cả hai giờ đi qua `moduleTarget.openModule`;
  `crumbBack` nhận thêm tham số `modules` (mặc định rỗng), truyền từ
  `components/Breadcrumbs.tsx`.

## Đối chiếu bộ luật (`frontend/src/content/logic.ts`)

- Lỗi 4 khớp **05.7** (Điều hướng: "Module phân loại theo hai trục độc lập…",
  ví dụ "Ghi 01 là module đặc biệt") — một module đặc biệt có màn riêng; bản sửa
  chỉ làm eyebrow theo đúng đường mà trang chủ đã đi. Không mâu thuẫn.
- Lỗi 3 khớp ghi chú trong `portfolio/data.ts` "the same as everywhere else on
  the site" — trước đây chú thích nói vậy mà code không làm vậy.
- Lỗi 1, 2: không có luật đánh số nào nói về tag hay xoá tag; không mâu thuẫn.

## Kiểm

- `npx vitest run` notesFilter, tags, Cms.liveValues: xanh.
- `npm test`: 127 file, 1268 test xanh.
- `npx vite build`: xanh.
- Trình duyệt (dev server ở máy, dữ liệu hosted, chỉ đọc):
  - `/ghi`: chip tất cả 15 · log 1 · note 3 · philo 1 · book-film 10. Chip
    `philo` là tag có id `video` (mục lục vẫn in `VIDEO`) — trước bản sửa chip
    này không hiện. Bấm book-film còn đúng 10 bài.
  - Mục lục → bài "Dựa vào cái khác mà sinh ra" (`/post/ghi-p261001`): bấm chặng
    `ghi` → `/ghi`; mũi tên ← → `/ghi`. Trước: `/module/ghi`.
  - `/ad-portfolio` → xếp trang `bibi`: link bài trong bản xem trước ra
    `/post/ghi-p260923`, không còn `#`.
  - Ô chọn trong CMS (xoá tag): chưa bấm, vì bấm là xoá tag thật.

## Chưa sửa, để ý

- Mục lục (`screens/IndexScreen.tsx`) và các dòng bài in thẳng `posts.kind` —
  tức là **id** của tag, không phải tên. Tag `video` đã đổi tên thành `philo`
  nhưng mục lục vẫn in `VIDEO`. Ngoài phạm vi bản này; sẽ đi cùng việc chuyển
  sang nhiều tag (bước 2–4).

- `backend/api/tags.ts` (DELETE): ghi chép được tìm bằng `notes.k = label`,
  nhưng khi chuyển thì ghi `notes.k = to` — `to` là **id**. Tag thay thế có tên
  khác id thì ghi chép bị gán id thay vì tên. Ngoài phạm vi bản này.
- `frontend/src/lib/postToRenderer.ts` gọi `tagColor(post.kind)` — tức là theo
  id, trong khi `noteColor` viết theo tên. Một tag tên `quan sát` mà id là `quan-sat`
  (nếu có) trên trang bài sẽ lấy màu vườn chứ không lấy mực design. Ngoài phạm vi bản này.
- Màn xếp trang portfolio ở admin dùng sổ địa chỉ của admin (có cả nháp), nên
  hiếm khi hai bài cùng module cùng ngày, chữ cái phân biệt (`-b`) có thể khác
  sổ công khai. Cùng hành vi với mọi link khác trong admin.
