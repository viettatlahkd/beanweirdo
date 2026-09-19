# Bộ nút cho ba màn quản trị

- **Nhánh:** `claude/project-thread-r3z436`
- **PR:** chưa mở — chờ chủ site duyệt.
- **Phạm vi:** `frontend/src/screens/Cms.tsx`, `frontend/src/admin/`, `frontend/src/design/`.
  Không đụng trang công khai, không đụng `packages/post-renderer`.

Chủ site báo: ở `/ad-post`, `/ad-page-content`, `/ad-sitemap` nhiều nút "không hiển
thị là button mà lại là chữ, click vào chữ thì mới được".

---

## Đo trước khi sửa

Đếm bằng cách duyệt mọi thẻ mang `onClick` trong `Cms.tsx` và 8 component ở
`admin/components/`. Ba màn kia đều là cùng một màn `Cms` (xem `routes.ts:cmsTabs`),
chỉ khác tab, nên số đếm là chung.

| | Số |
|---|---|
| Tổng số nút | 36 |
| Không có `background` lẫn `border` | 29 |
| `padding: 0` | 26 |
| Không phải thẻ `<button>` | 11 |
| Quy tắc `:focus-visible` trong toàn bộ CSS | 0 |

`padding: 0` là thứ gây ra "phải click đúng chữ": vùng nhận cú nhấn đúng bằng hộp
chữ, ở cỡ 10–12px là cao khoảng 12–14px.

---

## Đã đổi những gì

### [SỬA LỖI] 11 thẻ không phải nút, nay là `<button>`

Trước: `<div onClick>`, hoặc `<Hover onClick>` — `Hover` mặc định render ra `div`
(`lib/Hover.tsx`, `createElement(as ?? 'div', …)`). Không tab tới được, không bấm
Enter được.

Sau: `<button>` thật, có `aria-pressed` hoặc `aria-expanded` nơi cần.

- `Cms.tsx` — thanh ba tab đầu trang (`TABS.map`), nay dùng class `.ab-tab` với `aria-pressed`
- `Cms.tsx:Cms` — nút tạo module, mũi co/mở module, tên module, nút xoá module
- `Cms.tsx:ImageSlot` — bỏ ảnh
- `Cms.tsx:Cms` — bỏ một bài khỏi module, trả nội dung về gốc
- `PostCard.tsx:PostCard` — nút ghim
- `RoutesPanel.tsx:RoutesPanel` — tiêu đề "Đường dẫn": trước là `<h2 onClick>` bọc một
  `<span role="button">` **không mang handler** — khai là nút nhưng không phải nút

### [SỬA LỖI] `ImageSlot` — nút tải ảnh tab tới được

Trước: `<Hover as="label">` bọc `<input type="file">` ẩn — bấm được, tab không tới.
Sau: `<button>` gọi `file.current?.click()`, input giữ nguyên `display: none`.
Anchor: `Cms.tsx:ImageSlot`.

### [ĐỔI HÀNH VI] Năm cấp nút, cấp nào cũng có viền lúc nghỉ

Mới: `design/controls.ts`, `design/Button.tsx`, và khối `.ab-*` ở cuối
`admin/admin.css`.

| Cấp | Nền | Viền | Chữ |
|---|---|---|---|
| primary | `#23211A` | `#23211A` | `#FDFBF2` |
| secondary | `#FFFFFF` | `#8C8674` | `#23211A` |
| ghost | `#FFFFFF` | `#B5AE99` | `#3B3729` |
| danger | `#FFFFFF` | `#C25C7C` | `#8E1E42` |

Cỡ: lg 40px · md 34px · sm 28px · icon 34×34 (sm 28×28). Padding ngang 20/16/12.
Tất cả cao hơn ngưỡng 24px.

Không thêm màu mới. `#8E1E42` và `#C25C7C` vốn đã nằm rải trong `admin/` (6 và 9
lần, viết cứng), nay đặt tên thành `ink.danger` và `ink.dangerLine` trong
`design/tokens.ts`.

