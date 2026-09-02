# Bảng: thêm cột, thêm dòng, và cái nửa luật chưa ai làm

PR: #66    nhánh: spine/cms-16-tables    commit: điền sau khi merge
Cắt từ: origin/main @ a61592c

## [ĐỔI HÀNH VI] Luật 153 vốn chỉ được làm một nửa

`logic.ts` viết: *"Với report: bảng thêm được cột và dòng, **kéo được bề rộng
cột**."* Thêm cột và thêm dòng thì có từ lâu. **Kéo bề rộng cột thì chưa từng
tồn tại** — `ReportTable` không có chỗ nào lưu bề rộng, và trang vẽ bảng bằng
`table-layout: fixed`, nghĩa là mọi cột luôn bằng nhau. Một bảng có cột ngày và
một cột văn xuôi thì cột ngày thừa chỗ, cột văn xuôi ngắt dòng vụn.

Nay `ReportTable` có `widths` (phần trăm, theo thứ tự cột), kéo được ở màn soạn,
và trang đọc theo. Bảng viết trước khi có `widths` thì chia đều — không bài nào
phải sửa gì.

## [ĐỔI HÀNH VI] Bề rộng cột **có lưu** — khác vạch chia hai cột

Hai thứ trông giống nhau, hành xử ngược nhau, nên nói rõ:

- **Vạch chia bài / ghi chú** (#65): kéo được, **không lưu**. Nó là việc người
  soạn làm để nhìn cho rõ trong một phút.
- **Bề rộng cột trong bảng** (PR này): kéo được, **có lưu**. Nó là thuộc tính
  của bảng — người đọc phải thấy đúng tỉ lệ người viết chốt.

## [SỬA LỖI] Xoá được cột cuối cùng, và bảng biến mất

`removeColumn` không có chốt chặn nào. Xoá hết cột thì `columns: []`, mỗi hàng
thành `{ cells: [] }`, và trang vẽ ra một cái `<table>` rỗng — người viết nhìn
vào một khoảng trắng ở chỗ bảng của họ, không có gì phân biệt được bảng rỗng với
bảng đã bị xoá. Tương tự với hàng cuối. Nay cả hai đều giữ lại cái cuối cùng.

## [SỬA LỖI] Bảng ở màn soạn có một cột mà trang không có

Các nút điều khiển nằm **bên trong** bảng: một ô đầu bảng thừa chứa "+ cột", một
ô thừa trên mỗi hàng chứa "xoá hàng". Nghĩa là bảng đang soạn rộng hơn bảng sẽ
đọc đúng một cột, nên bề rộng người viết canh ở đây không bao giờ là bề rộng
người đọc thấy. Nay nút nằm ngoài bảng; xoá cột và xoá hàng là dấu `✕` hiện khi
rê chuột, giống các nút khác trong màn soạn.

## [SỬA LỖI] Hai luật design system Report đang phạm

- **Luật 02 — "Với mọi số liệu: dùng chữ số cùng bề rộng."** Ô số liệu đã sửa ở
  #65. Còn thiếu: ô bảng (`196°C`, `4:20`) và nhãn trục biểu đồ (`0:00`,
  `2:00`). Nay cả ba chỗ đều `tabular-nums`.
- **Luật 03 — "nhịp khoảng cách 8 / 20 / 40 / 64 / 96px."** Report đang dùng
  14, 18, 24, 26, 34, 140 — không con nào trên thang. Nay mọi khe giữa khối là
  20, đệm thân bài 44 trên / 96 dưới, dải màu 44 trên / 40 dưới. Có test chặn:
  mọi `margin` của mọi loại khối phải nằm trên thang.

## [ĐỔI HÀNH VI] Cột phụ 200–260px

`gridRules` viết cột phụ là 200–260px; cột ghi chú ở #65 đặt 190–262. Nay đúng
luật. **Không** làm sticky như luật ấy nói tiếp — ghi chú phải nằm ngang hàng
khối nó neo vào, sticky là đúng cho rail điều hướng của article chứ không đúng
ở đây. Nói ra để lane tài liệu biết đây là chỗ cố ý lệch, không phải bỏ sót.

## Luật mới

A15, A16 trong `docs/spine/SO-BAN-GIAO.md`.

## Kiểm thử

`npm test` — 75 file, 702 test, xanh. Mới: 11 test cho phép trên bảng, 8 test
cho bề rộng / chữ số / nhịp khoảng cách trên trang.

Đã soi bằng trình duyệt thật: kéo vạch cột trong màn soạn (33.3/33.3/33.3 →
43.9/22.8/33.3, cột thứ ba không đổi), và trang công khai đọc đúng `widths`.

Một lỗi bắt được lúc soi mà test không bắt: vạch kéo đặt ở mép **phải** ô trước
thì bị ô sau vẽ đè lên — kéo ra chọn chữ tiêu đề chứ không đổi bề rộng. Ô anh em
vẽ theo thứ tự, nên vạch phải nằm ở mép **trái** của ô sau. Không có test nào
thấy được chuyện này; chỉ có kéo thật mới thấy.

## Không tạo dữ liệu thật

Như PR trước: dựng trang xem tạm trong worktree, soi xong xoá.
