# Bốn template còn lại: màu, và quyền sửa cấu trúc

PR: #69    nhánh: spine/cms-18-templates    commit: điền sau khi merge
Cắt từ: origin/main @ c3c616a
Nguồn: bản rà soát năm template, chủ site duyệt hai việc đầu.

## [SỬA LỖI] Memo và Long-form mượn màu của module khác

Cùng loại lỗi chủ site bắt ở Report, nhưng nặng hơn một bậc: hai template này
không chỉ viết cứng màu của riêng chúng, mà viết cứng **màu của các module
khác**. Một bài Memo dưới sensory ra dải hồng, vạch mục xanh than của Practice,
chữ nhấn hổ phách của Roasting, và ba mốc pha xoay vòng hồng–xanh–hổ phách bất
kể bài thuộc đâu.

Nay mọi thứ hai template tô màu đều sinh từ màu bài. `paletteFrom` có thêm một
sắc thứ hai (`mid`) và hàm `shade`, vì có chỗ cần hai màu chữ khác nhau cho hai
vai — tiêu đề mục và chữ nhấn — mà trước đây là hai màu cố định của hai module.

Info cards **không** phải lỗi: màu nhóm hương là từ vựng cố định toàn hệ thống,
đúng luật A1. Article gần như không dùng màu module.

## [ĐỔI HÀNH VI] Article, Memo, Cards sửa được cấu trúc

Ba màn soạn này trước đây cho viết đè lên chữ đã có, và chỉ vậy — không thêm,
không xoá, không đổi chỗ. Một bài có đúng bấy nhiêu phần mà template mẫu chép
sang, vĩnh viễn; muốn viết đoạn thứ năm trong một bài article bốn đoạn thì không
có đường nào.

Nay cả ba dùng chung bộ tay nắm của Report: `⠿` ở lề trái kéo thả và nhận
Delete, mũi tên lên xuống cho bàn phím, nút nhân bản và xoá bên phải, nút thêm
ở cuối. Danh sách luôn giữ lại mục cuối cùng.

Cách nối: mỗi renderer nhận thêm hai móc — `wrapSection` / `wrapCard` bọc một
mục, và `renderAfterSections` / `renderAfterCards` cho nút thêm. Trang công khai
không truyền gì vào hai móc ấy nên vẽ y như cũ; chỉ màn soạn treo tay nắm lên.

Phép trên danh sách gom về `lib/listOps.ts` thay vì viết lại bốn lần: nâng ra
đặt vào chứ không đổi chỗ hai phần tử, chặn xoá mục cuối, và **sao chép sâu một
bậc** — sao chép nông thì bản sao dùng chung mảng con với bản gốc, sửa bản này
đổi luôn bản kia mà không có gì trên màn hình cho biết.

## [SỬA LỖI] Cards: đang lọc theo nhóm thì sửa nhầm thẻ

Vị trí trong danh sách **đã lọc** từng là chỉ số duy nhất, và nó được trao thẳng
cho ô sửa. Nên bật bộ lọc "Hoa" rồi đổi tên thẻ đầu màn hình là đổi tên thẻ đầu
của cả bài — một thẻ khác. Trạng thái gập/mở cũng lệch theo cùng một lý do.

Nay danh sách hiển thị mang theo vị trí thật của từng thẻ, và mọi thứ khoá theo
vị trí ấy. Có test bật bộ lọc, xác nhận bộ lọc thật sự lọc, rồi mới sửa.

## Luật mới

A24, A25, A26 trong `docs/spine/SO-BAN-GIAO.md`.

## Kiểm thử

`npm test` — 79 file, 770 test, xanh. Mới: 9 test cho phép trên danh sách, 13
test cho cấu trúc ba template, 2 test cho màu không rò sang module khác.

Đã soi bằng trình duyệt thật: cả ba màn soạn dưới module hồng — tay nắm, nút
thêm, nút nhân bản, nút xoá; và Memo/Long-form không còn vệt xanh than, hổ phách
hay xanh lá nào.

## Chưa làm — theo đúng thứ tự chủ site duyệt

Bước 3 (Long-form sửa được), bước 4 (ba khối mới + ghi chú cho bốn template),
bước 5 (hệ tag). Bước 5 còn chờ chủ site chọn giữa danh sách phẳng và tag có
nhóm.
