# spine/design-07-longform-memo · Đối soát hai màn hình chưa ai nhìn

nhánh: spine/design-07-longform-memo   base: origin/main

## Bối cảnh
`isLongform` và `isTaste` chưa từng được đối soát — tôi đã đọc nhầm một bản
export cũ chỉ có 14 màn hình và kết luận chúng "không có design".

## isLongform ↔ Longform.tsx
162 giá trị, khớp 149. Loại khối đủ 9/9. Lệch **một** chỗ, đã sửa:
- Dải mờ sau bảng mục lục dính: design dùng gradient bốn chặng +
  `backdrop-filter: blur(2px)`, code chỉ có gradient hai chặng, không làm mờ.
  Đệm `18px 26px 12px 44px`, code để `20px 24px 20px 40px`.

## isTaste ↔ Memo.tsx
120 giá trị, khớp 96. Lệch **năm** chỗ, đã sửa hết:

| | Trước | Sau |
|---|---|---|
| lưới giai đoạn | `54px`, khe 18/26 | `34px`, khe 14/20 |
| số giai đoạn | một màu xám `#C4C0B0`, in nghiêng | xoay vòng ba màu, không nghiêng |
| bảng | `repeat(n, 1fr)`, khe 12 | cột nhãn `80px` cố định, khe `0 14px`, rộng tối đa 420px |
| danh sách lồng cấp | luôn `18px` | `14px` từ cấp hai trở đi |
| khối kết luận | **không có** | nền `#F3EEE1`, tiêu đề `#7A5230` |
| gạch chân số đo | **không có** | `MemoRun.u` — viền mảnh, giữ màu chữ |

## Đụng dữ liệu
Thêm hai trường vào kiểu, không đổi schema:
- `MemoRun.u` — đánh dấu một số đo đáng chú ý
- `MemoSection.callout` — khối kết luận

Bài memo đang chạy chưa dùng hai trường này; chúng chỉ hiện khi nội dung có.

## Kiểm chứng
`Memo.design.test.tsx` — 5 test, mỗi test một chỗ vừa sửa.
270 test xanh. Số giá trị chưa khớp toàn hệ: **60 → 54**.

## Còn lại
D9: 54 mục cần soi tay, nhiều nhất ở trang báo cáo (19).
