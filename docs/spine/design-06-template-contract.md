# spine/design-06-template-contract · Luật phổ quát cho mọi template

nhánh: spine/design-06-template-contract   base: origin/main

## Bối cảnh
Chủ site nêu: các luật vừa áp ở PR #16 phải đúng cho **mọi template, kể cả
template tạo sau này**, và phải được lưu ở nơi khiến code luôn chạy đúng — cả
frontend lẫn backend.

## Đã đổi
- [SỬA LỖI] **Backend chỉ biết 3 trong 5 template.** `POST_TEMPLATES` vẫn là
  `article, cards, report` từ trước migration 0010. Hậu quả thật, đang tồn tại
  trên production: tạo bài `longform` hoặc `memo` qua API trả về
  `400 template must be one of: article, cards, report` — dù hai loại đó đang
  có bài đăng.
- [ĐỔI HÀNH VI] Bộ quy tắc thêm **4 luật** vào nhóm 09 (64 → 68).

## Ba lớp bảo vệ
1. **`templateContract.test.ts`** — so ba nơi khai danh sách template với nhau:
   ràng buộc trong migration, danh sách ở backend, bộ điều phối ở frontend.
   Ba nơi này không import được nhau nên không có gì bắt chúng khớp.
2. **`everyTemplate.test.tsx`** — dựng thật cả năm template và khẳng định mỗi
   loại đều hiện đường dẫn quay lại và tô màu module. Thêm template mà quên
   khai vào đây thì test đầu tiên đỏ và chỉ đúng tên loại còn thiếu.
3. **Bộ quy tắc** — 4 luật mới, để người đọc rulebook thấy được mà không phải
   đọc code.

## Luật đã thêm (nhóm 09)
- Hai điều không template nào được từ chối, kể cả template viết sau này: đường
  dẫn quay lại, và khối màu lấy từ module chứa bài.
- Đường dẫn của một bài kết thúc bằng tên bài, không phải chữ chung.
- Hệ thống không đổi chữ hoa/thường của tiêu đề bài ở bất kỳ đâu.
- Thêm template mới là phải sửa đủ ba nơi; có kiểm tra tự động so chúng.

## Kiểm chứng
- Thử bỏ một template khỏi danh sách backend → 2 test đỏ ngay, nêu rõ lệch ở đâu.
- 216 FE + 137 BE xanh. Typecheck cả ba phần sạch.

## SPEC lỗi thời
- Số luật: 64 → **68**.
- Mục "Backend" — nói rõ danh sách template phải khớp ba nơi.
