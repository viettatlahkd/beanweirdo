# Sửa nội dung — hình dạng form theo module

Ghi chú bàn giao cho agent tài liệu. Xem thêm sổ bàn giao mục D11–D13.

## Luật mới — nhóm 15 "Ảnh và ô màu"

Sáu luật vào `frontend/src/content/logic.ts`:

- Ô ảnh không có ảnh thì là **hộp màu**, không tính là ảnh. Dàn trang giữ
  nguyên hình, ô chỉ đổi giữa ảnh và màu.
- Chú thích ảnh **không bắt buộc**; chú thích rỗng không chiếm chỗ, không vẽ nền.
- Ảnh tải lên luôn phủ kín ô, cắt phần thừa, căn giữa. Không kéo méo.
- Module thường tối đa **3 ảnh** — bản design v4 chỉ vẽ 3 ô, không có `shot4`.
- Ô Sửa nội dung của một module chỉ hiện những ô mà **chính module đó** dùng.
- Khung xem trước phải vẽ bằng **đúng thành phần dàn trang** của trang công khai.

## Vì sao có luật cuối

Ô ảnh ở Trang chủ co giãn theo bề rộng cửa sổ. Đo ở khung 1440px:

| Module | Ảnh 1 | Ảnh 2 | Ảnh 3 |
|---|---|---|---|
| sensory · band | 2.32 : 1 | 3.25 : 1 | 2.68 : 1 |
| roasting · sequence | 2.68 : 1 | 1.93 : 1 | 4.45 : 1 |
| biochem · specimen | 2.65 : 1 | 7.11 : 1 | 2.13 : 1 |

Không có tỉ lệ cố định để yêu cầu người dùng tải đúng, nên khung xem trước
dùng lại chính `ImageBand` của Trang chủ, thu nhỏ bằng `transform: scale`.

## Đổi tên ô

`blurb` → **Mô tả ngắn**, `long_desc` → **Mô tả dài**,
`layout_note` → **Ghi chú dàn trang**. Mỗi ô kèm một dòng nói nó hiện ở trang nào.

## Hình dạng form

Khai báo ở `frontend/src/admin/moduleForm.ts`. Module mới đi theo bảng này,
không sửa `Cms.tsx`.

| | module thường | Ghi 01 | Ghi 02 |
|---|---|---|---|
| Concept · Mô tả ngắn · Mô tả dài | có | không | không |
| Dàn trang · Treatment · Ghi chú dàn trang | có | không | không |
| Ảnh module (3) | có | không | không |
| Ảnh chân trang (2) | không | có | không |
| Ảnh feature F1–F7 | không | có | không |

Ghi 01 dùng lại cột `img1`/`img2` cho hai ảnh chân trang — không màn nào khác
đọc hai cột đó cho module đặc biệt, nên không cần migration.

## Ghi 02

Nhãn số bài đổi thành **"checkbox hàng ngày"**: trang này ghi tick theo ngày,
không bao giờ có bài. Nhãn cũ "chưa có bài — chưa hiện trên trang" cũng sai
với nhóm 05 — module đã tạo và công khai thì luôn hiện, kể cả chưa có bài.
Nay còn "chưa có bài".


## Đặt ảnh vào khung

Tải ảnh lên xong thì mở ngay một màn hình cho co kéo ảnh trong khung. Khung là
hình dạng thật của ô trên trang công khai, đo từ khung xem trước chứ không tra
bảng — nên không bao giờ lệch với cái trang vẽ.

Điểm neo lưu **trên chính URL ảnh** dưới dạng `#focus=x,y`, hai số phần trăm
đọc y như `background-position`. Mảnh `#` không được gửi lên máy chủ nên URL
vẫn tải đúng file, và giá trị đi qua mọi lớp đã sẵn mang URL ảnh — không thêm
cột, không migration, không có gì phải giữ đồng bộ. Xem
`frontend/src/lib/imageFocus.ts`.

Chỉ trục nào ảnh thừa ra mới kéo được: ảnh dọc bỏ vào ô ngang thì kéo lên
xuống, còn ngang thì đứng yên vì không có gì để lộ ra thêm.

## Lỗi công cụ dev đã sửa nhân tiện

`backend/scripts/dev-server.mjs` đọc cạn thân yêu cầu cho **mọi** route, kể cả
route khai báo `config.api.bodyParser = false`. `formidable` do đó chờ dữ liệu
đã trôi qua, nên **tải ảnh treo vô hạn ở máy local** — trên Vercel vẫn chạy vì
Vercel tôn trọng cờ đó. Nay máy chủ dev cũng tôn trọng.