### [ĐỔI HÀNH VI] `PostCard` — hành động ra cột riêng, "Xoá" thành cấp danger

Trước: năm nút `Sửa · Nhân bản · Đăng · Lưu trữ · Xoá` dùng chung class
`.admin-link-action` (chữ xanh 11.5px, `padding: 0`), nằm lẫn trong ô tiêu đề.

Sau: cột riêng bên phải, nút cỡ sm. `danger: true` gắn vào các mục xoá trong
`ACTIONS_BY_STATUS`, nên "Xoá" và "Xoá vĩnh viễn" vẽ đỏ, còn lại vẽ ghost.

`.admin-link-action` đã xoá khỏi `admin.css` — `PostCard` là nơi duy nhất dùng.

### [ĐỔI HÀNH VI] Nút ghim luôn nhìn thấy

Trước: emoji `📌` trong `<div role="button">`, `opacity: 0.18` khi chưa ghim và chưa
rê chuột. Tên đọc được của nó là chính ký tự emoji.

Sau: `IconButton` với `aria-pressed`, nhãn "Ghim lên đầu module" / "Bỏ ghim",
cấp `primary` khi đang ghim và `ghost` khi chưa. Bỏ hẳn `opacity`.

Đã sửa `PostCard.pin.test.tsx` theo: nút tìm bằng `name: /ghim/i` thay vì emoji, và
phép thử "nhìn là biết bài nào đang ghim" nay đọc class thay vì `style.opacity`.

### [ĐỔI HÀNH VI] Toast thay cho lỗi cục bộ

Mới: `design/Toaster.tsx`, gắn ở `App.tsx` bọc cả `AuthProvider`.

Đã thay 12 chỗ `setError((e as Error).message)` trong `Cms.tsx` và 4 chỗ trong
`PostsPanel.tsx` bằng `toast.fromError(e)`. Bỏ dải lỗi hồng chạy ngang đầu
`Cms` — nó đẩy cả trang tụt xuống.

`PostsPanel` giữ lại một cờ `failed` (không giữ nội dung lỗi) vì chỗ trống của
danh sách phải phân biệt "chưa có bài nào" với "không tải được".

Toast xanh và trắng tự tắt sau 4 giây; toast đỏ ở lại tới khi bấm đóng.

### [ĐỔI HÀNH VI] 9 icon SVG thay ký tự Unicode

Mới: `design/icons.tsx`. Nét 2.2, đầu nét vuông, ăn theo `currentColor`.

Trước đó `✕` dùng 13 lần và `×` dùng 11 lần — **hai ký tự khác nhau cho cùng một
nghĩa**. Còn `⠿` (7), `▾`/`▸`, `✎`. Nay `IconChevron` nhận `open` nên một hình
thay cho bốn ký tự `▾ ▸ + −`.

### [ĐỔI HÀNH VI] Một bán kính cho cả khu quản trị

`admin.css` trước có 4px, 6px và 10px. Nay chỉ còn 4px. Việc này chạm cả
`.admin-btn`, `.admin-btn-ghost`, `.admin-field`, `.admin-tpl-card` — tức là
`Editor`, `Login`, `MetadataStep` cũng đổi theo, dù ba màn ấy ngoài phạm vi báo lỗi.
Lý do gộp vào: ba màn đang sửa và `Editor` dùng chung một file CSS, để lệch nhau
thì trong cùng một khung nhìn có ba bán kính.

Đã xoá `.admin-tab` khỏi `admin.css` — định nghĩa từ lâu, chưa từng có nơi dùng.

### [ĐỔI HÀNH VI] Nhãn nút viết hoa chữ đầu

`tải ảnh lên` → `Tải ảnh lên`, `+ tag mới` → `Tag mới`, `+ module mới` →
`Module mới`, `+ bài` → `Bài mới`, `+ Bài mới` → `Bài mới`. Dấu `+` nay là icon.

