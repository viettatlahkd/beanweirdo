# Ghi 01: ẩn hàng chưa có bài

Nhánh `claude/project-thread-12dfli`, nối tiếp PR #51.

## [ĐỔI HÀNH VI] Hàng chưa có bài bị ẩn cả hàng

Chủ site: "row nào mà chưa có bài này thì ẩn đi" (ảnh chụp: trang còn ít bài, phía trên chỉ có ảnh trang trí và câu trích đứng một mình).

- Trước (PR #51): `blockLayout` trong `screens/Notes.tsx` vẽ món trang trí của mọi hàng trong khối, kể cả hàng chưa có bài. Câu trích cố định ở hàng 2 khối trên cùng.
- Sau: hàng không có bài nào bị bỏ qua, cả trang trí. Câu trích đi theo hàng **đầu tiên được hiện** trên trang; các hàng hiện khác lấy ảnh F kế tiếp như trước.
- Vị trí các ô (`ROWS`, `placePosts`) không đổi; bài đã có không dời chỗ.

Không đụng bảng, cột, endpoint. `npm test` xanh; kiểm trình duyệt dữ liệu giả 1–10 bài ở 390/905/1280/1440px, không đè.

## [ĐỔI HÀNH VI] Mỗi hàng nhận đúng một ô F, ô chưa cấu hình thì để trống

Chủ site: "tất cả ảnh đều là ylang à? cái nào đang chưa có config thì để trống nhé" (chỉ F1 có ảnh, nên bản trước lặp ảnh F1 ở mọi hàng).

- Trước: `blockLayout` lọc lấy các ảnh đã có rồi quay vòng, câu trích ở hàng hiện đầu tiên.
- Sau: các hàng được hiện nhận ô F theo thứ tự, mỗi hàng một ô: hàng đầu F1, hàng kế F2 (câu trích), rồi F3, F5, F6, F7. Ô chưa có ảnh (hoặc câu trích rỗng) thì hàng đó không có trang trí. Hết ô thì các hàng sau không có. Hàm `decorations` bị xoá, thay bằng `configured`.
