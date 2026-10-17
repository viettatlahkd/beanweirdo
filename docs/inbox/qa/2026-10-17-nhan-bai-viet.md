# Nhãn bài viết: thông tin đầu bài hai cột, quản lý trong Hiển thị

Nhánh `feature/nhan-bai`, cắt từ `origin/main` sau PR #120. Chưa có PR. (PR #121 `fix/hang-chen` chưa merge, nhánh này không chứa nó.)

## Thay đổi

- **[ĐỔI HÀNH VI]** Thông tin dưới tiêu đề bài (`components/PostHead.tsx`, mọi trang bài và màn Xem trước của admin) xếp hai
  cột (`repeat(auto-fit, minmax(min(100%, 300px), 1fr))`, một cột khi trang hẹp), mỗi ô là nhãn 90px + giá trị. Trước: một cột
  nhãn 110px.
- **[ĐỔI HÀNH VI]** Thứ tự, bật/tắt và tên của từng nhãn đọc từ `site_settings.data.postHead.fields`
  (`content/postHead.ts`: `POST_FIELDS` mặc định Tác giả · Chủ đề · Tag · Hiện ở · Ngày · Đọc; `postFields` bỏ khoá lạ, thêm khoá
  mới vào cuối, nhãn rỗng dùng tên mặc định). Chưa lưu gì thì giống hệt trước (trừ hai cột). Một nhãn chỉ hiện khi bật **và** có
  giá trị, như trước.
- **[ĐỔI HÀNH VI]** Màn mới Hiển thị › **Nhãn bài viết** (`admin/components/PostLabelsPanel.tsx`; `DISPLAY_TABS` thêm
  `labels`): mỗi nhãn một dòng — kéo ⠿ đổi thứ tự, ô đổi tên (lưu khi rời ô / Enter), công tắc Hiện/Ẩn; mỗi thay đổi lưu ngay
  (`PATCH /api/site` `{ postHead: { fields } }`). Khung "Xem trước" vẽ `PostHead` với bản nháp (bài mẫu, tác giả đầu tiên trong
  danh sách tác giả).
- `SiteOverrides` thêm `postHead` (`content/site.ts`). Backend không đổi (PATCH site gộp khoá tuỳ ý, đối tượng gộp một tầng).

## Kiểm

- Trình duyệt (chặn lệnh ghi, bản chặn trả `{ site }`): ẩn Tag → xem trước bỏ Tag, một PATCH `shown: false`; kéo "Đọc" lên đầu →
  xem trước bắt đầu bằng Đọc; đổi "Ngày" → "Ngày đăng" (gõ thật, Enter) → PATCH có `label: "Ngày đăng"`. Trang bài
  `/p/50bb98c7-…` (cài đặt thật chưa có): hai cột 364px, Tác giả | Chủ đề, Hiện ở | Ngày, Đọc.
- vitest `components`, `screens`, `content`, `admin`: 24 file, 213 test xanh.
- Không ghi gì vào dữ liệu thật.
