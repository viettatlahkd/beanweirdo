# Portfolio — trạng thái lưu trữ, sửa tên và trạng thái ngay trên danh sách

- Nhánh: `feature/portfolio-status` (cắt từ `origin/main` 5e327db, sau PR #108)
- PR: #109
- Migration `0026_portfolio_archived.sql` **đã chạy** trên database hosted (chủ site chạy bằng SQL Editor, 2026-10-01).

## Đã sửa

- **[ĐỔI HÀNH VI]** Trang port có thêm trạng thái **lưu trữ** (`archived`).
  Trước: nháp · đã đăng. Sau: nháp · đã đăng · lưu trữ. Trang lưu trữ không
  hiện công khai, như nháp (RLS 0025 không đổi: anon chỉ thấy `published`).
  `backend/api/portfolio.ts` (`STATUSES`), `admin/lib/apiClient.ts`
  (`PortStatus`), `portfolio/data.ts` (`PortPage.status`, `usePublicPort`).
- **[ĐỔI HÀNH VI]** Danh sách trang ở `/ad-portfolio`: tên và trạng thái sửa
  ngay trên dòng, tự lưu (tên lưu sau 700ms hoặc khi rời ô; trạng thái lưu
  ngay khi chọn). Trước: bấm cả dòng là mở màn xếp trang, không sửa được gì
  tại chỗ. Sau: mở màn xếp trang bằng nút "xếp trang →" ở cuối dòng.
  `admin/screens/Portfolio.tsx` (`PageRow`, `StatusSelect`, `STATUS_NAMES`).
- Màn xếp trang (`Builder`) dùng cùng ô chọn ba trạng thái (`StatusSelect`).
- **[ĐỔI HÀNH VI]** Tên khối trong trình xếp trang đổi sang tên component chuẩn,
  khớp từng chữ với design system (bản prototype v1.0): Hero, Gallery, Card
  grid, Carousel, Series, Story, About. Trước: "06.2 đầu trang", "06.3 mở
  đầu", "06.4 thẻ bài", "06.5 slider", "06.6 khối series", "06.7 kể chuyện",
  "06.10 khối about". Số `06.x` không còn hiện trong trình xếp trang (chủ site:
  người dùng không cần). Mô tả ngắn của Carousel ghi "mũi tên / tự chạy trái /
  tự chạy phải" thay vì `arrow` / `left` / `right`. `portfolio/blocks.ts`
  (`BLOCK_NAMES`), `admin/screens/Portfolio.tsx` (`summary`).
- **[ĐỔI HÀNH VI]** Trình xếp trang bỏ kéo thả và bỏ hàng nút "+ <loại khối>".
  Sau: một nút "+ thêm khối" (tạo khối Card grid), mỗi khối có ô **Component**
  ở đầu phần chỉnh để chọn loại; đổi loại giữ id, nhãn, nguồn bài, câu mở,
  đoạn kể (`portfolio/blocks.ts` `convertBlock`). Thứ tự vẫn đổi bằng kéo thả
  qua tay nắm ⋮⋮ (`useRowDrag`; có thử ↑ ↓ rồi bỏ theo yêu cầu chủ site).
- **[ĐỔI HÀNH VI]** Thêm font: bỏ ô nhập tên Google Fonts, thay bằng nút **Cập nhật**
  tải file `.woff2/.woff/.ttf/.otf` lên (qua `/api/upload`, bucket `post-images`).
  Tên họ lấy theo tên file (`familyFromFile`); font nạp bằng `@font-face`
  (`fontFaceCss`) ở bản xem trước và trang công khai. Ba font mặc định vẫn nạp từ
  Google. `portfolio/tokens.ts` (`Design.fonts.files`), `PortfolioView.tsx` (`useAssets`).
- **[ĐỔI HÀNH VI]** Đầu trang Portfolio đồng bộ Content management: breadcrumb
  Admin › Backend › Portfolio (`lib/crumbs.ts`), câu giới thiệu, số liệu bên phải,
  hàng lọc Tất cả / Nháp / Đã đăng / Lưu trữ, con số tổng, nút xanh "+ Trang mới"
  (mở chọn: từ mẫu bibi, từ mẫu bibe, trang trống). Nhãn trạng thái cùng màu
  `StatusBadge`.
- **[ĐỔI HÀNH VI]** Tab Design system: bên trái là tài liệu design system gốc
  (`portfolio/design-doc.html`, nhúng bằng iframe), bên phải là bảng thông số.
  Chỉnh thông số → lưu làm mặc định cho mọi trang port và đẩy ngay vào tài liệu
  (`docVars`, tin nhắn `pf-tokens`). Nhãn bảng thông số và toàn bộ chữ trong tài
  liệu viết lại bằng tiếng Việt chuẩn.
- **[ĐỔI HÀNH VI]** Thanh chia kéo được giữa hai nửa màn, ở cả màn xếp trang và
  tab Design system; độ rộng nhớ trong localStorage (`useSplit`).
- **[ĐỔI HÀNH VI]** Xoá trang chuyển từ màn xếp trang ra danh sách: mỗi dòng có
  hàng thao tác "Xếp trang · Xem trang ↗ (khi đã đăng) · Xoá" theo đúng kiểu
  `PostCard`; xoá luôn hỏi lại. Màn xếp trang không còn nút xoá. `PageRow`.

## Đụng dữ liệu

- **Migration** `0026_portfolio_archived.sql`: thay ràng buộc
  `portfolio_pages_status_check` để nhận `archived`. Không đổi dòng nào.
- **Dữ liệu thật đã ghi (chủ site yêu cầu, 2026-10-01):** `portfolio_pages`
  dòng `bibi` và `bibe` chuyển `published` → `archived`. Tên `bibi` đổi thử
  thành "biz intelligence" rồi trả lại "bibi". Khối của `bibi` thử ↑ ↓ và
  đổi Series → Card grid → Series, rồi trả về đúng như cũ. Dòng `biz-by-hkd` (trang
  "business" chủ site tự tạo) không đụng tới.
- Hệ quả trên production ngay khi ghi, trước cả khi PR merge:
  `/portfolio/bibi`, `/portfolio/bibe` thôi hiện công khai.
- Endpoint không thêm; vẫn 12 hàm serverless. `/api/upload` nay cũng nhận file
  font (không đổi code endpoint — endpoint vốn không giới hạn loại file).
- Kiểm tải font: một file `.woff2` thử lên `post-images` rồi đã xoá; design trả
  về `{}`.
- Kiểm xoá trang: tạo một trang trống `trang` rồi xoá bằng hàng thao tác.

## Đụng luật

- **08.3** (lưu ngay, không nút lưu): tuân theo ở cả hai ô mới.
- **08.2** (Enter lưu, Esc bỏ): ô tên trên danh sách vẫn chưa có Esc hoàn tác
  — cùng tình trạng đã báo ở ghi chú PR #108.

## Đề xuất luật

- Trang port có ba trạng thái: nháp · đã đăng · lưu trữ. Chỉ "đã đăng" hiện
  công khai. "Lưu trữ" dành cho trang giữ làm mẫu tham khảo, không phải trang
  đang soạn.
- `SPEC.html`: thêm trạng thái `archived` cho `portfolio_pages`, số migration
  lên 26.
