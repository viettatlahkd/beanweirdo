# Ghi 01: trang trí luôn hiện ở chỗ của nó

PR: (xem nhánh) · nhánh `claude/project-thread-12dfli`, nối tiếp PR #50.

## [SỬA LỖI] Ảnh trang trí và câu trích biến mất khi trang có ít bài

Chủ site: "các cái deco đâu?" sau khi PR #50 lên.

- Nguyên nhân: `blockLayout` trong `screens/Notes.tsx` (bản PR #50) chỉ vẽ ảnh khi ô 1 có bài và câu trích khi ô 2 có bài. Bài lấp khối từ ô 7 ngược lên, nên với dưới 6–7 bài thì ô 1, ô 2 trống và cả hai món đều không hiện.
- Sửa: `blockLayout` vẽ ảnh của mỗi khối (`PHOTO_SPOT`) và câu trích ở khối trên cùng (`QUOTE_SPOT`) bất kể ô bên cạnh. Vị trí không đổi.
- Tái hiện: trang Ghi với 3 bài, trước khi sửa không có ảnh trang trí hay câu trích nào.

Không đụng bảng, cột, endpoint.

## [ĐỔI HÀNH VI] Mỗi hàng 2 bài + 1 trang trí

Chủ site: "cái row dưới là 2 bài 1 deco, các row đều sẽ là 2 bài 1 deco nha".

- Trước (PR #50): khối 8 ô chia ba dải (2 bài + ảnh, câu trích + 3 bài, 3 bài). Bài lớn ở ô 0 và ô 4.
- Sau: `ROWS` trong `screens/Notes.tsx`, khối 8 ô thành 4 hàng, hàng r giữ ô 2r và 2r+1 cùng một món trang trí ở cột riêng (trong một hàng không món nào chung cột, nên không đè nhau dù cao thấp thế nào). Bài lớn ở ô 0 và ô 5.
- Trang trí (`blockLayout`): câu trích ở hàng 2 của khối trên cùng. Mọi hàng khác lấy ảnh kế tiếp theo thứ tự F, hết thì quay vòng, nên hàng nào cũng có. Trước đó mỗi ảnh chỉ dùng một lần.
- Bài mở ra nằm ở hàng trống ngay dưới hàng của nó (`gridLine` + 1).
- `placePosts` và `byTimeNewestFirst` không đổi.
