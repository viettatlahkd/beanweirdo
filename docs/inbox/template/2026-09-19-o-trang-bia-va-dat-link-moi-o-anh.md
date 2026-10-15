# Ô trang bìa ở đầu khung sửa, và đặt link được ở mọi ô ảnh

Nhánh: `claude/project-thread-ey2sz1`, cắt lại từ `origin/main` @ `9362e6c`.
PR: chưa mở, đang đợi chủ site gật.

Nối tiếp `2026-09-19-khung-cat-anh-va-anh-trong-man-sua.md` (PR #20, đã merge
@ `9dceca9`). Chạm `packages/post-renderer/src/plates.tsx` — tệp lane Kiến
trúc. Không đụng `Cms.tsx` hay ba tệp `Cms.*.test.tsx` mà lane Thiết kế vừa
viết lại ở PR #21.

---

## [ĐỔI HÀNH VI] Thanh đặt ảnh ở đầu khung sửa bỏ hẳn

**Trước:** `MediaBar` vẽ một dòng chữ cho mỗi chỗ đặt ảnh — "ảnh bìa: tải ảnh
lên – đặt link – đặt vào khung – xoá", cộng một dòng "ảnh body 1" cho bitesize
— kèm một ô xem trước hình cắt 172×130.

**Sau:** bỏ. `MediaBar`, `MediaSlot`, `MediaSlotSpec`, `slotLinkStyle` và mảng
`mediaSlots` trong `EditorContent` đều xoá.

Chủ site: *"bỏ cái phần này đi vì giờ ảnh như nào là có nút hết rồi"*, và sau
đó *"nghĩ cách đi phải bỏ bắt buộc nhé"* khi được báo là `cards` với `report`
sẽ mất đường đặt ảnh bìa.

Bốn việc của nó đi đâu:

| Việc | Chỗ mới |
|---|---|
| tải ảnh lên · đặt link · đặt vào khung · gỡ | góc mỗi ô ảnh (`PlateUpload`), và băng "trang bìa" cho ảnh bìa |
| ô xem trước hình cắt 172×130 | hai ô xem trước bên trong khung cắt (`FocusPicker`, tham số `previews`) |
| dòng "ảnh body 1" của bitesize | nút ở góc chính ô ấy |

## [ĐỔI HÀNH VI] Mọi ô ảnh đặt link được

**Trước:** `PlateUpload` có hai nút — tải ảnh lên, và gỡ. Đặt link thì đúng một
chỗ trong cả sáu khuôn làm được, là dòng "ảnh bìa" của `MediaSlot`.

**Sau:** bốn nút, đúng bốn việc của thanh cũ. Chủ site: *"lấy cái logic của cái
chỗ [đặt link] hiện tại thêm vào tất cả các ảnh bên cạnh button tải lên và
xoá"* — nên lối thao tác giữ y nguyên: bấm nút hiện một ô nhập, dán địa chỉ rồi
Enter, Esc hoặc rời ô thì bỏ.

Hai điều đáng ghi:

- **Ô nhập neo bằng `position: fixed`, không phải `absolute`.** Nhiều ô ảnh có
  `overflow: hidden` — ô phương tiện của bitesize chẳng hạn, vì clip nằm phủ
  kín ô — nên một ô nhập `absolute` bên trong bị cắt mất và bấm nút xong không
  thấy gì. `fixed` thì không ai cắt được, đổi lại `PlateUpload` phải tự đo chỗ
  neo lúc mở (`linkAt`).
- **Nút "đặt vào khung" vắng mặt khi ảnh bìa là clip.** Khung cắt vẽ bằng
  `background-image` nên không vẽ được clip. `HeroActions.reframe` để
  `optional` và `EditorContent` chỉ đặt nó khi `heroIsClip` là false. Một cái
  nút bấm vào không xảy ra gì còn tệ hơn là không có nút — `Editor.mount.test.tsx`
  giữ đúng bài kiểm cũ cho điều này, chỉ hỏi ở chỗ mới.

