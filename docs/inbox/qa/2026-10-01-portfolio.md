# Portfolio — mục admin mới, trang port và design system

- Nhánh: `feature/portfolio` (cắt từ `origin/main` d46f9c2)
- PR: chưa mở
- Migration `0025_portfolio.sql` **đã chạy** trên database hosted (chủ site chạy bằng SQL Editor, 2026-10-01).

## Đã sửa

- **[ĐỔI HÀNH VI]** Thanh trái có thêm mục **Portfolio** trong section Admin, đứng
  trên Content management. Trước: Admin có Content management, System
  conventions. Sau: Portfolio, Content management, System conventions.
  `frontend/src/content/navItems.ts` (`NAV`, key `portfolio`),
  `components/Sidebar.tsx` (`go`, case `portfolio`).
- **[ĐỔI HÀNH VI]** Màn mới `Portfolio` (`frontend/src/admin/screens/Portfolio.tsx`),
  hai tab, mỗi tab một địa chỉ:
  - `/ad-portfolio` — **Trang port**: danh sách trang; tạo từ mẫu bibi, bibe
    hoặc trang trống (`preset`); mở một trang thì màn chia đôi: trái là thông
    tin trang + danh sách khối (kéo thả, thêm, bỏ, chỉnh từng khối), phải là
    bản xem trước trực tiếp (`Builder`).
  - `/ad-portfolio-design` — **Design system**: mã màu, bảng màu nhánh (thêm,
    bỏ), màu ngữ cảnh, thêm font Google theo tên và chọn font cho ba vai,
    cỡ chữ / nét / dòng / khoảng chữ, khoảng cách, bo góc; mỗi nhóm có nút trả
    về mặc định (`DesignTab`).
  - Cả hai tab tự lưu sau 700ms, không có nút lưu (`useDebounced`).
- **[ĐỔI HÀNH VI]** Địa chỉ công khai mới `/portfolio/<slug>` — màn
  `screens/PortfolioPage.tsx`, đầy bề ngang, **không có thanh trái của site**
  (`App.tsx`, nhánh `shown === 'portfolioPage'` trước `return`). Trang nháp gõ
  đúng địa chỉ vẫn ra "không có trang này" (RLS).
- **[ĐỔI HÀNH VI]** Ba từ địa chỉ mới, đổi được ở Sơ đồ trang:
  `portfolio`, `adPortfolio`, `adPortDesign` (`lib/routeWords.ts`
  `DEFAULT_WORDS`, `WORD_LABELS`, `MUST_DIFFER`;
  `admin/components/RoutesPanel.tsx` `BLOCKS`).
- Nối màn và địa chỉ: `lib/nav.tsx` (`Screen` thêm `portfolio`,
  `portfolioPage`; `Nav` thêm `portTab`, `slug`, `goPortfolio`),
  `lib/area.ts` (`AREA_SCREENS`: admin thêm `portfolio`, public thêm
  `portfolioPage`), `lib/routes.ts` (`PortTab`, `portTabs`, `adminPages`,
  `readPath`, `toPath`), `admin/lib/apiClient.ts` (`getPortfolio`,
  `createPortPage`, `updatePortPage`, `deletePortPage`, `updatePortDesign`).
- Test mới: `backend/api/portfolio.test.ts` (14), `frontend/src/portfolio/layout.test.ts`
  (6 — 20 biến thể không tràn không chồng; ảnh to trên trục, nhỏ dưới trục;
  địa chỉ đọc/viết khớp nhau).
- Bộ vẽ dùng chung cho bản xem trước và trang công khai:
  `frontend/src/portfolio/` — `PortfolioView.tsx`, `blocks.ts` (kiểu khối,
  nguồn bài `resolvePosts`, mẫu `preset`), `layout.ts` (luật fibonacci
  `seriesLayout`, `storyLayout`), `tokens.ts` (`DEFAULT_DESIGN`,
  `resolveDesign`, `cssVars`, `fontHrefs`), `styles.ts` (`PF_CSS`), `data.ts`.

## Đụng dữ liệu

- **Bảng mới** `portfolio_pages` (id, slug unique, title, intro, palette,
  blocks jsonb, status draft/published, sort_order, created_at, updated_at).
  RLS: anon chỉ đọc dòng `status = 'published'`.
- **Bảng mới** `portfolio_design` (một dòng, `id boolean`, `data jsonb`) —
  cùng khuôn `site_settings` (0007). RLS: đọc công khai.
- **Endpoint mới** `backend/api/portfolio.ts`: `GET` (mọi trang + design),
  `POST`, `PATCH ?id=`, `DELETE ?id=`, `PATCH ?part=design` (gộp sâu một tầng,
  `null` trả khoá về mặc định). Có `requireAuth`.
- **Đọc thêm**, không ghi: `posts` (qua `usePublishedPosts`, cột `kind`,
  `pinned`, `hero_image_url`, `lead`, `published_at`), `modules` (qua
  `useModules`), `tags` (qua `useTags`).
- **Số hàm serverless nay là 12** — đúng trần gói Vercel Hobby. Endpoint mới
  sau này phải gộp vào file sẵn có.

## Đụng luật

- **08.3** (lưu ngay từng thay đổi, không nút lưu): tuân theo.
- **08.4** (tạo dòng trống trước): tạo trang là tạo ngay một dòng rồi mở nó.
- **08.2** (Enter lưu, Esc bỏ): **chưa tuân theo** ở màn này — ô tự lưu khi gõ,
  Esc không hoàn tác. Nói thẳng để quyết có cần không.
- Migration là việc của làn spine theo `CLAUDE.md`. File `0025_portfolio.sql`
  do nhánh này viết; ghi ở đây để làn spine biết số 0025 đã dùng.
- Không sửa `logic.ts`, `docs/SPEC.html`, `docs/spine/SO-BAN-GIAO.md`.

## Đề xuất luật

- Portfolio là một khu có design system **riêng** (`portfolio_design`), tách
  khỏi token của site journal (`design/tokens.ts`). Đổi màu hay font ở
  Portfolio không đổi site journal, và ngược lại.
- Khối trang port không chứa bài, chỉ chứa cách lấy bài: mới nhất · theo
  module · theo tag (`kind`) · bài ghim · chọn tay. Chỉ bài `published`.
- Luật bố cục của component (lưới rail 1 : main 3, ảnh φ, ô fibonacci 13 × 8
  với 20 biến thể, khung kể chuyện 8 × 13 có trục hoành và ảnh nhỏ nghiêng về
  phía chữ) là code, không chỉnh từ admin.
- `SPEC.html` cần thêm: bảng 0025, endpoint `/api/portfolio`, địa chỉ
  `/portfolio/<slug>`, `/ad-portfolio`, `/ad-portfolio-design`, và số
  migration lên 25.
