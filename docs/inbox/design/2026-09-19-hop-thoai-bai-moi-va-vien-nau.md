# Hộp thoại Bài mới thay cho trang tạo bài, và một màu viền chung

- Nhánh: `claude/project-thread-r3z436`
- PR: (điền khi mở)
- Lane: Thiết kế (nút/toast/icon khu quản trị)

Chủ site gửi ảnh chụp `/ad-post/create` và bảo hai việc: bỏ trang ấy đi, cho nó
nổi lên giữa màn hình; và viền thì "cứ nhạt nhạt", đậm lên, đừng đen, các nút
dùng chung một màu nâu sậm.

## [ĐỔI HÀNH VI] Tạo bài là hộp thoại, không còn là một trang

Trước: bấm "Bài mới" gọi `nav.newPost()`, và `nav.newPost` đẩy địa chỉ sang
`/ad-post/create`; `App.tsx` vẽ `NewPostWizard`, tệp ấy bọc `MetadataStep` trong
một trang trống. Huỷ giữa chừng thì không có đường quay lại, phải tự bấm nút
lùi của trình duyệt.

Sau: `frontend/src/admin/components/NewPostDialog.tsx` — một lớp phủ
`position: fixed` căn giữa, bên trong là `MetadataStep`. `nav.newPost` nay chỉ
bật state `newPostOpen` trong `Routed` (`App.tsx`), không đụng địa chỉ nữa.

Chi tiết đáng nêu, vì mỗi cái sửa một lỗi cụ thể:

- Nghe `mousedown` trên nền, **không** nghe `click`. Bôi đen chữ trong form rồi
  thả chuột ra ngoài cũng đếm là một `click` trên nền, và như vậy là đóng mất
  form người ta đang điền.
- Khoá `document.body.style.overflow` khi mở, trả lại giá trị cũ khi đóng.
  Không khoá thì lăn chuột trên hộp làm danh sách sau lưng trôi đi.
- `Escape` đóng. `role="dialog"`, `aria-modal="true"`, `aria-label="Bài mới"`,
  và `panel.focus()` khi mở để Tab đi trong hộp chứ không lạc xuống danh sách
  đang bị che.
- `onCreated` trả `id` ra ngoài; **hộp thoại không tự điều hướng**. `App.tsx`
  quyết định đi đâu tiếp (hiện là `editPost(id)`).
- Tạo hỏng thì hộp **không đóng** và vẽ một `role="alert"` ngay trong hộp. Bản
  cũ cũng vẽ lỗi, nhưng trên một trang riêng nên không mất gì; ở đây mà đóng là
  mất luôn sáu ô vừa điền.

Hộp thoại nằm **trong** `AuthGate`, vì nó ghi vào database — đúng như lúc nó
còn là một trang nằm trong khu admin.

### Hai chỗ gọi, không chỗ nào phải sửa

`nav.newPost()` giữ nguyên tên và nguyên chữ ký, nên cả hai chỗ gọi nó đều
không đổi một dòng: `PostsPanel` (nút "Bài mới" trên thanh lọc) và `Cms.tsx`
(nút "Bài mới" của hàng module trong tab Cấu hình — **tệp của lane Kiến trúc,
không đụng tới**).

## [ĐỔI HÀNH VI] Địa chỉ `/ad-post/create` không còn tồn tại

- Xoá `frontend/src/admin/screens/NewPostWizard.tsx`.
- `frontend/src/lib/nav.tsx`: bỏ `'postNew'` khỏi union `Screen`.
- `frontend/src/lib/area.ts`: bỏ `'postNew'` khỏi danh sách màn của khu admin.
- `frontend/src/lib/routes.ts`: bỏ `[w.create]: 'postNew'` trong `postActions`
  và `postNew: w.create` trong `actionOfScreen`.
- `frontend/src/App.tsx`: bỏ dòng vẽ `NewPostWizard`.

Bookmark cũ không rơi ra trang công khai: `readPath` không nhận ra động từ
`create` nữa nên đi tiếp xuống `adminPages(w)[head]`, và `head` vẫn là
`ad-post`, nên `/ad-post/create` mở ra **danh sách bài**. Đã khoá bằng một bài
kiểm trong `routes.test.ts`.

Từ `create` vẫn còn trong `frontend/src/lib/routeWords.ts` nhưng nay không ai
đọc. Không xoá: `routeWords.ts` là sổ từ, và bỏ một từ khỏi sổ là việc của lane
Tài liệu, không phải việc của bản sửa này.

