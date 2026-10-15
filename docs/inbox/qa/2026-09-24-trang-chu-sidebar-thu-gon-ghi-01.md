# PR #44 · nhánh `claude/project-thread-ecgg8y`

Bốn lỗi chủ site liệt kê ở trang công khai, phần trang chủ và sidebar.

## [SỬA LỖI] Trang chủ hiện tiêu đề mặc định rồi mới đổi sang tiêu đề của chủ site

**Tái hiện:** mở `/` khi `site_settings.data.lTitle2` là "inside the mind of
#hkd". Dòng xanh hiện "#viettatlahkd" (giá trị trong `SITE_DEFAULTS`) một nhịp
rồi mới đổi.

**Nguyên nhân:** `SiteCopyProvider` (`frontend/src/data/useSiteCopy.tsx`) khởi
tạo `overrides` bằng `{}`, nên khung đầu tiên vẽ bằng `SITE_DEFAULTS`.

**Tôi đổi:** `SiteCopyProvider` nhớ lần đọc gần nhất trong `localStorage`
(khoá `bw.siteCopy`) và khởi tạo từ đó; thêm trường `ready` (đã có câu trả lời
từ API, hoặc có bản nhớ). `Landing` ẩn khối tiêu đề (`visibility: hidden`, vẫn
giữ chỗ) khi `ready === false`. Lần vào đầu tiên: khối trống cho tới khi API trả
lời; các lần sau: đúng chữ ngay khung đầu.

Đo trong Chromium, API giả trả chậm 1,5s: trước khi trả lời khối trống, sau đó
hiện "inside the mind of #hkd"; tải lại thì hiện ngay.

## [SỬA LỖI] Logo bị cắt khi thu sidebar

**Nguyên nhân:** `Sidebar` vẽ logo cao 34px (rộng ≈56px) bắt đầu ở lề 22px,
trong khi thanh thu gọn rộng `layout.sidebarClosed` = 64px — phần 78−64 = 14px
bị cắt.

**Tôi đổi:** khi thu, logo cao 27px (rộng ≈45px) và lùi lề về 10px; mở ra thì
về 34px/22px, có chuyển động. Đo: thu 10→54,7px, mở 22→78,3px.

## [ĐỔI HÀNH VI] Mục con trong sidebar thu gọn là gạch ngang màu

**Trước:** module con thụt vào `15px × độ sâu` ở cả hai trạng thái, nên trên
thanh 64px chấm của nó lệch khỏi cột chấm của module cha.

**Sau:** `Row` nhận `collapsed`; khi sidebar thu, bỏ thụt, và `ModuleMark` với
`dash` vẽ một gạch 10×2px màu `accent` của module, cùng tâm với chấm tròn của
cha. Mở sidebar (hoặc ngăn kéo mobile) thì vẫn như cũ.

## [ĐỔI HÀNH VI] Ghi 01 kéo lên được, nằm xen giữa các module đọc

**Trước:** `byBandThenOrder` đặt mọi module `special` xuống dưới mọi module
`normal`; CMS từ chối kéo một nhật ký sang nhóm kia (toast "Nhật ký — luôn xếp
sau các module đọc").

**Sau:** thay bằng `bySiteOrder` (`frontend/src/lib/moduleOrder.ts`): chỉ xếp
theo `sort_order`, loại module chỉ dùng để phân xử khi hai module trùng số.
`Cms.tsx` bỏ `sameBand`/`BAND_RULE`; vẫn chặn **lồng** nhật ký vào module đọc
và ngược lại (`nestsAcrossKinds`, toast "Nhật ký và module đọc không lồng vào
nhau được"), vì nhật ký có trang riêng.

Hình dạng dấu vuông của nhật ký giữ nguyên. Trang chủ (`landingModules`) vẫn
không liệt kê nhật ký — không đổi.

**Hệ quả cần biết:** nếu `sort_order` đang lưu có nhật ký xen giữa (dữ liệu từ
trước khi CMS đánh lại 1..N), Ghi 01 sẽ hiện đúng chỗ con số ấy ngay sau khi
deploy. Kéo một lần trong `/ad-config` là số được đánh lại. Không đọc được dữ
liệu thật từ phiên này để kiểm trước.

## Test

- `Cms.moduleOrder.test.tsx`, `Cms.moduleTree.test.tsx`, `useModules.test.ts`,
  `Sidebar.tree.test.ts`: viết lại các ca về luật hai nhóm theo hành vi mới.

## Đã đụng

- Bảng `site_settings` (chỉ đọc, như trước), `modules` (đọc `sort_order`,
  `kind`; ghi qua `PUT /api/modules` như trước). Không migration.
- `localStorage` khoá mới `bw.siteCopy`.
