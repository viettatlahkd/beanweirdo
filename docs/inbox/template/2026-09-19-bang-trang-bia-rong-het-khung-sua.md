# Băng trang bìa rộng hết khung sửa

Nhánh: `claude/project-thread-ey2sz1`, cắt lại từ `origin/main` @ `8bd34c4`.
PR: chưa mở, đang đợi chủ site gật.

Nối tiếp `2026-09-19-o-trang-bia-va-dat-link-moi-o-anh.md` (PR #22, đã merge
@ `6e28a74`). Chỉ chạm hai tệp, đều của lane này.

---

## [SỬA LỖI] Băng trang bìa co lại còn 573px giữa khung sửa rộng 1320px

**Tái hiện:** mở một bài bất kỳ ở `/ad-post`, cửa sổ rộng. Băng "trang bìa"
đứng lệch hẳn về bên trái, rộng chưa tới một nửa khung sửa, trong khi phần
thân bài ngay dưới nó rộng hết. Chủ site gửi ảnh chụp màn hình: băng rộng
~573px, thân bài ~1320px.

**Nguyên nhân:** `CoverBand` để `width` mặc định là `auto` và đặt cùng lúc
`aspectRatio` (1200/628) với `maxHeight` (300). Khi bề ngang là `auto`, trình
duyệt suy nó **ngược lại** từ chiều cao đã bị chặn qua tỉ lệ:
300 × 1200/628 = 573. Không phải lỗi dàn trang của khung sửa — bản thân cái
băng tự tính ra bề ngang ấy.

**Đã sửa:** nói thẳng `width: '100%'` trong `CoverBand`. Bề ngang đã nói rõ thì
tỉ lệ chỉ còn việc tính chiều cao, và `maxHeight` cắt bớt chiều cao chứ không
kéo bề ngang theo.

## [ĐỔI HÀNH VI] Trần chiều cao của băng: 300 → 420

Đi kèm bản sửa trên, vì hai con số ấy chỉ có nghĩa cùng nhau.

**Trước:** `maxHeight: 300`. **Sau:** `BAND_MAX_H = 420`.

Giữ nguyên 300 thì ở khung sửa rộng 1320px băng thành 4.4:1 — một dải mỏng.
Bỏ trần đi thì tỉ lệ 1200/628 cho ra băng cao 690px, chiếm hết màn hình.
420 cho ra 3.1:1 ở bề ngang lớn nhất.

`BAND` (1200/628) vẫn còn và vẫn cầm lái ở cửa sổ hẹp (dưới ~800px), nơi trần
chưa chạm tới.

Chủ site: *"ảnh bìa phải hiển thị ngang ra ngang rộng bằng cái độ rộng của cái
màn edit"*, và *"thống nhất ảnh bìa như này cho dễ dùng"* — tức giữ nguyên cách
bày hiện tại (băng riêng ở trên đầu, ô ảnh bìa của template đứng giữ chỗ), chỉ
đổi kích thước.

Một bài kiểm mới trong `CoverBand.test.tsx` hỏi thẳng `style.width` và
`style.maxHeight`. jsdom không dựng dàn trang nên không tự tính ra chỗ này
được; hỏi thẳng thuộc tính đã sửa là cách duy nhất chặn lỗi quay lại.

## [SỬA LỖI] Chú thích đầu `CoverBand.tsx` nói sai từ PR #22

Nó viết *"trong màn sửa tấm ảnh hiện hai lần — một lần ở đây để đặt, một lần ở
dưới vì dưới là trang thật"*. Sai từ lúc PR #22 thêm `withoutHero` vào
`Editor.tsx`: ô ảnh bìa của template thôi vẽ ảnh, nên tấm ảnh hiện **một lần**.
Chú thích ấy tả đúng bản nháp đầu, cái bản chủ site bác bằng câu *"hiện 1 chỗ
thôi chứ?"*.

Cùng chỗ, nó đếm **hai** khuôn không vẽ ô ảnh bìa (`cards`, `report`). Thật ra
là **ba**: `grep -n hero packages/post-renderer/src/{Cards,Report,Longform}.tsx`
trả về rỗng cả ba.

Không đổi hành vi, chỉ sửa chữ. Ghi ra đây vì một chú thích sai ở đúng tệp giải
thích quyết định là thứ lần sau đọc vào sẽ tin.

## Bảng, cột và endpoint đã đụng

Không đụng gì. Không migration, không endpoint, không cột.

## Đối chiếu bộ luật (`frontend/src/content/logic.ts`)

- **15.4** — "khung cắt phải đúng hình dạng ô trên trang công khai". Bản sửa
  này **đổi hình dạng của băng**, mà khung cắt ảnh bìa đo chính cái băng ấy
  (`cellRatio` trong `PlateUpload.tsx`), nên khung cắt đổi theo: nay là ~3.1:1
  thay vì ~1.9:1. Chỗ lệch với 15.4 đã nêu ở ghi chú PR #22 vẫn y nguyên, không
  rộng thêm cũng không hẹp lại — băng vốn đã không phải một ô trên trang công
  khai.
- **15.1** — "ô ảnh không có ảnh thì là hộp màu". Băng rỗng vẫn là hộp màu
  `paper.hover` kèm chữ "chưa có ảnh trang bìa". Không đổi.

## Chưa nhìn tận mắt

`npm test` (135 tệp, 1375 bài, xanh) và `vite build`. `/ad-post` sau cổng đăng
nhập nên **chưa ai mở trình duyệt xem**. Hai chỗ đáng nhìn:

1. Băng ở cửa sổ hẹp (dưới ~800px): chỗ chuyển giữa "tỉ lệ cầm lái" và "trần
   cầm lái" chưa ai thấy bằng mắt.
2. Ảnh cao (ảnh dọc) đặt vào băng 3.1:1: `coverStyle` cắt trên dưới khá mạnh,
   và điểm căn cũ của những bài đã có ảnh bìa được chọn ở khung 1.9:1 — nên
   ảnh cũ có thể cần căn lại.

## Đề xuất luật

Không.
