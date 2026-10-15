# Nút lệch cột và icon ghim — hai lỗi chỉ nhìn mới thấy

Nhánh: `claude/project-thread-r3z436`. PR: chưa mở, đang đợi chủ site gật.
Tiếp sau PR #3 (`docs/inbox/design/2026-09-18-nut-quan-tri.md`).

Cả hai mục dưới đây là **[SỬA LỖI]**: không đổi hành vi nào, không thêm bớt một
hành động nào trên màn hình, chỉ đổi chỗ đặt và hình vẽ. Specs không phải đổi
theo.

---

## [SỬA LỖI] `PostCard` — cụm nút mỗi dòng nằm một chỗ khác nhau

Tôi thêm hằng `ACTIONS_WIDTH = 400` trong `admin/components/PostCard.tsx` và đổi
cột thứ ba của lưới từ `auto` sang `${ACTIONS_WIDTH}px`. Cụm nút trong cột ấy
đổi từ `justifyContent: 'flex-end'` sang mặc định (`flex-start`); hàng trên nó —
nhãn template, nút ghim, huy hiệu trạng thái — giữ `justifyContent: 'flex-end'`,
và `alignItems` của cột đổi từ `'flex-end'` sang `'stretch'` để hai hàng ấy tự
canh lấy.

Tái hiện lỗi cũ: dựng danh sách có đủ bốn trạng thái. `ACTIONS_BY_STATUS` cho
`published` ba mục, `archived` hai mục, `deleted` hai mục, cộng `Sửa` và
`Nhân bản` cố định — tức là dòng thì năm nút, dòng thì bốn. Mỗi `PostCard` là
một lưới riêng nên `auto` đo lại theo từng dòng, và cụm canh phải khiến nút
`Sửa` của bốn dòng nằm ở bốn hoành độ khác nhau. Nhìn dọc xuống thấy răng cưa,
và `Sửa` là nút người ta với tới nhiều nhất.

Con số 400 đo theo dòng rộng nhất. Lần đầu tôi đặt 344 và chụp lại thì mọi dòng
đều xuống hai hàng — hẹp quá. 400 thì cả `published` (năm nút) lẫn `deleted`
(`Xoá vĩnh viễn` dài) đều nằm gọn một hàng.

## [SỬA LỖI] `IconPin` — không đọc ra cái ghim ở 16px

`design/icons.tsx`: `IconPin` nay là một hình đặc, vẽ bằng
`M7 3h10v2.5h-2l2 7H7l2-7H7V3zM11 13h2l-1 8z`. Hàm `svg()` nhận thêm tham số
`filled` để đổi `fill`/`stroke`; mười icon còn lại không đổi.

Bản cũ vẽ đường viền của cái đinh mũ — vai xiên, mũ rộng 6 đơn vị. Ở 16px, nét
2.2 trong hộp 24 là 1.5px, nên phần ruột dính lại thành một vệt. Tôi thử lại
bằng ba nét thẳng (mũ · đế · kim) thì **tệ hơn**: mất đường viền, nó đọc ra dấu
thập.

Cách chọn: dựng năm phương án cạnh nhau, vẽ ở 16px và 64px, chụp lại rồi nhìn —
viền cũ, ba nét, tack đặc có kim, tack đặc không kim, và giọt nước kiểu map pin.
Chỉ tack đặc có kim còn đọc được ở 16px. Giọt nước cũng rõ nhưng nó nói "vị
trí", không nói "ghim lên đầu". Đây là icon đặc duy nhất trong bộ, nên nó nặng
hơn hàng xóm một chút — đã ghi lý do ngay trên hàm.

---

## Đối chiếu với bộ luật

Không mâu thuẫn luật nào. Hai bản sửa này phục vụ đúng ba điều chủ site dặn về
giao diện hôm 2026-09-18: một bán kính duy nhất, đường liền không đứt, và icon
phải sắc nét đọc ra hình. Nhóm 08 không liên quan — xem mục đính chính trong
ghi chú của PR #3.

## Bảng, cột, endpoint đã đụng

**Không cái nào.** Toàn bộ nằm ở lớp vẽ.

## Kiểm

- `npm test` — 125 file, 1288 test xanh, 2 skip. Lint và typecheck sạch.
- Đã chụp ảnh trước và sau, xem cách làm bên dưới.
- **Ba thanh dính vẫn chưa kiểm được.** Ảnh tĩnh không chứng minh được
  `position: sticky`; phải cuộn thật. Cần mắt chủ site trên site thật.

---

## Cách tự chụp ảnh giao diện, không cần đăng nhập

Phần này để luồng sau khỏi mò lại. Ba màn quản trị nằm sau cổng đăng nhập, và
**hai đường hiển nhiên đều tắc trong phiên agent**:

1. Mở thẳng site: `curl https://beanweirdo.vercel.app` trả
   `CONNECT tunnel failed, response 403`. Chính sách mạng chặn `*.vercel.app`.
2. Dựng bản chạy đầy đủ ở máy: phiên từ xa không có `VITE_SUPABASE_URL` lẫn
   `VITE_SUPABASE_ANON_KEY`, và `frontend/.env.local` bị gitignore nên bản clone
   không bao giờ có. Không có backend để hỏi thì ra trang rỗng.

Đường đi được, vì thứ cần nhìn nằm hết ở lớp vẽ:

1. Viết một trang dùng một lần: `frontend/<tên>.html` cộng
   `frontend/src/<tên>.tsx`, import thẳng component thật kèm `admin/admin.css`,
   nhồi dữ liệu giả, `createRoot(...).render(...)`. Không gọi API nào.
2. Build tĩnh bằng một script Node ở gốc repo — `build()` của vite với
   `base: './'` và `rollupOptions.input` trỏ vào trang ấy, `outDir` để ngoài
   repo. **Chạy từ gốc repo**, không thì Node không tìm ra gói `vite`.
   Không dựng dev server: CLAUDE.md cấm, và cũng không cần.
3. Chụp bằng Chromium sẵn trong máy — `/opt/pw-browsers/chromium`, **không phải**
   `/opt/pw-browsers/chromium/chrome-linux/chrome` (đường dẫn ấy là symlink tới
   chính file chạy). Không phải cài playwright.

   ```
   /opt/pw-browsers/chromium --headless --disable-gpu --no-sandbox \
     --hide-scrollbars --allow-file-access-from-files \
     --window-size=1280,1500 --virtual-time-budget=10000 \
     --screenshot=ra.png "file://<outDir>/<tên>.html"
   ```

   **`--allow-file-access-from-files` là bắt buộc.** Thiếu nó, Chrome chặn
   `<script type="module">` qua `file://` vì origin là `null`, React không mount
   và ảnh ra trắng tinh — không có lỗi nào hiện ra.
4. Xoá hai file tạm khỏi repo. Chúng không phải mã sản phẩm.

Cách này cũng dùng để **so nhiều phương án**: vẽ cả năm cái icon cạnh nhau ở
16px rồi nhìn, thay vì đoán. Đó là cách chọn ra bản `IconPin` ở trên.

## Đề xuất luật

Chưa làm, để chủ site quyết:

1. Icon trong khu quản trị phải đọc được ở cỡ **thật sự dùng** (16px), không
   phải ở cỡ vẽ ra để duyệt. Kèm luôn phép thử: vẽ ở 16px, nhìn, chứ không phóng
   to ra xem.