## [ĐỔI HÀNH VI] Một màu viền chung cho mọi control có viền

Thêm token `ink.border = '#5A4632'` trong `frontend/src/design/tokens.ts`.

Trước, mỗi cấp một màu viền: `#b5ae99` cho ghost và tab, `#8c8674` cho
secondary, `#ebe5d3` cho `.admin-field`, `.admin-btn-ghost`, `.admin-tpl-card`.
Cái nhạt nhất gần như biến mất trên nền kem, nên đọc cả bộ đúng là "nhạt nhạt".

Sau, trong `frontend/src/admin/admin.css`, những chỗ sau đều là `#5a4632`:
`.ab-secondary`, `.ab-ghost`, `.ab-tab`, `.admin-btn-ghost`, `.admin-field`,
`.admin-tpl-card`, `.admin-tpl-card:hover`, `.admin-field:focus`, `.ab-menu`.
Trạng thái rê chuột đậm thêm một bậc, `#3b2d1f`, để rê chuột vẫn thấy khác.

Hai chỗ **cố ý không đổi**, nêu rõ ra vì nó lệch với chữ "chung hết một màu":

- `.ab-primary` giữ `#23211a`, trùng với nền đặc của chính nó. Nút primary là
  một khối đặc, viền nó là mép của khối, không phải một đường kẻ.
- `.ab-danger` giữ `#c25c7c` và `#8e1e42`. Đỏ ở đây là thứ làm "Xoá" trông khác
  "Sửa" — chính là điều đã sửa ở PR #3. Cho nó màu nâu chung là xoá lại việc ấy.

Nếu chủ site muốn cả hai chỗ này cũng về nâu thì đổi được, nhưng phải nói ra vì
nó đánh đổi.

## Không đổi: viền thẻ bài trong danh sách

Thẻ trong `PostCard` vẫn dùng `paper.rule`. Chủ site nói về viền **nút** và về
form trong ảnh họ gửi; thẻ là vật chứa, không phải control, và bốn chục thẻ
viền nâu đậm xếp dọc màn hình là một cái lưới ô, không phải một danh sách. Nếu
nhìn trên site thật thấy thẻ tách nhau chưa đủ rõ thì đổi `paper.rule` sang
`ink.border` ở đúng một dòng.

## Bảng, cột và endpoint đã đụng

Không có. Bản sửa này không chạm database, không thêm hay đổi endpoint nào.
`NewPostDialog` gọi đúng `createPost` mà `NewPostWizard` vẫn gọi.

## Đối chiếu ngược với bộ luật

`frontend/src/content/logic.ts`:

- **08** (ghi — sửa và lưu): không mâu thuẫn. Hộp thoại **không** tự đóng khi
  bấm ra ngoài trong lúc đang có lỗi, và không hỏi lại khi đóng — nó chưa ghi
  gì xuống database cho tới khi bấm "Soạn bài".
- Không luật nào nói về địa chỉ của màn tạo bài, nên bỏ `/ad-post/create` không
  đụng luật nào.

## Kiểm

- `npm test`: 129 tệp, 1336 bài xanh, 2 bỏ qua. (`lint` còn một cảnh báo có
  sẵn ở `components/ActivityRow.tsx`, không phải của bản sửa này.)
- Bài mới: `NewPostDialog.test.tsx`, bảy bài — đóng thì không vẽ gì, mở thì là
  `role="dialog"` có tên, Esc đóng, bấm trong không đóng và bấm nền thì đóng,
  tạo xong trả `id` ra ngoài, tạo hỏng thì báo và không đóng, khoá rồi trả lại
  `body.overflow`.
- `routes.test.ts`: bài mới xác nhận `/ad-post/create` mở ra danh sách bài.
- Nhìn bằng mắt: dựng bản tĩnh rồi chụp, cách làm ghi ở
  `docs/inbox/design/2026-09-19-nut-lech-cot-va-icon-ghim.md`.

## Đề xuất luật

Không có.

## Chưa ai nhìn tận mắt

Ảnh chụp là bản dựng tĩnh, hộp thoại trong ảnh là bản dựng lại bằng tay để chụp
chứ không phải chính `NewPostDialog` (nó cần `AuthGate` và mạng). Ba chỗ chỉ
chủ site kiểm được trên site thật: form dài hơn màn hình thì hộp có cuộn trong
chính nó không, bấm "Soạn bài" có sang thẳng màn soạn không, và trên điện thoại
hộp có còn vừa không.
