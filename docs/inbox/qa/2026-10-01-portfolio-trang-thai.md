# Portfolio — trạng thái lưu trữ, sửa tên và trạng thái ngay trên danh sách

- Nhánh: `feature/portfolio-status` (cắt từ `origin/main` 5e327db, sau PR #108)
- PR: chưa mở
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
  khớp từng chữ với design system (bản prototype v1.0), kèm số mục để tra chéo:
  Hero · 06.2, Gallery · 06.3, Card grid · 06.4, Carousel · 06.5, Series · 06.6,
  Story · 06.7, About · 06.10. Trước: "06.2 đầu trang", "06.3 mở đầu", "06.4 thẻ
  bài", "06.5 slider", "06.6 khối series", "06.7 kể chuyện", "06.10 khối about".
  Mô tả ngắn của Carousel ghi "mũi tên / tự chạy trái / tự chạy phải" thay vì
  `arrow` / `left` / `right`. `portfolio/blocks.ts` (`BLOCK_NAMES`, `BLOCK_DS`),
  `admin/screens/Portfolio.tsx` (`summary`).

## Đụng dữ liệu

- **Migration** `0026_portfolio_archived.sql`: thay ràng buộc
  `portfolio_pages_status_check` để nhận `archived`. Không đổi dòng nào.
- **Dữ liệu thật đã ghi (chủ site yêu cầu, 2026-10-01):** `portfolio_pages`
  dòng `bibi` và `bibe` chuyển `published` → `archived`. Tên `bibi` đổi thử
  thành "biz intelligence" rồi trả lại "bibi". Dòng `biz-by-hkd` (trang
  "business" chủ site tự tạo) không đụng tới.
- Hệ quả trên production ngay khi ghi, trước cả khi PR merge:
  `/portfolio/bibi`, `/portfolio/bibe` thôi hiện công khai.
- Endpoint không thêm; vẫn 12 hàm serverless.

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
