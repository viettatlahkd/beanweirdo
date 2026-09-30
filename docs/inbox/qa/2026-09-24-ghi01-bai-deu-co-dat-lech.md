# Ghi 01: mỗi hàng hai bài và một món trang trí nhỏ

Nhánh `claude/project-thread-12dfli`, PR #48 (mở sau PR #47).

## [ĐỔI HÀNH VI] Lưới Ghi 01

- Trước (PR #47): ba bài một hàng, mọi thẻ `span 4`, không lệch; trang trí là một dải
  ở chân trang (`DecoStrip`).
- Sau: mỗi hàng ba món, gồm hai bài và một món trang trí. Bài vẫn cùng một cỡ (bốn
  trên mười hai cột, khung ảnh 4:3). Món trang trí chiếm ba cột (`DECO_SPAN`) và là
  ảnh cao 170px, giữ tỉ lệ `cellRatio`, hoặc câu trích 22px. Ba dạng hàng trong
  `ROWS` (`screens/Notes.tsx`) đổi chỗ món trang trí trái, giữa, phải và cho mỗi món
  tụt xuống một khoảng khác. Chỉ tụt xuống, không món nào kéo lên chồng hàng trên.
- Mỗi món đặt bằng `gridRow` riêng (`2r+1`). Bài đang mở nằm ở dòng ngay dưới hàng
  của nó (`2r+2`, `2 / span 9`). `rowGap` là 0, khoảng giữa các hàng là `ROW_GAP`
  (64px) cộng vào `marginTop`, để dòng trống của bài mở không để lại khoảng hở.
- Món trang trí lấy theo thứ tự F (`decorations`): ô ảnh đã có ảnh, và câu trích. Mỗi
  món dùng một lần; hết món thì các hàng sau chỉ có hai bài.
- Bản hẹp: một cột, bài rộng 84% đổi bên, món trang trí 52% (câu trích 80%) sau
  mỗi cặp bài.
- Bỏ `DecoStrip`; hai ảnh chân trang giữ nguyên.

Lý do: chủ site 2026-09-24, sau PR #47: "tôi muốn sự hơi lộn xộn ấy chứ không theo
hàng như kia", rồi "logic là mỗi hàng là 3 items, 2 bài main và 1 ảnh nhỏ deco đang xen".

## Kiểm

Trang thử dữ liệu giả trong Chromium, 1–6 bài, 390/905/1280/1440px: không cặp món
nào trong lưới giao nhau. Mở bài thứ ba: bài nằm dòng dưới hàng của nó, trang cuộn
tới. `Notes.inline.test.tsx` đổi kỳ vọng, bộ lọc thẻ đọc `[data-note]`.

## [ĐỔI HÀNH VI] Màn hẹp: bài không còn thẳng hàng

Chủ site: "2 cái này hơi thẳng nhau quá" (hai bài liền nhau trên điện thoại cùng rộng, cùng lề).

- Trước: mọi bài rộng 84%, bài chẵn sát trái, bài lẻ sát phải.
- Sau: `MOB_POSTS` trong `screens/Notes.tsx` xoay vòng bốn cặp bề rộng/lề trái (80/0, 70/28, 76/9, 66/22 — phần trăm cột), nên hai bài liền nhau không trùng cả hai. Bài đang mở vẫn 100%.
- Không đụng bảng, cột hay endpoint nào.
