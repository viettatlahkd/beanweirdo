# PR #67 · nhánh `claude/project-thread-rpmkb1` — Bean blog trong Cấu hình: một cây, bỏ Điều hướng, Mẫu, Lưu trữ

Chủ site (2026-10-08 09:16): gộp Mục lục với cây chủ đề và kéo thả để di chuyển cây ("bản chất 2 cái đấy là sắp xếp cây"), cân nhắc bỏ Điều hướng, bỏ Mẫu ("có edit hay preview được gì đâu"), sửa UX trang Tag, hỏi vì sao Hình trang không có xem trước.

## [ĐỔI HÀNH VI] Mục lục và Cây chủ đề là một thẻ

Trước: hai thẻ, "Mục lục" (chữ cố định của `/bean/muc-luc`) và "Cây chủ đề" (cây kéo thả).
Sau: một thẻ "Mục lục" (`ConfigTree.tsx`, `groupCard('topics', 'Mục lục', …)`), cây chủ đề nằm dưới nó. Bấm thẻ mở bên phải: lời dẫn, ô thêm subject, rồi chữ cố định của trang Mục lục (`renderCopy('index')`); xem trước là `/bean/muc-luc`. Đường dẫn của một topic đổi từ "Bean blog › Cây chủ đề › …" thành "Bean blog › Mục lục › …". Kéo thả trong cây không đổi (`dropTopic`, `planMove`).

## [ĐỔI HÀNH VI] Thanh bên đi theo thứ tự của cây; màn Điều hướng bỏ

Trước: `data/useModules.tsx: arrange` xếp thanh bên và trang chủ blog theo danh sách lưu trong trang `kind = 'nav'` (`presentation.items`), subject chưa có trong danh sách thì nối sau. Một khi danh sách có subject, kéo subject trong cây không làm thanh bên đổi theo.
Sau: subject luôn theo thứ tự cây (`sort_order`); danh sách chỉ còn quyết **hiện hay ẩn** từng mục (`sidebar`, `home`). Mục khác trong danh sách (topic con, trang chọn tay, tag) đi sau các subject, giữ thứ tự cũ.
Màn Điều hướng (`PageSettings.tsx: NavEditor`, `navItemsOf`) bị xoá. Thay bằng `PageSettings.tsx: NavFlags` — hai ô "hiện ở thanh bên" / "hiện ở trang chủ blog" trên trang sửa của từng topic, tag và trang chọn tay. Mục chưa có trong danh sách: subject mặc định bật, mục khác mặc định tắt; bấm thì ghi thêm một mục vào `presentation.items`.

Hệ quả nhìn thấy được trên site thật: nếu chủ site từng xếp subject trong Điều hướng khác với thứ tự cây, thanh bên sẽ đổi sang thứ tự cây sau khi deploy. Dữ liệu `presentation.items` không bị sửa khi deploy.

## [ĐỔI HÀNH VI] Bỏ Mẫu và Lưu trữ khỏi cây

- Mẫu: nhóm "Mẫu" (ba trang `template_subject`, `template_topic`, `template_keyword`) không còn trong cây; `BlogSelected` bỏ `'template'`, `RuleEditor` bỏ prop `template`, `TEMPLATE_TITLES` thành `TEMPLATE_WORDS` (không export). Một topic hay tag không có cài đặt riêng giờ ghi "Theo quy chế chung của trang …", không còn link sang mẫu. Quy chế chung vẫn nằm trong DB và vẫn được dùng (`buildPages`); chỉ là không sửa được từ giao diện nữa — muốn khác thì "+ cài đặt riêng" cho từng mục.
- Lưu trữ: thẻ mở ra bảng trống (`Cms.tsx: pageCopy.archive` là `null`, chữ trang Archive viết cứng từ 2026-09-19). `SystemPage` bỏ `'archive'`.

## [ĐỔI HÀNH VI] Trang Tag

- Cây: tag xếp theo tên (`localeCompare(…, 'vi')`).
- Một con số cho mỗi mục: cột "N bài" ở cây dùng `posts` của từ vựng (`t.posts`, `k.posts`), cùng số với đầu phần sửa. Trước đó cây đếm bài của trang công khai (`postsOf`), nên cây và phần sửa có thể lệch nhau.
- Bỏ dòng id dưới ô tên (`ContentWorkspace.tsx: FlatSettings`); địa chỉ đã có ở đầu phần sửa.
- `NodePage` liệt kê tối đa 8 bài trang đang có, thay cho chỉ một con số.

## [SỬA LỖI] Hình trang có xem trước

Trước: chọn một Hình trang thì khung xem trước ghi "Mục này không có trang riêng". Từ PR #61 module không còn là trang; nó chỉ là bộ dàn trang/ảnh/chữ mà một trang mượn.
Sau: xem trước trên trang đang mượn nó (`ConfigTree.tsx: wearer` = `findPage(pages, moduleId)`, tức topic hay trang chọn tay có alias là module ấy, hoặc chính module nếu chưa ai lấy). Một dòng giải thích trang nào đang mượn. Hàng trong cây ghi "chưa dùng" khi không tìm được trang nào.

Bảng/endpoint đã đụng: `PATCH` trang `nav` (`updatePage`, cột `presentation`) khi bấm hai ô hiện/ẩn — giống màn Điều hướng cũ. Đọc như cũ: `GET /api/tags?vocab=layout|topics|keywords`. Không thêm serverless function, không cần SQL.

Bộ luật: `frontend/src/content/logic.ts` không có trong repo, không đối chiếu được theo `nhóm.số`. Ghi chú `muc-luc-cay-ba-tang` cũ nhắc luật nhóm 05 ("thường trước đặc biệt"); thứ tự mới (subject trước, trang khác sau) không mâu thuẫn với nó.

Kiểm: `admin/components/ConfigTree.test.tsx` (thêm: Mục lục là cây và không còn Điều hướng/Mẫu/Lưu trữ/Cây chủ đề; hai ô hiện/ẩn ghi vào `nav`), `data/useModules.pages.test.ts` (đổi kỳ vọng: subject theo thứ tự cây, rồi mục khác). `npm test` xanh (1563). Đã xem `cms-harness.html` trên Chromium 1440px.

## Đề xuất

Nếu chủ site muốn chỉnh quy chế chung của trang topic/tag (xếp, nhóm, giới hạn) mà không đi từng mục, chỗ hợp lý là đặt nó ngay trong thẻ Mục lục và thẻ Tag, thay vì một nhóm Mẫu riêng.
