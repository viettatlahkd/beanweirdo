# spine/docs-04-rules-a · Bảy luật vào rulebook, ba luật cũ sửa lại

nhánh: spine/docs-04-rules-a   base: origin/main

## Đã thêm — mục A trong sổ, 7/7 xong
| | Luật | Nhóm |
|---|---|---|
| A1 | 14 nhóm bánh xe hương là từ vựng cố định, mỗi nhóm một bộ ba màu dùng chung | 12 |
| A2 | Thanh lọc xếp theo thứ tự bánh xe, không theo thứ tự bài nhắc tới | 12 |
| A3 | `kind` và `visibility` là hai trục độc lập; không lọc bề mặt chỉ bằng `kind` | 05 |
| A4 | Trang chủ chỉ trưng module thường — vì nó là phòng trưng bày, không phải vì ẩn | 05 |
| A5 | Sidebar: module thường trước, đặc biệt sau; trong nhóm theo thứ tự CMS | 05 |
| A6 | Số cạnh bài là vị trí trong danh sách đang xem, không phải thứ tự lúc soạn | 05 |
| A7 | Chưa biết vị trí thì bỏ số đi, đừng đoán | 05 |

## Đã sửa — 3 luật cũ nay sai
| | Trước | Sau |
|---|---|---|
| 05[5] | "[[notes]] dùng **hình vuông** để tách khỏi module" | chấm tròn như mọi module — Ghi 01 nay là module thật |
| 05[6] | "module đã tạo và **chưa ẩn**: luôn hiện ở sidebar và **[[landing]]**" | "đã tạo và **công khai**: luôn hiện" — trang chủ không liệt kê module đặc biệt |
| 12[1] | "ngoại lệ của **quy tắc 06**" | "ngoại lệ của **nhóm 07 luật 3**" — nhóm 06 nói về câu trích |
| 07[1] | "ở mọi danh sách bài gồm [[notes]] … không mở trang mới" | thu hẹp: Ghi 01 nay có bài mở sang trang riêng |

Ba lỗi cuối do agent tài liệu tìm ra (lượt 01–02). Lỗi 05[5] và 05[6] là hệ quả
từ chính PR #4 của tôi — tôi đổi code mà không đổi luật theo.

## Con số
Bộ quy tắc: **68 → 75 luật**. `docs/SPEC.html` đã sửa theo trong cùng PR.

## Kiểm chứng
262 FE + 137 BE xanh, typecheck sạch. Không đụng code sản phẩm.
