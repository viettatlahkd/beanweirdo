# Quản lý trang — cây trang ba hệ: Port · Personal Blog · Practice

- Nhánh: `feature/quan-ly-trang` (nối tiếp `feature/noi-dung` — PR Nội dung merge trước)
- PR: chưa mở
- Không migration. Bản mẫu chủ site duyệt: artifact "Nội dung một chỗ" vòng 2 (cây ba nhánh, cấu hình bên phải).

## Đã sửa

- **[ĐỔI HÀNH VI]** CMS › Quản lý trang (`admin/components/PagesManager.tsx:PagesManager`): danh
  sách + màn sửa riêng thay bằng cây bên trái, cấu hình của nút đang chọn bên phải; mở sẵn
  Personal Blog › Trang chủ.
  - Port: Trang chủ · Các trang port (nháp hiện nhãn; `+ trang port` từ mẫu bibi/bibe/trống)
    · Lưu trữ (gập, bibi và bibe) · About · Signature · Thanh trên · Chân trang. Trang port mở
    trình dựng khối sẵn có (`Portfolio.tsx:Builder`, thêm "xoá trang"); các phần cố định mở
    đúng một phần của `Portfolio.tsx:ContentTab` (tham số mới `only`; Ký tên tách khỏi About
    thành Signature).
  - Personal Blog: Trang chủ · Mục lục · Lưu trữ · Điều hướng (danh sách kéo thả và hai cờ
    như trước) · Trang chọn tay (+ trang mới) · Chủ đề (cây; nút có cài đặt riêng ghi "riêng")
    · Tag · Mẫu. Nút theo mẫu mở khung "theo Mẫu trang …" kèm "+ cài đặt riêng" — nay áp cho
    cả tag, trước chỉ chủ đề.
  - Practice: Ghi 02 (`/practice`) — cấu hình tên trên thanh bên, màu, tên section.
  - `PageEditor` bỏ nút "← Quản lý trang" (cây là đường về).
- **[ĐỔI HÀNH VI]** Ghi 02 không còn là module/trang của blog mà là section Practice:
  - Tên và màu của Ghi 02 trên thanh bên đọc từ `site_settings.data.practice`
    (`{ title, accent }`, `content/site.ts:SiteOverrides`), không đọc dòng `pages.ghi-02` qua
    alias `ghi02` nữa (`Sidebar.tsx`, nhánh `group === 'Practice'`). Số đếm giữ `0` như dòng
    cũ vẽ, để giao diện không đổi.
  - Bỏ `moduleId: 'ghi02'` (`content/navItems.ts`), bỏ ánh xạ `ghi02` trong
    `useModules.tsx:withScreen` và `moduleTarget.ts:SPECIAL_SCREEN`.
  - Cây Quản lý trang không xếp trang nào có `presentation.screen = 'hours'` vào blog.
- Khu Portfolio cũ (`/ad-portfolio…`) **chưa bỏ** trong PR này: design system vẫn chỉ sửa
  được ở đó cho tới PR Cài đặt hiển thị. `usePortAdmin`, `createFromPreset` tách ra từ
  `Portfolio.tsx` để hai nơi dùng chung.

## Dữ liệu cần ghi — theo thứ tự (chưa ghi, chờ chủ site)

1. **Trước khi deploy:** `PATCH /api/site {practice: {title: "private", accent: "#C25C7C"}}` —
   đúng tên và màu dòng `ghi-02` đang cho thanh bên. Chỉ thêm khoá; bản đang chạy không đọc khoá này.
   Bỏ bước này thì sau deploy thanh bên ghi "Ghi 02" với dấu mặc định thay vì "private" + ô vuông hồng.
2. **Sau khi deploy:** xoá dòng `pages` id `ghi-02` (sao lưu trước). Bảng `modules` còn dòng
   `ghi02` (riêng tư, không hiện ở đâu công khai) — đi cùng PR bỏ module sau này.

## Bảng, cột, endpoint đã đụng

Đọc thêm: `site_settings.data.practice`, `portfolio_pages`, `portfolio_design` (qua `GET /api/portfolio`).
Ghi (khi chủ site thao tác): như Portfolio và Quản lý trang trước đây, thêm `page_overrides` cho tag.

## Kiểm

- Trình duyệt (dev server nhánh này, dữ liệu hosted, chặn mọi lệnh ghi): cây đủ ba nhánh và số
  bài; business (port) mở trình dựng khối + xem trước; Signature mở đúng phần ký tên; Ghi 02 mở
  ba ô; "art" mở "theo Mẫu trang subject · 10 bài + cài đặt riêng"; "bean weirdo" mở quy chế
  riêng; "private" không còn trong Trang chọn tay. Không lệnh ghi nào phát ra.
- Sửa test theo hành vi mới: `Cms.liveValues.test.tsx` (bấm nút cây "Mục lục"; giả lập
  `getPortfolio`), `Cms.siteMap.test.ts` (hours không còn `moduleId`), `useModules.pages.test.ts`
  (dòng module `ghi02` sót lại không còn màn hours).
- `npm test` 1286 xanh (tắt dev server 3001).

## Đề xuất luật

- Số `0` cạnh Ghi 02 trên thanh bên là dấu vết của thời nó là module (đếm bài). Đề xuất: bỏ,
  hoặc đếm số ghi chép nhật ký — chủ site quyết, vì giao diện sẽ đổi.
