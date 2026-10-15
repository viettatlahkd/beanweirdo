# Tăng tốc tải ảnh và API

Nhánh `claude/api-speed-kos0m7` (PR mở sau khi chủ site đồng ý).

## Đo được gì (2026-10-15, từ container Claude Code)

- Header `x-vercel-id` của mọi route backend bắt đầu bằng `iad1::iad1` — function
  chạy ở Washington. Supabase (project "bibabibo") ở Tokyo. Mỗi truy vấn DB của
  một request đi Mỹ ↔ Tokyo.
- 19 ảnh trong kho `post-images` đang được bài dùng (đọc `posts.hero_image_url`,
  `thumbnail_url` bằng publishable key): **cả 19 trả `cache-control: no-cache`**,
  kể cả tấm tải lên qua vé ký ngày 2026-09-23. Ảnh lớn nhất 4.693.656 byte
  (`4868d3ba-….jpg`); sáu PNG chụp màn hình 0,4–1,5MB.
- Chưa đo được thời gian một request có đăng nhập: không có token admin, và
  Vercel logs trả 403 cho phiên này.

## Đã đổi

1. **[ĐỔI HÀNH VI]** `frontend/src/admin/lib/shrinkImage.ts: shrinkImage` (mới) —
   `uploadImage` thu ảnh về cạnh dài tối đa 2400px, mã hoá WebP chất lượng 0,85
   trước khi tải lên. Trước: tệp gốc đi nguyên. Sau: ảnh đổi đuôi thành `.webp`
   (hoặc `.jpg`/`.png` nếu trình duyệt không mã hoá được WebP). Giữ nguyên tệp
   khi: không phải JPEG/PNG/WebP/HEIC/BMP (GIF, SVG, video), ảnh ≤ 2400px và
   ≤ 300KB, bản nén không nhỏ hơn, hoặc trình duyệt không giải mã được. Thử trong
   Chromium: JPEG 4032×3024 1.556.738 byte → WebP 2400×1800 282.386 byte.
2. **[SỬA LỖI]** `frontend/src/admin/lib/apiClient.ts: uploadImage` gửi byte trơn
   (`ArrayBuffer`) kèm `cacheControl: '31536000'` thay vì `File`. Với `File`,
   storage-js bọc FormData và ảnh lên kho mang `no-cache` (xem số đo trên). Byte
   trơn đi qua header `cache-control`, preflight của Storage cho phép header này
   (đã gọi `OPTIONS` thử). Chỉ áp cho ảnh tải lên **từ nay**; ảnh cũ vẫn `no-cache`.
3. **[ĐỔI HÀNH VI]** `backend/vercel.json` (mới): `"regions": ["hnd1"]` — function
   backend chạy ở Tokyo, cạnh DB. Trước: mặc định `iad1`. Hobby cho chọn một region.

Không đụng bảng, cột hay endpoint nào. `POST /api/upload` giữ nguyên.

## Đề xuất (chưa làm)

- Bundle frontend là một tệp 1,34MB (414KB nén), gồm cả khu quản trị; trang công
  khai cũng tải hết. Tách khu quản trị bằng `lazy()` sẽ nhẹ trang đọc.
- Ảnh cũ trong kho vẫn to và `no-cache`; muốn sửa phải tải lại từng tấm.
