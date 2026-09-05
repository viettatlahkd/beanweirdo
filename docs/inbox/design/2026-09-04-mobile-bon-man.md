# Bốn màn công khai xuống mobile

- Nhánh: `design/mobile-screens`
- Lane: design
- Ngày: 2026-09-04
- Cắt từ: `origin/main` (`a70d1ce`), sau khi mobile 1 (#83) merge

Bản thiết kế: canvas 14 artboard 390px, trong đó artboard "Sổ ghép mobile"
liệt kê đủ việc cần làm, neo bằng `file : tên hàm`.

---

## 1. Đã đổi những gì

### [ĐỔI HÀNH VI] Một ngưỡng cho cả trang — `global.css`

Trước có **hai** ngưỡng cho cùng một câu hỏi: `@media (min-width: 1240px)`
của `.bw-intro` / `.bw-modhead` (vào từ #78) và `layout.mobileMax` 899 mà
`lib/useIsMobile` đọc (vào từ #83). Ở khoảng 900–1239px hai hệ bất đồng:
lưới đã xếp chồng theo CSS trong khi lề và cỡ chữ vẫn là desktop theo JS.

Đổi `global.css` về `min-width: 900px`.

Trước: dưới 1240 thì `.bw-intro` xếp chồng, và liên kết "xem mục lục" nằm
trong cột phụ `minmax(110px, .3fr)`.
Sau: dưới 900 xếp chồng; cột phụ bỏ hẳn.

### [ĐỔI HÀNH VI] Bốn màn có nhánh mobile

Mọi thay đổi nằm sau `useIsMobile()`; nhánh desktop không đổi một giá trị nào.

- `screens/IndexScreen.tsx` : `Ledger`, `Columns`
- `screens/ModuleScreen.tsx` : `Band`, `Specimen`, `Sequence`, `ModulePlates`
- `screens/Landing.tsx` : `Landing`, `ImageBand`, `bandGrid`
- `screens/Notes.tsx` : `Notes`, `FeatureCellView`, và hàm mới `canTuck`

### [ĐỔI HÀNH VI] Trang chủ lấy mô tả ngắn khi hẹp

`screens/Landing.tsx` : `Landing` — dưới ngưỡng dùng `m.blurb` thay
`m.long_desc`. Bản dài của `sensory` là ~90 chữ; trên màn 390 nó đẩy dải ảnh
và danh sách "Mới nhất" xuống dưới hai màn cuộn.

### [ĐỔI HÀNH VI] Module chưa có bài hiện một dòng trạng thái

`screens/Landing.tsx` : `Landing` — trước chỉ còn tiêu đề "Mới nhất" trên một
khoảng trống. `roasting 101` đang ở đúng tình trạng ấy.

### [ĐỔI HÀNH VI] Ghi 01 có bảng vị trí riêng cho màn hẹp

`content/notes.ts` — thêm `notePlacementMobile` (8 vị trí bài) và
`featureMobile` (hình học 7 ô trang trí). **Bảng desktop không đổi một dòng.**
Lưới 12 cột mã hoá thứ bậc bằng chỗ đứng (`span 4`/`span 5`, lệch trên
0→150px, lệch trái tới -64px); ép về một cột thì thứ bậc ấy mất, nên bản hẹp
soạn lại chứ không co.

### [SỬA LỖI] Ảnh trang trí Ghi 01 nằm dưới chữ của bài

`screens/Notes.tsx` : `canTuck` (mới), `FeatureCellView`.

Tái hiện trước khi sửa: mở `/?screen=notes` ở bề ngang 390 với dữ liệu thật.
Ghi 01 đang có 1 bài, nên ô F1 lẽ ra kê cạnh P2 lại kê cạnh P1 — cả hai cùng
dạt trái, 72% + 42% = 114% — ảnh chui xuống dưới tiêu đề bài.

Nguyên nhân không phải sai số mà sai cách: margin âm cố định không đảm bảo
được gì khi chiều cao một bài đổi theo độ dài tiêu đề, và ô nào đứng liền
trước ô nào lại phụ thuộc module đang có mấy bài. `canTuck` tính lúc dựng từ
ô đứng trước thật: chỉ kéo lên khi hai ô khác bên **và** tổng bề rộng còn
trong một hàng; không thoả thì rơi về `mtSafe` dương.

### [SỬA LỖI] Đầu trang Ghi 01 chưa xuống mobile

`screens/Notes.tsx` : `Notes` — tiêu đề vẫn 118px trên màn 390. Lượt sửa
trước sót nguyên phần này; đo được khi mở trình duyệt. Nay 118→56, phụ đề
27→20, đoạn dẫn và thanh lọc xếp dọc.

### [SỬA LỖI] `prose.test.ts` không nhận ra dạng viết mới

Nới mẫu nhận diện, **không** nới điều kiện. Mẫu cũ chỉ thấy `{m.long_desc}`
trần nên không thấy `{mob ? m.blurb : m.long_desc}` — chỗ vẽ vẫn mang
`...prose` như luật đòi. Phần khẳng định giữ nguyên.

### Test mới

- `content/notes.mobile.test.ts` — bảng vị trí hẹp phải phủ trọn một dải.
  Thêm một vị trí bài cho desktop mà quên bản hẹp thì bài thứ chín rơi vào
  `undefined` và cả dải sau vỡ, không test nào khác thấy.
- `screens/Notes.tuck.test.ts` — `canTuck`, gồm đúng ca đã vỡ trên máy thật.

---

## 2. Mâu thuẫn với bộ luật

Ghi thẳng theo luật 6 của quy trình bàn giao. Ba chỗ, đều là mâu thuẫn thật
chứ không phải cách đọc khác.

**03.2 — "Trên mọi trang: đệm 56px hai bên."**
Bản sửa dùng **20px** khi dưới ngưỡng 900. 56px hai bên trên màn 390 để lại
278px cho chữ. Luật này viết cho một hệ chỉ có desktop, nay hệ có hai bề
ngang. Cần lane tài liệu quyết: luật nêu một con số, hay nêu hai theo ngưỡng.

**13.2 — "Với [[notes]]: rê chuột thì các note khác mờ đi."**
Trên điện thoại không có rê chuột nên vế này không bao giờ xảy ra. Bản sửa
**không** gỡ hành vi ấy — nó vẫn nguyên cho desktop. Nhưng luật đang phát
biểu như một điều luôn đúng, mà giờ nó chỉ đúng ở một nửa số bề ngang.

**05.4 — "Với sidebar: chìm ở 64px, chỉ mở rộng khi rê chuột."**
Không phải bản sửa này — mobile 1b (#83) đã đổi. Nêu ở đây vì PR này dựa lên
nó và luật vẫn chưa được cập nhật.

---

## 3. Bảng, cột, endpoint đã đụng

Không đụng cái nào. Không có migration, không thêm truy vấn, không đọc thêm
cột nào. Toàn bộ thay đổi nằm ở tầng vẽ.

Có **đọc** dữ liệu thật qua REST lúc dựng bản thiết kế (`modules`, `posts`,
`notes`) để artboard mang nội dung thật — chỉ đọc, không ghi.

---

## 4. Đã kiểm những gì

- `npm test` — 94 file, **939 test xanh**, 0 lỗi typecheck.
- `npx vite build frontend` — xanh.
- Mở trình duyệt thật ở **390×844**, dữ liệu thật: Trang chủ · Mục lục ·
  Ghi 01. Cả ba `document.documentElement.scrollWidth` = 390 = `innerWidth`,
  không màn nào tràn ngang.
- Đo tận nơi sau khi sửa: liên kết "xem mục lục" từ 110px → 350px; tiêu đề
  Ghi 01 từ 118px → 56px; ô F1 từ chỗ đè lên chữ → nằm trọn dưới bài
  (y 737–933).

**Chưa kiểm:** màn Module chưa mở trình duyệt xem (không có deep link
`?screen=` tới trang module; phải bấm qua Trang chủ). Ba layout của nó chỉ
được chứng minh bằng test và bằng số đo trong mã.

---

## 5. Đề xuất luật — để lane tài liệu quyết, không phải kết luận

1. **03.2** nên nêu hai con số theo ngưỡng, hoặc nêu ý (“một lề, hai giá trị
   theo bề ngang”) thay vì nêu 56px như một hằng số.
2. Cân nhắc một luật mới cho nhóm 03: **cả trang có đúng một chỗ gãy, ở
   900px.** Hôm nay repo từng có bốn con số cho cùng một câu hỏi — 560, 860,
   899, 1240. Hai cái đầu là của `components/StatsPanel.tsx` và trả lời một
   câu hỏi khác (“khi nào ô này đủ chỗ đứng cạnh ô kia”), nên để nguyên;
   hai cái sau đã gộp trong PR này.
3. Những luật phát biểu về **rê chuột** (13.2, và 05.4 sau #83) nên nói rõ
   phạm vi bề ngang, hoặc nêu kèm cử chỉ tương ứng khi chạm.
