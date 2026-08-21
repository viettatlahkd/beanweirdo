# spine/design-01-cards · Chip nhóm hương lấy lại màu riêng

PR: (điền sau khi mở)   nhánh: spine/design-01-cards   base: 6ceab14

## Màn hình
- `packages/post-renderer/src/Cards.tsx` — bộ vẽ bài dạng thẻ, dùng chung cho
  trang công khai và ô xem trước trong admin.

## Đã đổi
- [ĐỔI HÀNH VI] Chip nhóm hương khi được chọn nay lấy màu của chính nhóm đó
  (nền nhạt + viền đậm + chữ đậm). Trước: mọi nhóm đều tô cùng một màu xanh
  `#E4F0DF`. Design v4 quy định mỗi nhóm một bộ ba màu.
- [ĐỔI HÀNH VI] Thứ tự chip nay theo thứ tự bánh xe hương chuẩn, phần nhóm
  ngoài bánh xe xếp sau theo thứ tự xuất hiện. Trước: theo thứ tự bắt gặp
  trong bài.
- [SỬA LỖI] Số đếm trên chip dùng `tabular-nums` nên không nhảy cột.
- [SỬA LỖI] Chữ "bỏ lọc ✕" đổi sang `#C25C2E` khi rê chuột — trước không đổi.
- [SỬA LỖI] Dòng tiêu đề thẻ đổi nền `#FBF8EC` khi rê chuột — trước không có.

## Đụng dữ liệu
- Không đụng bảng, cột hay endpoint nào. Bảng màu 14 nhóm hương là hằng số
  trong bộ vẽ bài, không phải dữ liệu người dùng.
- `post.groupHues` vẫn được tôn trọng và vẫn ghi đè được màu chấm.

## Đụng luật
- Không mâu thuẫn luật nào. Có liên quan tới nhóm 12 (màu thẻ lấy từ nhóm đầu
  tiên) — luật đó vẫn đúng nguyên, PR này chỉ bổ sung màu cho thanh lọc.

## Luật đề xuất (không tự áp dụng)
- "Mười bốn nhóm của bánh xe hương là từ vựng cố định, không phải dữ liệu bài.
  Mỗi nhóm có một bộ ba màu dùng chung toàn hệ thống, để cùng một nhóm luôn
  hiện cùng một màu ở mọi bài."
- "Thanh lọc nhóm hương xếp theo thứ tự bánh xe, không theo thứ tự bài viết
  nhắc tới."

## Kiểm chứng
- Dựng thật 4 thẻ của bài "Sensory Lexicon" đang chạy trên production: sáu chip
  ra sáu màu khác nhau, khớp từng mã màu trong design v4.
- Thêm 2 test mới. Toàn bộ: 123 FE + 124 BE, xanh.

## SPEC lỗi thời
- Chưa có mục nào trong SPEC.html mô tả thanh lọc nhóm hương — có thể bổ sung,
  nhưng không bắt buộc.
