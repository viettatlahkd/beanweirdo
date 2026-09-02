# Bảng: thêm cột, thêm dòng, và cái nửa luật chưa ai làm

PR: #67    nhánh: spine/cms-16-tables    commit: điền sau khi merge
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

## [ĐỔI HÀNH VI] Explorations trở lại đầu cột — và lần này đúng cách

Bàn giao của #65 nói tôi tự quyết đưa Explorations xuống **chân** cột, vì đặt ở
đầu thì hàng lưới đầu tiên cao bằng chùm bullet và in ra một khoảng trống to
cạnh dòng mở bài. Chủ site bác: hai bên phải giống nhau, và người soạn không
nên phải kéo xuống cuối mỗi lần muốn thêm một dòng.

Cách né ấy sai. Lỗi thật không phải chỗ đặt Explorations mà là **mỗi khối một
hàng lưới**. Nay cột được cắt theo *đoạn*: một đoạn mở ra ở khối có ghi chú và
chạy tiếp qua mọi khối không có, nên ô chứa ghi chú vẫn bắt đầu đúng chỗ khối
của nó bắt đầu — vẫn ngang hàng, vẫn không đo đạc gì lúc chạy — còn hàng thì cao
bằng cả cụm khối phía sau, tức là đúng chỗ mà Explorations cần.

Kèm theo: **nút thêm ghi chú chuyển về chính khối** (`✎` cạnh nhân bản và xoá),
thay cho ô mờ "+ ghi chú" trong lề. Ghi chú một khối là việc làm với khối đó,
nên nút nằm ở đó — không phải một chỗ mờ trong lề phải đi tìm. Nút thêm
Exploration nằm ngay dưới danh sách Explorations, ở đầu cột.

## [SỬA LỖI] Bài dưới module hồng vẫn vẽ bảng màu xanh

Chủ site thấy: tạo bài dưới `sensory` thì dải đầu trang ra hồng, nhưng chữ tiêu
đề cột bảng vẫn xanh dương. Đúng — `#6FA8C0`, màu riêng của mẫu Field report,
được viết cứng vào bốn chỗ: cột biểu đồ, chữ tiêu đề cột bảng, nền ảnh, và chú
thích ảnh. Chỉ có dải đầu trang biết bài thuộc module nào.

Nay có `paletteFrom` — một màu vào, một bộ ra: `accent` (cột biểu đồ, gờ, nhãn
in hoa), `onAccent` (chữ nằm trên nó), `ink` (cùng tông, đủ đậm để đọc trên nền
kem), `tint` (nền nhạt cho ảnh và khối nhấn), `edge` (gờ mảnh). Các sắc phái
sinh **giữ nguyên tông, chỉ đổi độ sáng**, nên màu module vẫn nhận ra được ở mọi
độ đậm nhạt thay vì trôi sang màu khác khi nhạt đi.

Cả trang lẫn màn soạn đọc cùng bộ ấy.

## [ĐỔI HÀNH VI] Ba loại khối mới

- **Tiêu đề ba cấp.** H1 / H2 / H3, chọn bằng ba nút hiện khi rê chuột. Cấp 3
  mang màu module, để phân cấp bằng màu chứ không chỉ bằng vài điểm cỡ chữ.
  Tiêu đề viết trước khi có cấp thì là cấp 1 — không bài nào phải sửa.
- **Khối nhấn** — nền nhạt màu module, gờ trái đậm, có nhãn tuỳ chọn.
- **Trích dẫn** — dấu ngoặc kép do template in, người viết không gõ; có dòng
  nguồn tuỳ chọn.

## Chưa làm — trường theme color

Chủ site còn muốn: thêm một trường **theme color** ở "+ bài mới"; bài thuộc
module thì mặc định lấy màu module và cho sửa; bài thuộc module đặc biệt như
Ghi 01 thì cho chọn trong danh sách theme có sẵn hoặc tự thêm.

Việc đó cần một cột mới trong bảng `posts`, tức là một migration chủ site phải
tự chạy — nên tách sang PR riêng để migration đứng một mình, dễ soi và dễ lùi.
Bộ sinh màu ở PR này chính là thứ trường ấy sẽ dùng: đổi một dòng, từ "lấy màu
module" sang "lấy màu bài, mặc định là màu module".

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
