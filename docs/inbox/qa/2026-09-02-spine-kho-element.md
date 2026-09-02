# Kho element, và memo viết được

PR: #70    nhánh: spine/cms-19-element-store    commit: điền sau khi merge
Cắt từ: origin/main @ cf8cd9e
Nguồn: chủ site chốt cách nhìn — mọi template chỉ là một tập element được dàn
theo ý người dùng; element mới phải vào kho dùng chung, không hard-code riêng.

## [ĐỔI HÀNH VI] Một kho, khuôn lấy của WordPress

Trước: mỗi template ôm một ý riêng về thế nào là đoạn văn, bảng, danh sách. Cùng
một cái bảng viết ba lần dưới ba cái tên. Thêm một element là sửa bốn file mà chỉ
một template thấy.

Nay: `packages/post-renderer/src/elements/`. Khuôn khai lấy nguyên của WordPress
— `name · title · category · keywords · attributes · blank · View`. `attributes`
là chỗ ghi nhận format để tra cứu, `keywords` là đường tìm ra, `category` là chỗ
xếp cho lượt dàn trang sau.

Tên trùng chuẩn ở chỗ chuẩn có: `paragraph`, `heading`, `list`, `quote`, `table`,
`image`. Của riêng dự án thì khai cùng khuôn: `metrics`, `chart`, `callout`,
`meta`.

**Không** chạy Gutenberg. Cách vẽ giữ của mình — mỗi template ở đây là một cách
dàn trang có chủ ý, một bộ vẽ dùng chung sẽ san phẳng đúng thứ làm chúng đáng có.

## [ĐỔI HÀNH VI] Element mới: `list`

Ba nơi đang tự dựng danh sách theo ba kiểu: memo (`items` và `phases`),
long-form (`li` + `lvl`), cards (`callout.lines`). Nay một element: đánh số hoặc
không, dòng phụ chìm, lồng ba tầng.

## [ĐỔI HÀNH VI] Memo viết được

Trước lượt này màn soạn memo có **đúng năm ô**: tiêu đề, dòng dẫn, ba tên mục.
Gạch đầu dòng, mốc pha, bảng nếm, khối kết luận đều hiện trên màn mà không gõ
được, và `+ mục` tạo ra một mục không viết được gì vào.

Nay **34 ô**, cộng `+ dòng`, `+ dòng phụ`, `+ thêm khối`, `+ cột`, `+ hàng`.
Một mục memo là tên mục cộng một chuỗi element chèn được.

Đọc một chiều và không mất chữ: mục viết theo lối cũ được chuyển sang element
đúng thứ tự nó vẫn vẽ. Ghi thì **chỉ sinh ra `elements`** và bỏ bốn khoá cũ, nên
sau lần sửa đầu một mục chỉ còn một cách lưu chứ không phải hai cái cãi nhau.

Số mốc pha nay do template đánh, không phải người viết gõ — nên đổi chỗ một mốc
không còn phải sửa số bằng tay.

## [SỬA LỖI] Suýt nuốt định dạng của người viết

Memo đánh dấu nhận định bằng chữ nhấn giữa câu, và số đo bằng gạch chân mảnh. Ép
một dòng thành chuỗi phẳng để sửa sẽ nuốt cả hai, **lặng lẽ** — mở bài, sửa một
chữ, mất định dạng cả dòng mà không có gì trên màn hình báo.

Nên một dòng là các run, và ô chữ thường hiện chúng thành `chữ *được nhấn* chữ`,
`_số đo_`. Đi một vòng không mất gì. Sau này thay bằng bộ soạn thật thì format
lưu không phải đổi.

Hai test design của memo bắt được đúng chuyện này khi tôi làm hụt: số mốc mất
kiểu `01` và gạch chân bị rơi. Đã sửa cả hai.

## Luật mới

A27–A30 trong `docs/spine/SO-BAN-GIAO.md`.

## Kiểm thử

`npm test` — 80 file, 797 test, xanh. Chín khối của Report chuyển vào kho mà 102
test renderer xanh suốt, không đổi một pixel.

Đã soi trình duyệt thật trên bài memo `ỏ`: từ 5 ô gõ được lên 34, chữ nhấn hiện
đúng dạng `*...*` trong ô.

## Chưa làm

Long-form và info cards vẫn giữ hình dạng riêng — rà từng cái trước khi đụng,
đúng thứ tự chủ site nói. Thông số và ảnh bìa của memo vẫn ở cấp bài và chưa sửa
được; chúng là `metrics` với `image` trong kho rồi, chỉ chưa nối.