Nhãn của các hành động trên `PostCard` (`Đăng`, `Lưu trữ`, `Bỏ đăng`, `Khôi phục`,
`Xoá`, `Xoá vĩnh viễn`) **giữ nguyên từng chữ** — `PostsPanel.test.tsx` tìm nút
bằng đúng các chuỗi ấy.

---

## Đối chiếu với bộ luật

**Không mâu thuẫn với luật nào.**

Bản ghi chú đầu tiên của tôi nói ngược lại, và sai. Tôi đọc **nhóm 08, luật 5**
(*"Ở mọi thao tác xoá: xoá thẳng, không hỏi lại — hoàn tác thay cho hộp xác nhận"*)
là áp cho mọi nút có chữ "Xoá" ở khắp hệ thống, rồi kết luận rằng bước hỏi lại tôi
thêm cho **"Trả về nội dung gốc…"** là vi phạm.

Chủ site đã xác định lại phạm vi của luật: **nhóm 08 nói về xoá chữ trong khi soạn
thảo**, không nói về nút xoá một bài đăng hay một module. Đọc như vậy thì khớp với
chính bộ luật: nhóm 08 tên là *"Ghi — sửa và lưu"*, luật 6 và 7 của nó nói về
Ctrl+Z và bộ nhớ đệm hoàn tác của trình soạn, và ví dụ của cả nhóm trích
`[[hours]]` và `[[report]]` — các màn Practice, không phải CMS. Thứ làm tôi đọc sai
là nhãn phạm vi `'Toàn hệ thống'` gắn trên từng mục.

Hệ quả, tất cả đều là không phải làm gì:

- Bước hỏi lại ở **"Trả về nội dung gốc…"** giữ nguyên. Nút này gọi `updateSite`
  với mọi khoá của `SITE_DEFAULTS` đặt về chuỗi rỗng, và `lib/useUndoStack.ts` chỉ
  phục vụ bộ soạn thảo bài chứ `Cms.tsx` không gọi tới — nên không có hoàn tác cho
  nó. Nhóm 08 không áp vào đây.
- Các nút xoá còn lại (xoá tag, xoá module, bỏ bài khỏi module, bỏ ảnh) không hỏi
  lại, giữ nguyên.
- Không có gì trong mã nguồn phải sửa vì mục này, và PR không còn chờ quyết định
  nào về luật.

Commit `e93d152` đã đẩy lên với thông điệp nêu "mâu thuẫn" theo cách đọc cũ. Không
sửa lại được vì đã nằm trong PR; mục này là bản đính chính.

Ngoài ra bản sửa không đụng luật nào khác. Nhóm 01 (màu) giữ nguyên bảng màu;
nhóm 02 (chữ) giữ hai họ chữ và nét 500 cho nhãn; nhóm 15 (ảnh) không đổi hành vi,
chỉ đổi hình dạng nút quanh ô ảnh.

---

## Bảng, cột, endpoint đã đụng

**Không cái nào.** Toàn bộ thay đổi nằm ở lớp hiển thị. Các lời gọi
`updateSite`, `patchModule`, `deleteModule`, `deleteTag`, `transitionStatus`,
`updatePost`, `createModule`, `createPost`, `uploadImage` giữ nguyên tham số và
nguyên thứ tự; chỉ nơi báo kết quả đổi từ state cục bộ sang toast.

---

## Kiểm

- `npm test` — 125 file, 1249 phép thử xanh (thêm 9 phép thử mới ở
  `design/Button.test.tsx`).
- `npx vite build` — xanh, 243 module.
- **Chưa mở trình duyệt xem.** Ba màn nằm sau cổng đăng nhập và tôi không tự gõ mật
  khẩu. Mọi con số ở trên đọc từ mã nguồn. Cần chủ site đăng nhập một lần rồi soi
  lại trên màn thật trước khi merge.

