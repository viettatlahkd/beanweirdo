# Kéo đổi thứ tự module: viết một đằng, đọc một nẻo

- Nhánh: `claude/project-thread-r3z436`
- PR: (điền khi mở)
- Lane: Thiết kế (nút/toast/icon khu quản trị)

Chủ site: *"hiện tại đổi chỗ các module ở đây nó không đổi chỗ ở trang chủ và
đổi chỗ ở cột dọc bên trái. sửa đi để nếu đổi vị trí thì vị trí các thứ nó cũng
phải đổi theo."*

Hai lỗi riêng biệt, cộng lại thành một triệu chứng.

## [SỬA LỖI] Thanh bên và Trang chủ không bao giờ hỏi lại

`data/useModules.tsx`, hàm `useModulesQuery`: nó đọc thẳng Supabase đúng **một
lần** lúc `ModulesProvider` dựng. `Cms.tsx` thì ghi qua API quản trị và gọi
`forgetModules()` — nhưng `forgetModules` nằm ở `admin/lib/lists.ts` và chỉ xoá
cache **phía quản trị**. Không có gì nối hai đường, nên kéo xong, thanh bên ngay
cạnh vẫn vẽ thứ tự cũ cho tới khi tải lại cả trang.

Đã thêm `data/modulesChanged.ts` — một tệp không phụ thuộc gì, giữ một `Set`
watcher, xuất `watchModules` và `modulesChanged`. `forgetModules` nay gọi
`modulesChanged()`, còn `useModulesQuery` nghe và tăng `epoch`, thứ nằm trong
mảng phụ thuộc của effect đi hỏi.

Chọn móc vào `forgetModules` chứ không rải lời gọi ở từng chỗ ghi: bốn chỗ ghi
module trong `Cms.tsx` (`patchModule`, `dropModule`, tạo, xoá) **đã** gọi
`forgetModules` rồi, nên không có chỗ nào bị quên.

Lượt hỏi lại cố ý **không** bật `loading`: nó chạy ngay trước mắt người đang
nhìn thanh bên, mà xoá trắng danh sách một nhịp thì trông như hỏng.

## [ĐỔI HÀNH VI] Danh sách module trong CMS xếp theo thứ tự site đọc

`byBandThenOrder` (trước ở `data/useModules.tsx`) xếp mọi module `special` —
Ghi 01, Ghi 02 — xuống dưới mọi module `normal`. `landingModules`,
`indexModules` và `sidebarModules` đều dùng nó.

`Cms.tsx` thì bày phẳng theo `sort_order`. Với dữ liệu thật hôm nay, CMS đánh số
`04 Ghi 01` · `06 tư duy tư duy`, còn thanh bên vẽ `tư duy tư duy` rồi mới tới
`Ghi 01`. Kéo Ghi 01 lên một bậc là đổi một con số không ai nhìn thấy.

Nay hằng `shownModules` trong `Cms.tsx` xếp bằng đúng `byBandThenOrder`, và
`dropModule` ghi 1..N **lên thứ tự vừa bày ra** chứ không lên mảng `modules`
thô. Việc ấy cũng chữa luôn dữ liệu cũ: ghi xong hai nhóm nằm liền khối, nên
`byBandThenOrder` không còn phải xáo gì nữa.

Cùng lỗi với chỗ `postsOf` đã ghi trong chính tệp ấy: một tay cầm sắp xếp lại
một danh sách không phải danh sách trên trang.

## [ĐỔI HÀNH VI] Không kéo được nhật ký xen vào giữa các module đọc

`sameBand` trong `Cms.tsx`. `onDragOver` không vẽ vạch chỉ chỗ, `dropModule`
không ghi gì.

Vì luật kia vẫn còn: thả được thì cũng chỉ ghi ra một con số mà trang bỏ qua,
và thẻ bật về chỗ cũ ở lần tải sau. Từ chối thẳng đỡ hơn là giả vờ nhận.

