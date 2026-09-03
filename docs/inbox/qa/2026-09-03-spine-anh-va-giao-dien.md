# Ảnh và giao diện: một chiều cao, bốn thao tác, kéo để đổi chỗ

PR: #71    nhánh: spine/cms-20-anh    commit: điền sau khi merge
Cắt từ: origin/main @ 5ef0041
Nguồn: chủ site xem trang đã deploy trên màn dọc, báo layout bẹt và việc đặt ảnh
phải xoá đi thêm lại.

## [SỬA LỖI] Cùng một chiều cao viết ở ba nơi

Gốc của "layout bẹt" không phải một con số đặt sai mà là ba bản sao:

    frontend/src/design/tokens.ts       layout.band = 310   ← trang chủ
    admin/components/ModuleImages.tsx   310 viết thẳng      ← ô xem trước CMS
    screens/ModuleScreen.tsx            PLATE_HEIGHT.band = 208  ← ảnh đầu trang module

Hai trong ba đã lệch nhau 100px. Và vì ô xem trước giữ bản sao riêng, sửa trang
thì ô ấy đứng yên — **nó nói dối**, trong khi nó tồn tại để hứa cho thấy trang
sẽ ra sao.

Nay một token, ba nơi cùng đọc. Dải trang chủ **310 → 420** (từ ~3,6:1 xuống
~2,7:1), ảnh đầu trang module **208 → 280** (từ ~5:1 xuống ~3,75:1). Có test
chặn ba nơi khỏi lệch lần nữa.

Con số 420 là tôi chọn; đổi một chỗ là cả ba theo.

## [ĐỔI HÀNH VI] Ba màn đặt ảnh, cùng bốn thao tác

Ba màn từng ở ba mức hoàn thiện khác nhau:

    ảnh module      đổi ảnh · dán link · đặt vào khung · xoá
    ảnh trang chủ   đổi ảnh ·          · đặt vào khung · xoá
    ảnh mục lục     đổi ảnh ·          ·               · xoá

Nay cả ba đủ bốn. Thiếu một thao tác ở một màn là chỗ chủ site phải làm vòng
khác cho đúng một việc.

## [ĐỔI HÀNH VI] Kéo ảnh sang khung khác để đổi chỗ

Khung trên trang là cố định — mỗi khung một kích thước, một vị trí. Nên thứ cần
chọn không phải "chèn vào giữa" mà là *ảnh nào nằm ở khung nào*: kéo A sang B thì
hai bên đổi chỗ, **và chú thích đi theo ảnh của nó** — đổi ảnh mà bỏ chú thích
lại là gán nhầm lời cho hình.

Trước đó đổi thứ tự nghĩa là xoá rồi tải lại từng cái, và mỗi lần như vậy mất
luôn chú thích cùng điểm căn khung đã chỉnh.

Áp cho cả ba màn, dùng chung `admin/lib/useSlotSwap.ts`.

## Luật mới

A34–A36 trong `docs/spine/SO-BAN-GIAO.md`.

## Kiểm thử

`npm test` — 82 file, 809 test, xanh. Mới: 4 test cho phép kéo–đổi, 1 test chặn
ba nơi giữ chiều cao khỏi lệch nhau.

## Chưa làm

Long-form: đã rà xong, báo cáo gửi chủ site, chờ lệnh thứ tự. Nó cần đúng **một**
element mới (`formula`); `li`+`cont`, `h1–h4`, `p`, `fig`, `note`, `aside` đều đã
có trong kho. Câu chờ chủ site quyết: `cont` (159 khối trong bài đang đăng) là
dòng phụ của đoạn văn hay một element riêng.
