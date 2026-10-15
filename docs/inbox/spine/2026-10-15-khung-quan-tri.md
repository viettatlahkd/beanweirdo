# Khung chung cho khu quản trị — nhánh `claude/config-one-tree-539wvd`

PR: (số PR ở mô tả PR). Không đụng bảng, cột hay endpoint nào.

## [ĐỔI HÀNH VI] Khu quản trị có thanh bên riêng kiểu Notion

Chủ site chọn kiểu B ("Thanh bên Notion") trong mock ngày 2026-10-15.

- Trước: màn `cms` mang thanh bên của site công khai, rồi một dải xanh có chữ
  "Content" to và ba tab Nội dung · Cấu hình · Cài đặt hiển thị (`screens/Cms.tsx: Cms`).
- Sau: `App.tsx` vẽ màn `cms` trong `admin/AdminShell.tsx: AdminShell` và không vẽ
  `Sidebar` nữa. Thanh bên tối chứa Nội dung, bốn site của Cấu hình, Cài đặt hiển thị,
  "Mở nhật ký Ghi 02", Đăng xuất. Bên phải là một dòng đường dẫn và "Xem site ↗".
  Dải xanh, ba tab (`TABS`) và chữ "N module · N bài" bị xoá. Cms thôi tải danh sách bài
  (`listPosts`), vì danh sách ấy chỉ dùng để đếm.
- Cấu hình: chọn site bằng thanh bên (`useAdminFrame().site`, nhớ trong localStorage
  `beanweirdo.config.tab` như trước). Các thẻ của site đang mở (Trang chủ, Mục lục, …) vẽ
  dưới site đó trong thanh bên qua `createPortal` (`ConfigTree.tsx: tree`). Hàng `SiteTabs`
  và cột thẻ bên trái của ConfigTree bị xoá, cùng thanh kéo `cfg-tree`.
- Màn sửa bài (`postEdit`) và xem trước bài (`postPreview`) cũng vẽ trong `AdminShell` (chủ site: "đưa vào khung này"); Archive vẫn dùng khung cũ.

## [ĐỔI HÀNH VI] Nút Thêm

- `admin.css: .ab-add` có khung trắng, viền xám, chữ xanh rêu; trước là chữ trơn.
- Mục lục của beanweirdo (`ConfigTree.tsx`, nhóm `root-toc`) có nút "Thêm trang"
  (`addPortPage(undefined)`): tạo một trang port nháp ở tầng trên cùng. Trang chỉ hiện trên
  thanh trên sau khi đăng (`portfolio/content.ts: navLinks` chỉ lấy trang đã đăng).

## Đề xuất

- Không có.