Hai icon mới trong `frontend/src/design/icons.tsx`: `IconLink`, `IconCrop`.
Tệp ấy thuộc lane Thiết kế; đây là thêm hai export, không sửa cái nào có sẵn.

## [ĐỔI HÀNH VI] Ảnh bìa đặt ở một băng ngang trên đầu, giống nhau ở sáu khuôn

**Trước:** ảnh bìa đặt qua dòng chữ ở đầu khung sửa, và hiện ở ô ảnh bìa mà
template vẽ — article là dải dọc rộng 300px bên phải, memo là băng ngang,
bitesize là ô ăn theo hình tấm ảnh. `cards`, `report`, `longform` không vẽ ô
nào.

**Sau:** `frontend/src/admin/components/CoverBand.tsx` — mới. Một băng tỉ lệ
1200/628, rộng hết khung sửa, trên đầu, nhãn "trang bìa", mang đủ bốn nút và
nhận cả thả tệp. Có mặt ở **cả sáu khuôn**.

Và ô ảnh bìa mà template vẽ **không vẽ ảnh nữa trong màn sửa**: `withoutHero`
trong `Editor.tsx` truyền vào bộ chuyển đổi một bản `post` với
`hero_image_url: null`, nên ô ấy đứng giữ chỗ ở dạng mảng màu. Article, memo và
bitesize đều thôi truyền `renderPlateAction` cho ô `hero`.

Chủ site chốt hai câu, theo thứ tự:

1. *"hiện 1 chỗ thôi chứ?"* — khi được báo là ảnh bìa sẽ hiện hai lần.
2. *"B thôi — chỉ là trong màn sửa thì nó hiển thị thế để có chỗ đẩy ảnh lên và
   quy chuẩn thôi, còn nó như nào thì phải click xem trước"* — khi được hỏi
   thẳng giữa **A** (đổi dàn trang cả sáu template, ảnh bìa thành băng ngang
   trên đầu bài ở cả trang đã đăng) và **B** (chỉ đổi màn sửa).

Nên **trang đã đăng không đổi một pixel**, đúng ràng buộc chủ site đặt ngày
2026-09-18. Đổi lại, khung sửa cố ý không còn giống hệt trang thật ở **đúng một
chỗ**: ô ảnh bìa. Đây là ngoại lệ có chủ, không phải một chỗ quên — và cách
biết ảnh bìa thật sự trông ra sao là bấm "xem trước".

Bỏ `hero_image_url` chứ không bỏ hình dạng: dàn trang của bitesize ăn theo
`body.media` với `body.portrait` (`frameOf` trong `lib/mediaShape.ts`), không
ăn theo địa chỉ ảnh, nên ô ảnh giữ đúng khổ nó sẽ có.

## [SỬA LỖI] Khung cắt ảnh bìa ghi cứng 172×130 cho mọi khuôn

**Tái hiện:** mở một bài bitesize, tải ảnh bìa lên. Hộp thoại hiện ra ghi "ảnh
bìa · hiện ở danh sách bài trong module" và bày một khung 1.32:1 — hình cắt ở
danh sách module — trong khi ô ảnh đang nhìn có hình dạng hoàn toàn khác. Chủ
site: *"tại sao vẫn còn toast kiểu này trong bài bitesize?"*.

**Nguyên nhân:** `frameHero` trong `Editor.tsx` truyền `ratio: 172 / 130` cố
định.

**Đã sửa:** `frameHero(url, ratio)` nhận hình dạng thật, đo từ trang lúc bấm
nút (`cellRatio` trong `PlateUpload.tsx`). Hai hình cắt của danh sách module
xuống làm ô xem trước. Thả tệp thẳng lên trang thì không có ô nào để đo nên mới
quay về 172/130.

