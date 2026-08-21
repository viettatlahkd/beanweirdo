# spine/design-05-post-detail · Trang bài chi tiết

nhánh: spine/design-05-post-detail   base: origin/main

## Đã đổi
- [ĐỔI HÀNH VI] **Mọi trang bài nay có breadcrumb.** Trước đó không bộ vẽ nào
  có, dù design đặt nó ở cả ba loại bài. Mở một bài là mất đường quay lại.
- [ĐỔI HÀNH VI] **Cả năm loại bài nhận màu của module chứa nó.** Trước:
  - `Article` khai báo ô nhận màu nhưng **không dùng** — luôn tô xanh lá, nên
    bài biochem và bài sensory mở ra giống hệt nhau;
  - `Report` tô xanh dương cố định;
  - `Longform`, `Memo` không có ô đó.
  Longform và Memo dùng dải nông (22px) vì là trang đọc dài — dải cao sẽ đẩy
  đoạn đầu ra khỏi màn hình.
- [SỬA LỖI] Breadcrumb trang bài kết thúc bằng **tên bài**, không phải chữ
  "Bài viết". Chú thích của chính hàm đó đã ghi đúng từ đầu, code thì không.
- [SỬA LỖI] Nút `←` trên trang bài luôn quay về **`biochem`** dù đang đọc bài
  nào. Nay về đúng module của bài.
- [SỬA LỖI] Tiêu đề bài dạng thẻ bị CSS ép chữ thường: `Sensory Lexicon` hiện
  thành `sensory lexicon`. Bốn loại kia không ép, design cũng không.

## Đụng dữ liệu
- Không đổi schema, không đổi endpoint.
- `ArticlePostData` thêm trường `band` (trước đó thiếu hẳn); `Report`,
  `Longform`, `Memo` cũng vậy.

## Đụng luật
- Nhóm 09 — "bài lấy màu của module chứa nó". Luật đã có, code chưa làm đúng
  ở bốn trong năm loại bài. PR này đưa code về khớp luật.
- Nhóm 05 — breadcrumb phản ánh đường người đọc đã đi. Nay áp cho cả trang bài.

## Luật đề xuất
- "Mọi trang bài đều mở đầu bằng breadcrumb kết thúc ở tên bài."
- "Hệ thống không biến đổi chữ hoa/thường của tiêu đề bài ở bất kỳ đâu — lưu
  sao hiện vậy."

## Kiểm chứng
Đo trên trang đang chạy, dữ liệu production:
```
sensory   Sensory Lexicon        ← Trang chủ › Mục lục › sensory › Sensory Lexicon
                                 dải màu rgb(242,160,165) = #F2A0A5 ✓
biochem   Lipid: Tổng quan       ← … › biochemistry 101 › Lipid: Tổng quan
                                 dải màu rgb(127,184,126) = #7FB87E ✓
ghi01     taste modality: sơn la ← … › Ghi 01 › taste modality: sơn la
                                 dải màu rgb(111,168,192) = #6FA8C0 ✓
tiêu đề   text-transform: none — hiện đúng "Sensory Lexicon"
```
Test: 195 FE + BE xanh, typecheck cả ba phần sạch.

**Chưa quan sát được:** `article` và `report` không có bài nào đang đăng nên
không mở được trên site. Cùng đường code, do typecheck và test bao.

## SPEC lỗi thời
- Mục "Mô hình nội dung" — cần nói rõ mọi bài đều mang màu module và đều có
  breadcrumb.
