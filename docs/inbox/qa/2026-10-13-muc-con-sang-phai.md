# Cấu hình: cột trái chỉ còn thẻ, mục con sang vùng chi tiết

Nhánh `claude/project-thread-oa1vgt` · PR mở ngày 2026-10-13 (số PR ở tiêu đề PR). Sau PR #73.

Chủ site hỏi (2026-10-13, kèm ảnh cây Blog): để các giá trị như "entrepreneur" nằm trong vùng chi tiết thay vì trong cây bên trái. Trên thẻ quyết định chủ site chọn "Chuyển hẳn sang phải".

## [ĐỔI HÀNH VI] Cột trái chỉ còn thẻ
- Trước: dưới mỗi thẻ (Mục lục, Tag, Trang chọn tay, Phần chung) là các dòng con, gập/mở được, kéo ⋮⋮ để đổi chỗ.
- Sau: cột trái chỉ còn các thẻ (`ConfigTree.tsx` `siteTree`). Không còn dòng con, mũi tên gập hay kéo thả ở đây. Thẻ sáng khi chính nó hoặc một mục bên trong nó đang mở (`groupOf`). Mũi tên ↑↓ đi giữa các thẻ; ← → không còn gập gì.
- Bỏ `Leaf`, `FoldButton`, `foldKey`, trạng thái `folded`.

## [ĐỔI HÀNH VI] Danh sách bên phải kéo thả, thêm, xoá
- `Detail.tsx` `ItemList`: mỗi dòng có thể có tay kéo ⋮⋮ (hiện khi rê chuột) và ⋮ của riêng nó (`ListItem.drag`, `ListItem.actions`). Dòng đang bị giữ ở trên hiện chỗ sẽ thả ("trước X", "vào trong X") thay cho số bài.
- Blog · Mục lục liệt kê các subject; mở một chủ đề thì mục "Mục con" liệt kê con trực tiếp của nó. Cả hai kéo được: thả ở mép trên/dưới là đổi chỗ, thả vào giữa là đưa vào trong (`dragOf`, `whereIn`, `moveTopic` như cũ). Đưa ra tầng ngoài thì dùng trường "Nằm trong".
- Port · Mục lục liệt kê trang và About theo thứ tự thanh trên, kéo được như trước (`movePortLink`). Trang nháp/lưu trữ không kéo được.
- Xoá từ ⋮ của dòng dùng chung một hàm với ⋮ ở đầu trang chi tiết (`deleteOf`): chủ đề và tag mở trang của mục với bảng xoá hiện sẵn (vì phải chọn chuyển bài đi đâu); trang port và trang chọn tay hỏi xác nhận rồi xoá ngay. About và trang hệ thống không có ⋮ trên dòng.
- Phần chung (hình trang) liệt kê theo cây, thụt lề theo cấp (`ListItem.depth`), không kéo được.
- Thanh Hoàn tác chuyển từ đáy cột trái sang đáy vùng chi tiết.

## [ĐỔI HÀNH VI] Đường dẫn trên đầu trang chi tiết bấm được
- `DetailHead` nhận `Crumb[]` thay cho `string[]`. Tên site mở trang chủ site đó, tên nhóm mở thẻ nhóm, tên chủ đề cha mở chủ đề đó.

## Bảng, cột, endpoint đã đụng
- Không đổi. Kéo thả vẫn gọi `PATCH /api/tags?vocab=nodes&id=…` (`parent_id`), `PUT /api/tags?vocab=nodes` (thứ tự), và `PATCH` site settings cho thanh trên port, như trước.

## Kiểm tra
- `ConfigTree.test.tsx` viết lại theo cách mới (mở qua thẻ rồi danh sách, kéo trong danh sách, xoá từ ⋮ của dòng, đường dẫn bấm được).
- Xem trên harness (`frontend/cms-harness.html`), kéo thật bằng chuột: ảnh ở `/mnt/project-files/mau-chi-tiet/phai-*.png`.
