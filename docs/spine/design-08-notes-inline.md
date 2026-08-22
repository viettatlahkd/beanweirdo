# spine/design-08-notes-inline · Ghi 01 xổ bài tại chỗ

nhánh: spine/design-08-notes-inline   base: origin/main

## Đã đổi
- [ĐỔI HÀNH VI] Bấm một bài ở Ghi 01 nay **xổ toàn bộ bài ngay trong trang**,
  không chuyển sang trang riêng. Bấm lại hoặc bấm ra ngoài thì thu.
- Khi mở, bài chiếm cả 12 cột của lưới; các mục khác mờ còn 0.18 như ghi chú rời.
- Bài được vẽ bằng **chính bộ vẽ của template nó**, kèm dải màu của Ghi 01.

## Vì sao làm vậy
Chủ site yêu cầu. Lưu ý: **design v4 nói ngược lại** — ghi chú có trường `sc`
thì chuyển màn (`toggle: e => { if (n.sc) { setState({ screen: n.sc }) ... } }`),
và bài `taste modality` có `sc: 'taste'`. Đây là lệch **có chủ ý**, không phải
tai nạn.

Mẫu để bắt chước có sẵn trong chính hệ này: `statsOpen` ở Ghi 02 xổ cả bảng
thống kê trên nền trang Ghi 02 thay vì mở trang mới.

Ba bản design cũ (base, v2, v3) không giúp được: chúng **không có** Ghi 01 hay
Ghi 02, và mở bài thì `setState({ screen: 'article' })` — chuyển màn hẳn.

## Hệ quả bố cục — cần chủ site nhìn
Bài mở ra chiếm 12 cột nên **buộc phải xuống hàng mới**. Với ba bài, mở bài
giữa thì hai bài kia dồn lên một hàng, còn bài đang mở nằm **dưới cả hai** —
tức nó rời khỏi đúng vị trí nó vừa đứng. Đã chụp màn hình.

Nếu muốn nó mở ngay tại chỗ đang đứng thì phải đổi cách xếp lưới, không chỉ
đổi số cột.

## Hệ quả chưa xử lý
Màn `isTaste` trong design giờ **không có đường nào tới** từ Ghi 01. Nó vẫn
còn trong file design. Cần chủ site quyết bỏ hay giữ cho lối vào khác.

## Đụng dữ liệu
Không đổi schema, không đổi endpoint.

## Đụng luật
Nhóm 07 luật 1 nay **đúng với code** — trước đó code lệch khỏi nó.

## Kiểm chứng
Trên máy, bài `taste modality: sơn la`: bấm vào thì đường dẫn vẫn ở Ghi 01,
dải màu `#6FA8C0` hiện ra, bảng nếm và toàn bộ thân bài xổ trong trang, chân
trang Ghi 01 vẫn nằm dưới. 270 test xanh.
