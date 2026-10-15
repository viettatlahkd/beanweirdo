# Hành động mỗi dòng: nút Sửa + menu ⋮

Nhánh `claude/row-actions-menu-gohzer` · PR mở ngày 2026-10-13 (số PR ở tiêu đề PR). Sau PR #76.

Chủ site (2026-10-13, kèm ảnh tab Nội dung) không muốn hành động của mỗi bài bày thành một dòng chữ (Sửa, Nhân bản, Ghim, Chuyển module, Tác giả, Bỏ đăng, Lưu trữ, Xoá), muốn thành nút hoặc gom vào ⋮ ở cuối dòng, và dọn hết chỗ nào bày kiểu này.

## [ĐỔI HÀNH VI] Nội dung: hành động của bài
- Trước: dưới tên bài là một hàng chữ xanh, chỉ hiện khi rê chuột (`.cw-act`), xuống dòng khi hẹp.
- Sau: cột cuối bảng có nút viền "Sửa" và nút ⋮ "Thao tác <tên bài>"; ⋮ mở danh sách Nhân bản · Ghim/Bỏ ghim · Chuyển module · Tác giả · các bước trạng thái theo `ACTIONS_BY_STATUS` (Xoá / Xoá vĩnh viễn tô đỏ). Luôn hiện, không chờ rê chuột. `ContentWorkspace.tsx`, bỏ CSS `.cw-act`.
- Bấm tên bài vẫn mở soạn bài như cũ.

## [SỬA LỖI] Menu ⋮ bị cắt trong khung cuộn
- `Menu` trong `Detail.tsx` (dùng ở Cấu hình) treo danh sách `position: absolute` trong hộp của nút; trong bảng có `overflow-x: auto` danh sách dòng cuối bị cắt / làm hiện thanh cuộn. Giờ `Menu` đặt danh sách theo cửa sổ (`position: fixed`), mở lên trên khi bên dưới không đủ chỗ, đóng khi cuộn hoặc đổi cỡ cửa sổ.

## [ĐỔI HÀNH VI] Một kiểu ⋮ cho cả admin
- `Menu` trong `Detail.tsx` được export và là ⋮ duy nhất: Nội dung, Tác giả, Cấu hình dùng chung.
- Xoá `RowMenu.tsx`, CSS `.ab-menu`/`.ab-menuitem` trong `admin.css`, và `IconMore` trong `design/icons.tsx` (chỉ `RowMenu` dùng).
- Tác giả: ⋮ giờ là nút viền kiểu C (trước là nút ma `IconButton`), tên nút "Thao tác <tên>" (trước "Hành động khác"). Thẻ tác giả đã tắt chỉ làm mờ ảnh và chữ, không làm mờ ⋮ — trước đó danh sách mở ra cũng bị mờ theo. `AuthorsPanel.tsx`.

## Đã rà, không đổi
- Cấu hình (Personal Blog, Port, Practice), Cài đặt hiển thị, Tác giả: các dòng đã dùng ⋮ hoặc một nút ×; không còn hàng chữ hành động nào. Xem trên `frontend/cms-harness.html`.

## Bảng, cột, endpoint
- Không đụng. Chỉ đổi giao diện; hành động gọi đúng các hàm cũ (`copy`, `updatePost`, `transitionStatus`, hộp thoại chuyển module / tác giả).

## Kiểm tra
- `ContentWorkspace.test.tsx`: Đăng, Khôi phục, Xoá vĩnh viễn, Ghim giờ bấm qua ⋮ (`menuitem`).
- Ảnh: `/mnt/project-files/menu-hanh-dong/`.