`design/Button.test.tsx` đọc thẳng `admin.css` và bắt lỗi nếu có cấp nút nào thiếu
`border-color` hoặc `background` — chính là lỗi đã xảy ra ở bản đề xuất đầu tiên,
nơi cấp ghost và danger để viền trong suốt.

---

## Đề xuất luật

Chưa làm, để chủ site quyết:

1. Thêm vào nhóm 01 hoặc một nhóm mới: mọi nút trong khu quản trị phải có viền thấy
   được ở trạng thái nghỉ, và vùng bấm cao tối thiểu 24px.
2. Nhóm 08 đang gắn nhãn phạm vi `'Toàn hệ thống'` cho cả bảy mục, nhưng theo chủ
   site thì nhóm này nói về soạn thảo chữ. Nhãn ấy làm tôi đọc sai một lần rồi —
   lane Tài liệu cân nhắc đổi phạm vi cho đúng, hoặc nói rõ trong luật 5 rằng "xoá"
   ở đây là xoá chữ trong trình soạn.

---

## Bổ sung — bố cục ba màn (cùng nhánh, cùng PR)

### [ĐỔI HÀNH VI] `/ad-page-content` — thanh mục lục dính

Mới: `CONTENT_SECTIONS` và `ContentIndex` trong `Cms.tsx`. Bảy mục —
Trang chủ · Tag · Ghi chép · Lưu trữ · Mục lục · Module · Quản trị — mỗi mục là
một nút nhảy tới đúng tiêu đề của nó. Mục đang xem sáng lên bằng
`IntersectionObserver`.

Trước: một mạch cuộn liền, sửa một chữ ở khối Quản trị phải cuộn qua sáu khối kia.

Đặt **ở trên** chứ không phải bên trái như bản đề xuất đã vẽ: biểu mẫu bên dưới
chạy hai và ba cột trong 1080px, một rail dọc sẽ ăn mất bề ngang của chính những
hàng rộng nhất. Nói ra để khỏi tưởng là quên.

`IntersectionObserver` không có trong jsdom nên có bọc `typeof` — thanh vẫn nhảy
được trong test, chỉ không sáng lên. Không thêm polyfill cho việc đó.

Mỗi tiêu đề mục nay có `id` và `scrollMarginTop: 64` để thanh dính không che
mất tiêu đề vừa nhảy tới.

### [ĐỔI HÀNH VI] `/ad-post` — thanh lọc dính

`PostsPanel`: hàng lọc + nút "Bài mới" nay `position: sticky, top: 0`, nền
`paper.cream`. Danh sách bài dài hơn một màn, nên bộ lọc đang bật và nút tạo bài
là đúng hai thứ cần thấy trong lúc cuộn.

### [ĐỔI HÀNH VI] `/ad-sitemap` — thanh lưu dính đáy

`RoutesPanel`: nút "Lưu đường dẫn" chuyển từ đầu panel xuống một thanh
`position: sticky, bottom: 0`, chỉ hiện khi `changed`.

Thanh này nói rõ **bao nhiêu từ đang khác bản đang chạy** (hàm `countChanges`,
đếm cả `modules`), hoặc báo "còn chỗ viết sai, chưa lưu được" khi `checkWords`
trả về lỗi. Thêm nút "Huỷ" đặt `draft` về `live`.

Trước: nút lưu nằm ở đầu panel — tức đúng chỗ nó không bao giờ cần tới, vì sửa
tới từ nào thì nút đã cuộn khuất.

### Kiểm lại sau phần bổ sung

- `npm test` — 125 file, 1249 phép thử xanh.
- `npx vite build` — xanh.
- Vẫn **chưa mở trình duyệt xem**. Ba thứ dính (`sticky`) ở trên là loại thay đổi
  chỉ nhìn mới biết đúng, nên đây là phần cần chủ site soi kỹ nhất sau khi đăng nhập.
