# Màn soạn theo lối Lark: nút ra khỏi cột chữ, menu nổi, dòng bullet xuống dòng

PR: chưa mở    nhánh: spine/soi-mat-playwright    commit: điền sau khi merge
Cắt từ: origin/main @ 03a7815
Nguồn: chủ site gửi ảnh Lark Docs và ảnh màn soạn hiện tại. *"UI [Thêm khối]
siêu phiền vì nó nằm chèn lên cả nội dung"*, *"click vào bulletpoint nó hiện 1
row và khó thấy thông tin"*, *"tránh nhất là làm mất nội dung, che mất nội
dung hoặc ẩn mất nội dung, đặc biệt trong lúc đang edit"*.

## [SỬA LỖI] Dòng bullet bị ép thành một dòng lúc sửa

Nặng nhất trong loạt này. `renderListLine` dựng `EditableField` **không có**
`multiline`, nên nó là `input` một dòng: một mục dài hai dòng lúc vẽ bị nén
thành một dòng lúc sửa, chữ trôi ngang ra ngoài ô. Người viết mất nhìn thấy
đúng cái mình đang sửa.

Nay `multiline rows={1}` cho cả dòng chính lẫn dòng phụ. Đo trong Chrome:
khung dòng **81.3px lúc vẽ, 81.0px lúc gõ** — không đổi số dòng, không cuộn
ngang.

## [ĐỔI HÀNH VI] Mọi nút dồn về máng bên trái

Trước: tay nắm ở lề trái, `✎ ⧉ ×` **tuyệt đối bên phải đè lên chữ**, và
`+ dòng phụ · + mục con · xoá dòng` nổi lên **trên chính dòng** đang rê chuột.

Nay `.awc-gutter` gom `+`, tay nắm, `✎ ⧉ ×` vào một máng 46px ngoài cột chữ,
chỉ hiện khi rê chuột lên khối. Đo trong Chrome: **0 nút** giao với vùng chữ.

## [ĐỔI HÀNH VI] `+ THÊM KHỐI` thành dấu `+` trong máng

Dải `+ THÊM KHỐI` nằm **trong dòng chảy**, một cái sau mỗi khối — bài mười
khối gánh khoảng ba trăm pixel toàn nút. Nay là một dấu `+` trong máng.

## [ĐỔI HÀNH VI] Menu chèn thành lớp nổi

Menu cũ vẽ trong dòng chảy (`padding: 4px 0 14px`), nên mở ra là đẩy cả bài
xuống. Nay `.awc-menu-pop` là lớp nổi có bóng, `z-index: 20`. Đo trong Chrome:
nội dung phía dưới **dịch 0px** khi mở menu.

Menu cũng đổi từ chip nằm ngang sang danh sách dọc theo nhóm, như Lark.

## [ĐỔI HÀNH VI] Đánh số là một type, không phải ô tick

Mỗi danh sách từng đeo một hàng checkbox "đánh số" nằm thường trực phía trên.
Nay là hai mục trong menu: **Danh sách** và **Danh sách đánh số**. Vẫn **một**
element trong kho, chỉ khác thuộc tính — `ORDERED_LIST` trong `postData.ts`.

## [ĐỔI HÀNH VI] Bỏ bốn nút mỗi dòng

`+ dòng`, `+ dòng phụ`, `+ mục con`, `xoá dòng` đã bỏ. Chúng sinh ra vì trước
đây là cách duy nhất; sau sáu đợt bàn phím thì `Enter`, `Shift+Enter`, `Tab`,
`Backspace` làm hết. Giữ lại là giữ đúng cái mớ chủ site đang phàn nàn.

## Bảng, cột, endpoint

Không đụng cái nào. Không migration.

## Kiểm chứng

- `npm test`: **121 file, 1276 test xanh**. `npm run build`: xanh.
- Playwright + Chrome của máy, trang thử tạm mount `EditorCanvas`: **8/8**.
  Trang thử đã xoá.
- Ba test cũ tìm nút bằng chữ `+ thêm khối` nay tìm bằng nhãn trợ năng
  `thêm khối` — nút thành icon, không còn chữ.

## Chỗ chưa làm

- Máng mới chỉ có ở khối trong thân bài. Cards, article, longform giữ khuôn cũ.
- `Cmd+A` chọn cả khối, kéo thả bằng máng: chưa.

## Đề xuất luật

22. **Không có nút nào nằm đè lên chữ.** Mọi nút của một khối ra ngoài cột
    chữ. Trong lúc soạn, việc quan trọng nhất là nhìn thấy hết nội dung.
23. **Ô soạn không được ít dòng hơn lúc vẽ.** Một ô nén hai dòng thành một là
    giấu mất nội dung ngay giữa lúc người viết đang sửa nó.
24. **Menu nổi lên trên, không đẩy nội dung.** Mở một menu mà cả bài tụt xuống
    là bắt người viết tìm lại chỗ mình đang đứng.
25. Một lựa chọn chỉ đặt **một lần lúc tạo** thì là một type trong menu, không
    phải một ô tick đeo trên khối suốt đời.