Luật **15.4** nói khung phải "đúng hình dạng ô trên trang công khai" — nên đây
là *sửa lỗi*, specs không đổi. Lưu ý: nay ô ấy là **băng trang bìa**, mà băng
không phải một ô trên trang công khai. Đó là hệ quả của lựa chọn **B** ở trên,
và là chỗ duy nhất bản sửa này **lệch** với 15.4 — nói thẳng ra đây thay vì để
im.

## [SỬA LỖI] `PlateCorner` vẽ một cái góc rỗng khi móc trả về `null`

`PlateCorner` trong `packages/post-renderer/src/plates.tsx` chỉ trả `null` khi
**không có** móc. Móc trả về `null` thì nó vẫn dựng một `div
data-plate-corner`, rỗng.

Chưa ai nhìn thấy trên màn hình vì cái div ấy rỗng, nhưng nó đếm được: bản kiểm
kê ô ảnh trong `Editor.plates.test.tsx` vẫn thấy `hero` sau khi article thôi
vẽ nút cho ô ấy. Nay đo chính thứ móc trả về.

## Bảng, cột và endpoint đã đụng

Không thêm, không đổi cột nào. Không migration nào. `POST /api/upload` và
`PATCH /api/posts/:id` dùng lại y nguyên.

## Đối chiếu bộ luật (`frontend/src/content/logic.ts`)

- **15.4** — "tải ảnh lên xong thì mở ngay màn đặt ảnh vào khung, với khung
  đúng hình dạng ô trên trang công khai". Vế đầu: giữ. Vế sau: **mâu thuẫn một
  nửa**, xem mục trên.
- **15.7** — "khung xem trước phải vẽ bằng đúng thành phần dàn trang của trang
  công khai, không vẽ lại". Khung sửa vẫn vẽ bằng đúng thành phần ấy; chỉ ô ảnh
  bìa là không nhận ảnh. Trang **xem trước** (`Preview.tsx`) không đụng tới nên
  luật này còn nguyên ở chỗ nó nói.
- **15.1** — "ô ảnh không có ảnh thì là hộp màu, không tính là ảnh. Dàn trang
  giữ nguyên hình". Đúng cái ô ảnh bìa làm trong màn sửa.

## Chưa nhìn tận mắt

`npm test` (133 tệp, 1366 bài, xanh) và `vite build`. `/ad-post` sau cổng đăng
nhập nên **chưa ai mở trình duyệt xem**. Bốn chỗ đáng nhìn:

1. Băng trang bìa trên màn hẹp: nó có `aspectRatio` 1200/628 và `maxHeight:
   300`, hai thứ ấy đánh nhau ở bề ngang lớn.
2. Ô dán link `fixed`: nó neo theo `getBoundingClientRect()` lúc mở, nên cuộn
   trang trong lúc ô đang mở thì nó đứng yên còn nút chạy đi.
3. Ô ảnh bìa rỗng trong màn sửa của article: một dải dọc mang chữ "chưa có
   ảnh" dù bài đã có ảnh bìa. Đúng thiết kế, nhưng là chỗ dễ đọc thành lỗi.
4. Memo: ô ảnh bìa **vắng hẳn** trong màn sửa (Memo chỉ dựng khối ấy khi có
   ảnh), nên khung sửa memo ngắn hơn trang thật đúng một khối.

## Đề xuất luật

Nhóm 15 nên có một câu tách hai khái niệm đang bị gộp: **chỗ ĐẶT ảnh bìa** và
**chỗ ảnh bìa RƠI VÀO**. Luật 15.4 hiện giả định hai thứ là một ("khung đúng
hình dạng ô trên trang công khai"), mà quyết định của chủ site hôm nay tách
chúng ra: một chỗ đặt duy nhất cho sáu khuôn, còn chỗ rơi vào thì mỗi khuôn một
kiểu và chỉ nhìn thấy ở trang xem trước.
