# Thân bài là một dải chữ liền mạch

PR: chưa mở    nhánh: spine/ui-editor-2    commit: điền sau khi merge
Cắt từ: origin/main @ 9730683
Nguồn: chủ site — *"sao giờ nó vẫn đang chia thành các khối à? cho nó thành
liền mạch đi"*, *"tôi muốn bôi đen một loạt thì nó vẫn đang nhận mỗi bullet
point là 1 dòng à?"*, và *"bản chất là ở dòng nào ở đâu bạn cũng tạo được kiểu
đó và nó sẽ là 1 phần của văn bản liền mạch"*.

## Chẩn đoán

Cái sai **không** nằm ở chỗ lưu thành khối — lưu thế là đúng, vì bảng có bề
rộng cột, ảnh có điểm căn, ghi chú neo vào `id` khối. Cái sai là **mỗi khối
một ô nhập**: trình duyệt không cho một vùng chọn trải qua hai ô nhập.

Đo được trước khi sửa: bôi đen qua ba bullet thì `getSelection()` trả về
**chuỗi rỗng**.

## [ĐỔI HÀNH VI] Gom khối chữ vào một ô

`admin/lib/flow.ts`. Mọi khối chữ liền nhau — tiêu đề, đoạn văn, danh sách,
trích dẫn — nhập vào **một** ô duy nhất, chữ nối thành một dải markdown. Bảng,
số liệu, biểu đồ, ảnh vẫn là widget riêng, cắm vào giữa dải đúng chỗ nó đứng.

Con trỏ ở ngoài thì dải vẽ đúng thứ trang vẽ; bấm vào thì mở ra thành markdown.
Bấm vào khối nào thì con trỏ rơi vào dòng của khối ấy.

**Cách lưu không đổi một chữ.** Đây thuần tuý là cách bày ra để sửa.

Áp cho **cả ba màn** — report, memo, bitesize. Chủ site chọn phương án này để
không có hai lối soạn trong một app.

## [ĐỔI HÀNH VI] `/` chèn được ở bất kỳ đâu trong dải

Loại chữ (tiêu đề, danh sách, trích dẫn) thì **chèn ký hiệu markdown tại chỗ
và ở lại trong ô** — không cắt dải, vì chúng vốn đã là một phần của văn bản.
Ghi ra ngay thì `1. ` chưa có chữ nào phía sau sẽ đọc lại thành đoạn văn rỗng.

Loại widget thì cắt dải **ở ranh giới dòng** rồi cắm vào: một cái bảng chen
vào giữa câu là làm gãy câu ấy.

## [SỬA LỖI] Nguồn trích dẫn từng bị mất

`bodyToMarkdown` viết trích dẫn thành `> chữ` và **bỏ mất `attribution`** —
đi một vòng khối→chữ→khối là mất tên người được trích. Nay viết thành một dòng
`> — nguồn` và đọc lại được. Có test giữ.

## Bốn lỗi khác do test bắt được

1. **`Cmd+B` `Cmd+U` `Cmd+K` chết trong dải chữ** — chúng chỉ được bật cho ô
   hai mặt. Dải chữ cũng là markdown, chỉ khác là nó tự lo phần vẽ.
2. **Con trỏ bị kéo về chỗ cũ mỗi lượt vẽ** — `onFocused` là arrow mới nên deps
   đổi liên tục, effect đặt con trỏ chạy lại. Nghĩa là vừa bôi đen xong là vùng
   chọn biến mất: đúng thứ cả lượt này sinh ra để sửa.
3. **Bấm vào dải thì ô nhập không nhận focus** — `activeElement` là BODY, nên
   mọi phím sau đó bay đi đâu mất. Mặt vẽ bị thay bằng ô nhập ngay sau cú bấm.
4. **Bấm vào rồi bấm ra mà không gõ gì thì ô kẹt ở mặt gõ** — `onLeave` treo
   trong `onCommit`, mà `onCommit` chỉ chạy khi chữ đổi.

## [ĐỔI HÀNH VI] Bỏ code đã chết

`ListEditor` và `listKeys.ts` không còn đường tới (danh sách nay luôn là chữ
trong dải) — xoá cả code lẫn 31 test. Giữ test cho code không ai gọi là tự lừa
mình; git giữ lịch sử.

`execCommand` cũng bỏ: nó đã bị khai tử và jsdom không dựng nó, nên chỗ dán tự
ghép chữ lấy.

## Bảng, cột, endpoint

Không đụng cái nào. Không migration.

## Kiểm chứng

- `npm test`: **120 file, 1247 test xanh**, gồm typecheck cả ba tsconfig.
- `npm run build`: xanh.
- Playwright + Chrome của máy: **11/11**. Đáng kể nhất: bôi đen chọn được
  **163 ký tự** trải qua tiêu đề, đoạn văn và cả ba bullet — trước đây là
  chuỗi rỗng. Dấu `+` đo được 26×26px. Không nút nào giao với vùng chữ. Sửa
  chữ quanh bảng không đụng `widths = [60,40]`.

## Chỗ chưa làm

- Kéo–thả đổi chỗ chỉ còn ở widget. Trong dải chữ, đổi chỗ là cắt dán chữ.
- Ghi chú neo vào một khối chữ bị xoá bằng cách xoá chữ thì **không có hộp
  thoại hỏi** như khi xoá widget. Cần rà `orphanNotes`.
- Cột ghi chú căn theo dải, nên nhiều ghi chú trong cùng một dải xếp chồng
  cạnh dải ấy chứ không ngang hàng từng khối.

## Đề xuất luật

26. Thân bài lúc soạn là **một dải chữ liền mạch**. Mỗi khối một ô nhập là cách
    chắc chắn làm hỏng bôi đen, vì trình duyệt không cho vùng chọn trải qua hai
    ô nhập.
27. Thứ markdown không đựng nổi thì vẫn là widget, **cắm vào giữa dải** đúng
    chỗ nó đứng — không tách ra thành một tầng riêng.
28. Chèn một thứ vào giữa chữ thì cắt ở ranh giới dòng, không cắt giữa câu.
29. Dựng lại một dải phải **giữ nguyên `id` cũ theo thứ tự**, nếu không thì sửa
    một chữ là cả cột ghi chú mất chỗ bám.
