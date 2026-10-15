# Thẻ xem trước bài: rê chuột 3 giây, hiện 30% bài

Nhánh `claude/project-thread-442o9y` · PR mở ngày 2026-10-14 (số PR ghi ở tiêu đề PR).
Chủ site yêu cầu (ảnh chụp, 2026-10-14): trên danh sách bài của trang port, thôi bắt
click mới hiện thẻ; dừng chuột 2 giây là hiện (sau đó chủ site đổi thành 3 giây), trong thẻ có nội dung bài, lộ khoảng
30%, phần còn lại mờ đi, cuối có nút đọc tiếp sang bài, giống bài trả phí của Medium.

## Đã đổi

- **[ĐỔI HÀNH VI]** Thẻ xem trước của trang port (`portfolio/PostPeek.tsx`:
  `usePeek`, `PostPeek`). Trước: click một bài (dòng series, thẻ, chú thích ảnh
  mở đầu, ô ảnh fibonacci) mở hộp thoại giữa màn có ảnh, "trước khi đọc" + lead,
  và "đọc bài →". Sau:
  - Chuột dừng trên bài `HOVER_MS` = 3000ms thì thẻ hiện cạnh bài (phải nếu đủ
    chỗ, không thì trái, không thì giữa). Rời bài và thẻ quá `LEAVE_MS` = 250ms
    thì đóng. Chỉ áp cho `pointerType === 'mouse'`.
  - Click (và chạm trên điện thoại) mở ngay, thẻ ở lại tới khi bấm ×, Esc hoặc
    bấm ra ngoài. Màn hẹp hơn 640px: thẻ nằm giữa trên nền tối.
  - Thẻ giữ khung cũ (ảnh bìa trái, meta, tag, tiêu đề, lead) và cố định
    720×520 (thấp hơn nếu cửa sổ thấp). Cột phải cuộn được: sau lead là chữ
    của bài lấy bằng `lib/postText.ts`: `proseOf` (đi qua `body` mọi khuôn, lấy
    tiêu đề mục và đoạn văn, vẽ bằng chữ của trang port, không bằng khuôn bài),
    tới `SHOWN` = 30% chiều cao (không dưới một khung, không quá 2,5 khung), rồi
    lớp mờ và nút "Đọc tiếp" trỏ tới `postHref` (cùng địa chỉ "đọc bài →" cũ).
    Màn hẹp: ảnh lên trên, cao 140px.
  - Hộp thoại cũ (`Summary` trong `PortfolioView.tsx`, CSS `.pf-pop`) đã xoá.
    Nhãn "trước khi đọc" bỏ; lead vẫn nằm dưới tiêu đề.
- **[SỬA LỖI]** không có.

## Đã đụng

- Bảng `posts`: đọc `select('*')` một hàng theo `id` khi thẻ sắp mở (lúc chuột
  vừa vào bài, trước 3 giây), giữ trong bộ nhớ cho cả lượt xem (`loadPost`).
  Trước đây thẻ không đọc thêm gì.
- Không đổi endpoint, cột hay migration.

## Kiểm

Trang thử dựng tạm (đã xoá), dữ liệu giả, Playwright: sau 1s chưa mở, sau 3,5s
mở; vào thẻ cuộn tới cuối thấy nút; rời thẻ thì đóng; điện thoại chạm mở, chạm
ngoài đóng. Ảnh: `/mnt/project-files/the-xem-truoc/`.

## Đề xuất

- `proseOf` bỏ ảnh, bảng số liệu và định dạng chữ (đậm, nghiêng). Nếu chủ site
  muốn thẻ giống hệt trang bài, cần một bản vẽ thu nhỏ của từng khuôn.