Để người kéo biết vì sao, lời từ chối nói ra bằng một toast: hằng `BAND_RULE`
trong `Cms.tsx`, nội dung **"Nhật ký — luôn xếp sau các module đọc"**, đẩy qua
`toast.info` ngay trong `dropModule`.

Bản đầu để nó là một dòng nhãn đứng thường trực giữa hai nhóm. Chủ site bác:
*"đừng đẻ nhãn... mỗi khi kéo thì hiện toast đi."* Đúng — một dòng chữ đứng đấy
suốt thì giải thích cho tất cả mọi người trừ đúng người vừa vấp phải nó.

## [SỬA LỖI] `byBandThenOrder` chuyển sang `frontend/src/lib/moduleOrder.ts`

Nó vốn là hằng riêng tư trong `data/useModules.tsx`. `Cms.tsx` cần đúng luật ấy,
mà import từ `data/useModules` thì kéo theo cả Supabase client vào khu quản trị.
Nay nó nằm ở `lib/moduleOrder.ts`, cạnh `lib/postOrder.ts`; `data/useModules`
import rồi xuất lại nên mọi chỗ gọi cũ không đổi.

## Bảng, cột và endpoint đã đụng

- Bảng `modules`, cột `sort_order` và `kind` — chỉ **đọc** thêm `kind` ở phía
  CMS để xếp và để chặn kéo chéo nhóm. Không thêm cột, không migration.
- `PUT /api/modules` — không đổi. Vẫn nhận mảng id và ghi `sort_order` 1..N.
  Chỗ đổi là **mảng id mà CMS gửi lên**.
- Đường đọc công khai `supabase.from('modules').select('*').order('sort_order')`
  — không đổi, chỉ được gọi lại khi có tín hiệu.

## Đối chiếu ngược với bộ luật

`frontend/src/content/logic.ts` nhóm **05** nói sidebar xếp "thường trước đặc
biệt". Bản sửa này **giữ** luật ấy, và làm cho khu quản trị nói thật về nó thay
vì để người dùng phát hiện bằng cách thẻ bật về chỗ cũ. Không mâu thuẫn luật nào.

Nhóm 05 vẫn còn nợ tài liệu từ trước (đường dẫn ba chặng cố định) — không phải
việc của bản sửa này, xem `docs/spine/tree-02`.

## Kiểm

- `npm test`: 134 tệp, 1366 bài xanh, 2 bỏ qua. `vite build` từ `frontend/`: xanh.
- `frontend/src/data/modulesRefresh.test.tsx`, ba bài: hỏi lại và trả về thứ tự
  mới; không xoá trắng danh sách khi hỏi lại; hook đã gỡ thì thôi hỏi.
  **Không đỗ vống**: bỏ `epoch` khỏi mảng phụ thuộc thì bài đầu đỏ.
- `frontend/src/screens/Cms.moduleOrder.test.tsx`, năm bài, dựng màn thật rồi
  `dragStart`/`dragOver`/`drop`. Dữ liệu dựng cố ý xen kẽ `kind` đúng như dữ
  liệu thật hôm nay.
  Dựng trong `ToastProvider` thật, không giả toast: chỗ cần kiểm là chủ site có
  đọc được lời từ chối hay không.
  **Không đỗ vống**: đổi `shownModules` về `modules` thì hai bài đỏ; bỏ nhánh
  `if (!sameBand(...))` thì một bài đỏ; bỏ riêng dòng `toast.info(BAND_RULE)`
  thì cũng một bài đỏ.

## Chưa ai nhìn tận mắt

Cả ba đều cần chủ site mở site thật:

1. Kéo một module đọc trong CMS rồi **không tải lại**, nhìn thanh bên đổi theo.
2. Kéo Ghi 01 lên trên: không có vạch chỉ chỗ nào hiện ra, và toast "Nhật ký —
   luôn xếp sau các module đọc" bật lên.
3. Trang chủ: nó chỉ bày module `normal` ở tầng gốc, nên kéo nhật ký không bao
   giờ đổi gì ở đó — đúng thiết kế, không phải lỗi.

## Đề xuất luật

Không có.
