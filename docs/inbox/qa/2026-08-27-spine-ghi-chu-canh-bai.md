# Ghi chú cạnh bài — một element, hai nửa

PR: #65    nhánh: spine/cms-15-report-blocks    commit: điền sau khi merge
Cắt từ: origin/main @ 452ac7d
Thiết kế đã duyệt: bản demo `ghi-chu-canh-bai` (chủ site duyệt 27/08).

PR này gộp hai việc: bản vá cũ của #65 (mẫu Field report không vẽ ra) và toàn
bộ element ghi chú. Gộp vì việc sau sửa tiếp đúng chỗ việc trước chạm vào, và
tách ra là hai lượt build cho một vùng code.

## [ĐỔI HÀNH VI] Bảy luật mới

Đã ghi thành A8–A14 trong `docs/spine/SO-BAN-GIAO.md`. Tóm tắt để lane tài liệu
khỏi phải mở sổ:

- Ghi chú nằm trong `body`, là nội dung chứ không phải thuộc tính template.
- Hai nửa: Explorations (bullet liền nhau, về cả bài) và Field notes (mỗi cái
  neo vào một khối). Cả hai có sẵn từ lúc tạo; nửa nào trống thì không vẽ.
- Field notes neo vào `id` khối, nên đổi chỗ khối là ghi chú đi theo.
- Tên cột theo template, màu theo module, gọi tên một lần ở đầu cột.
- Xoá khối có ghi chú thì hỏi ghi chú đi đâu — bốn lựa chọn, tick là xong,
  hai giây để quay lại.
- Đoạn văn xoá hết chữ thì biến mất; khối có cấp bậc thì giữ chỗ, hiện chữ chìm.
- Tỉ lệ chia cột không lưu.

## [SỬA LỖI] Màn soạn vẫn đọc `body` thô

Commit của #65 viết rằng "cả trang template lẫn màn soạn bài đều đọc qua" bộ
dịch mới. **Trang template thì có, màn soạn thì không** — `ReportEditor` vẫn gọi
`getBody` thẳng, nên một bài bắt đầu từ mẫu Field report mở ra là một màn hình
hàng trống: nội dung có đủ, không thứ gì trên màn đó đọc được nó. Câu trong
commit ấy sai; nay màn soạn đọc qua `toReportBlocks` như trang template.

## [ĐỔI HÀNH VI] Nút ↑ ↓ thay bằng tay nắm

Mỗi khối có một tay nắm `⠿` ở lề trái. Rê vào nó hiện một dòng nói rõ nó làm
được gì: kéo thả để đổi thứ tự, Delete để xoá. Bàn phím làm được cả hai (mũi
tên lên/xuống, Delete), vì một tay nắm chỉ kéo được là tay nắm một nửa số người
không với tới. Bên phải khối thêm nút nhân bản.

## Tôi tự quyết ba chỗ — nói ra để chủ site bác nếu sai

1. **Explorations nằm ở chân cột, không phải đầu cột.** Bản demo vẽ nó ở đầu.
   Dựng thật thì hỏng: một hàng lưới cao bằng bên cao hơn, nên một chùm
   Explorations ở đầu giữ hàng đầu tiên mở toang và in một khoảng trống to bằng
   bàn tay cạnh dòng mở bài. Ở chân cột thì không có gì bên dưới để bị đẩy.
2. **Ghi chú đi theo khối khi kéo**, không nằm lại chỗ cũ — ghi chú là nói về
   đoạn ấy.
3. **Nhân bản khối thì nhân bản cả ghi chú.** Bản sao sinh ra để sửa thành thứ
   khác, và cái viết cạnh bản gốc là điểm khởi đầu tốt nhất cho việc đó.

## Chưa làm trong PR này

- **Bảng thêm cột / thêm dòng** đã có sẵn từ trước, chưa rà lại theo luật đã
  viết. Còn nợ.
- **Hai luật design system của Report**: chữ số cùng bề rộng đã sửa ở ô số
  liệu, nhịp khoảng cách mới chỉnh chỗ tiêu đề (26 → 20, thành 40 đúng thang
  8/20/40/64/96). Chưa rà hết trang.
- **Ghi chú cho bốn template còn lại.** Model và hàm dùng chung đã tách sẵn ở
  `packages/post-renderer/src/notes.ts`; mới có Report vẽ ra.

## Kiểm thử

`npm test` — 74 file, 684 test, xanh. Riêng phần này: 17 test cho model và
cách vẽ, 18 test cho các phép trên khối và ghi chú, 10 test cho màn soạn, 6
test mới trong `Editor.test.tsx`.

Ba test phải chờ đồng hồ thật hai giây một cái. Giả đồng hồ làm hỏng cơ chế
flush của testing-library, mọi cú bấm treo; cách còn lại là luồn độ dài hẹn giờ
qua component chỉ để test rút ngắn nó, và như vậy thứ được test không còn là
thứ chạy thật.

Đã soi bằng trình duyệt thật: màn soạn, hộp thoại xoá, đồng hồ hai giây, vạch
kéo cột, và trang Field report công khai.

## Không tạo dữ liệu thật

Chưa có bài nào dùng template report, mà tạo một bài để soi là ghi dữ liệu thật
— việc cần chủ site đồng ý. Tôi dựng một trang xem tạm trong worktree, soi xong
xoá đi. Không có commit nào chạm cơ sở dữ liệu.
