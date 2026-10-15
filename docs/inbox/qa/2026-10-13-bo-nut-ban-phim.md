# Bộ nút mới cho admin: kiểu "Bàn phím"

Nhánh `claude/admin-buttons-redesign-y4hol6` · PR mở ngày 2026-10-13 (số PR ở tiêu đề PR). Sau PR #77.

Chủ site (2026-10-13): "làm hộ lại hết mấy cái button đi design chán quá xấu điên", rồi sau mẫu đầu "vẫn xấu đổi design mới hẳn đi đừng phụ thuộc design cũ nữa xoá những cái cũ nếu cần". Từ mẫu ba hướng mới, chủ site chọn số 3 · Bàn phím; sau đó bỏ màu xanh dương của mẫu ("không thích màu xanh nước biển") và chữ đậm trong nút, nên nút chính dùng xanh rêu của site và chữ nút để thường (400).

## [ĐỔI HÀNH VI] Một bộ nút cho cả admin
- Trước: hai bộ song song — `Button`/`IconButton` (`.ab-*` viền nâu #5A4632, cao 34) và object `frame` inline trong `Detail.tsx` (dùng ở Cấu hình, Nội dung, tab chính); thêm `.admin-btn`, `.admin-btn-ghost` và nhiều `<button>` tự vẽ inline.
- Sau: chỉ còn `Button`, `IconButton`, `ButtonLink` (`design/Button.tsx`). Cấp: `primary` (xanh rêu #2B4B33), `secondary` (trắng, khung xám), `quiet` (không khung tới khi rê chuột; nút icon, Huỷ, Đóng), `danger` (chữ đỏ), `add` (chữ xanh, cho "Thêm …"). Cỡ 36 / 32 / 28. `design/controls.ts` (`Level`, `ctl`).
- Bán kính chung `radius` đổi 8 → 6 (`design/controls.ts`), áp cho cả khung panel dùng hằng này.
- Tab chính (Nội dung · Cấu hình · …): chữ trên nền, tab đang đứng là thẻ trắng chữ xanh; giờ là `role="tab"` + `aria-selected` (trước là nút `aria-pressed`). `Cms.tsx`.
- Personal Blog | Port | …, `Choice`, các nhóm chọn một: `.ab-seg`, lựa chọn đang đứng tô đen. `SiteTabs.tsx`, `Detail.tsx:Choice`, `CropPicker`, `FocusPicker`.
- `Switch` xanh lá #3E7A4E; menu ⋮ (`Menu`) dùng `IconButton` + `.ab-menu`; tay kéo `.ab-grip` với `IconGrip` thay chữ ⋮⋮.
- "+ Thêm …" giờ là nút `add` có icon, **tên nút bỏ dấu "+"** ("Thêm subject", "Thêm trang", "Bài mới"). Ngoại lệ: "+ cài đặt riêng" giữ dấu + trong `PageSettings.tsx`.
- Ô nhập trong admin (`.admin-field`, `DETAIL_CSS`) đổi khung xám #D1D5DB và vòng focus xanh cho khớp.

## Xoá
- `.admin-btn`, `.admin-btn-ghost`, `.ab-tab`/`.ab-filter`/`.ab-disclose`/`.ab-box` cũ (không còn ai dùng), `frame` trong `Detail.tsx`, các class `cfg-btn`/`cfg-seg`/`cfg-switch`/`cfg-menuitem`/`cfg-grip`, `.awc-plus-btn`, `.awc-undo`.
- `Button.test.tsx`: bỏ khối test đọc `admin.css` bằng `readFileSync` (đếm bán kính, viền). Giữ test render.

## Đã rà, không đổi
- Nút ở rãnh trái khi soạn bài (⠿ ⧉ × trong `.awc-gutter`), hàng menu `/` và `+` của `FlowThing`, nút chữ trong thân bài (`+ số liệu`, `+ ghi chú`…), ô màu, thẻ chủ đề, nút H1/H2/H3: giữ nguyên vì luật bàn phím và test dựa vào chúng.

## Bảng, cột, endpoint
- Không đụng. Chỉ giao diện.

## Kiểm tra
- Test sửa theo tên nút mới: `ConfigTree.test.tsx` ("Thêm subject", "Thêm mục con", "Thêm trang").
- Xem trên `frontend/cms-harness.html` cả bốn tab, Blog và Port.
