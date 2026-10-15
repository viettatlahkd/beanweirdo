# Admin theo kiểu C · Bàn làm việc

Nhánh `claude/project-thread-oa1vgt` · PR mở ngày 2026-10-13 (số PR ở tiêu đề PR). Sau PR #75.

Chủ site (2026-10-13) thấy trang chi tiết "mờ mờ, chữ mảnh". Tôi làm bản xem thử ba kiểu (artifact "Ba kiểu trang chi tiết"), chủ site chọn **C · Bàn làm việc**, rồi hỏi thêm: áp cho cả Nội dung, Cấu hình, Cài đặt hiển thị, Tác giả.

## [ĐỔI HÀNH VI] Giao diện admin (chỉ phần nhìn, không đổi dữ liệu)
- Nền dưới dải tab là màu bàn `desk.ground` (#EFEDE7); mỗi phần là khung trắng viền `desk.line`, bo 8px. Hằng `desk` và kiểu nút `frame` ở `admin/components/Detail.tsx`.
- `Detail.tsx`: `DetailHead` (tiêu đề sans 600 26px, "Xem trang ↗" và ⋮ là nút có viền, địa chỉ là chip xanh), `Section` (khung trắng), `Row` (nhãn 13px đậm), `Choice` (nút liền khối, mục đang chọn tô xanh rêu), `Switch` mới (công tắc cho Hiện trên menu / Hiện ở trang chủ, thay `Choice` + hằng `SHOWN` đã xoá khỏi `PageSettings.tsx`), `ItemList` (chữ sans 14.5, ⋮ có viền), nút "+ Thêm …" có viền.
- `DETAIL_CSS`: mọi ô nhập, ô chữ, ô chọn trong `.cfg-detail` có khung `desk.field`, viền đậm khi rê chuột, vòng xanh khi đang gõ. Class `cfg-detail` giờ đặt ở gốc `Cms.tsx`, nên áp cho cả bốn tab; `<style>` chuyển từ `ConfigTree` sang `Cms`.
- Thanh tab CMS (`Cms.tsx`) là bốn nút có viền, chữ thường 14px đậm, thay cho `div` chữ hoa 11px.
- Chữ mảnh/mờ: ở `Cms.tsx`, `ContentWorkspace`, `DisplaySettings`, `AuthorsPanel`, `RoutesPanel`, `ThemePicker`, `SectionHead`, `PortEditors`, `PageSettings`: `ink.faint`/`ink.muted` → `ink.soft`; cỡ 10–11.5px → 13px; bỏ chữ hoa giãn cách; nét 300 → 400. Nhãn trường (`fieldLabel`, `label`) 13px đậm `ink.strong`.
- Nội dung: cột lọc và bảng bài là hai khung trắng; đầu bảng nền `paper.hover`, tên bài sans 14.5 đậm; nút "+ Bài mới" xanh rêu có viền.
- Cấu hình: thẻ cây bên trái chữ sans đậm, thẻ đang mở nền xanh nhạt và vạch rêu bên trái; thanh Hoàn tác là khung trắng dính đáy; thông báo lỗi là khung viền đỏ.
- Trang port › Nội dung trang: mỗi khối có số thứ tự và chip màu theo loại (`BLOCK_CHIP` trong `PortEditors.tsx`), nút × có viền.
- Nút `.ab-*` (`admin.css`) và `sizes` (`design/controls.ts`) to chữ hơn: lg 14.5, md 13.5, sm 13; nút tắt dùng viền/chữ đậm hơn. `.ab-tab`, `.ab-menuitem`, `.ab-rowtitle` thôi chữ hoa/serif. Hai chỗ này đi cùng nhau như chú thích trong `controls.ts` yêu cầu. Màn soạn bài cũng dùng `.ab-*` nên nút ở đó cũng to chữ hơn.

## Bảng, cột, endpoint
- Không đụng. Chỉ đổi giao diện.

## Kiểm tra
- `ConfigTree.test.tsx`: bài "Hiện trên menu" đổi sang `role="switch"`.
- Xem trên harness (`frontend/cms-harness.html?tab=posts|pages|display|authors`); harness có thêm ba bài mẫu và tám khối trên trang port "strat & ops" để có thứ mà nhìn. Ảnh ở `/mnt/project-files/mau-chi-tiet/kieu-c-*.png`.

## Đề xuất (ý kiến)
- Màn soạn bài (Editor) chưa đổi nền và khung; nếu chủ site muốn đồng bộ thì là một PR riêng.
