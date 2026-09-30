# Thẻ bài bo tròn, dòng preview, ghim lên đầu danh sách

- Nhánh: `claude/project-thread-r3z436`
- PR: (điền khi mở)
- Lane: Thiết kế (nút/toast/icon khu quản trị)

Chủ site gửi một ảnh chụp lưới thẻ của trang khác làm ví dụ và bảo bốn việc:
bo tròn và tách rời các dòng trong danh sách bài, thêm một hai câu preview dưới
tiêu đề, cho ghim đưa bài lên đầu, và căn danh sách ra giữa.

## [ĐỔI HÀNH VI] Dòng danh sách thành thẻ rời nhau

`PostCard` — khối `<div>` ngoài cùng.

Trước: `borderBottom: 1px solid paper.rule`, `borderLeft: 3px solid` (trong
suốt, chuyển sang `ink.green` khi rê chuột), `padding: '14px 40px'`, các dòng
dính liền nhau thành một khối.

Sau: `border: 1px solid paper.rule` cả bốn cạnh, `borderRadius: 8`,
`padding: '14px 18px'`, và khi rê chuột thì đổi màu viền sang `ink.faint` chứ
không mọc thêm một vạch bên trái. Khoảng hở giữa các thẻ do danh sách đặt, không
do thẻ: `PostsPanel` bọc `ordered.map` trong một `div` có
`display: flex, flexDirection: column, gap: 8`.

Lý do đổi cách đánh dấu rê chuột: vạch trái là cách cũ để đánh dấu một dòng
không có cạnh riêng. Thẻ có cạnh riêng rồi.

## [ĐỔI HÀNH VI] Một bán kính chung đổi từ 4px sang 8px

`frontend/src/admin/admin.css` — cả mười chỗ khai `border-radius`.

Chủ site đã chốt trước đó là toàn khu quản trị dùng **một** bán kính, và
`Button.test.tsx`, bài `'có đúng một bán kính, và viền không đổi độ dày khi
hover'`, khoá điều đó bằng cách đọc thẳng file CSS. Nên yêu cầu "bo tròn chút"
cho thẻ không thể thực hiện bằng cách cho thẻ một bán kính riêng — làm vậy là
phá đúng cái luật chủ site đặt ra.

Đã đổi cả mười chỗ sang `8px` và sửa kỳ vọng của bài kiểm từ `['4px']` sang
`['8px']`. Hệ quả: mọi nút, tab, menu, ô lọc trong khu quản trị đều tròn hơn,
không riêng thẻ bài.

Bán kính còn một bản sao thứ hai ngoài CSS: hằng `radius` trong
`frontend/src/design/controls.ts`, chỗ `Toaster` và lưới thẻ của tab Cấu hình
đọc. Đã đổi hằng ấy sang `8` luôn. Lần đầu t chỉ đổi trong CSS, và như vậy là
sai đúng cái luật đang thực hiện — CSS 8px còn toast vẫn 4px; lane kiến trúc
phát hiện và nhắn sang. `PostCard` nay đọc `radius` thay vì viết số, kể cả hai
chỗ bo ảnh thumbnail vốn viết cứng `4`.

## [ĐỔI HÀNH VI] Dòng preview dưới tiêu đề lấy câu mở đầu bài

`PostCard` — khối dưới `.ab-rowtitle` và dòng meta.

Trước: vẽ thẳng `post.vi`. Bài nào chưa ai viết `vi` thì dưới tiêu đề không có
gì — trong ảnh chủ site gửi, năm trên mười bài đang trống chỗ đó.

Sau: gọi `postDescription(post)` từ `frontend/src/lib/postText.ts`, tức là
`lead` nếu bài có, `vi` nếu không. Kẹp hai dòng bằng `WebkitLineClamp: 2`.

Đây là hàm mà danh sách ngoài site đang dùng. Dùng chung là có chủ đích: quản
trị và trang đọc không được nói khác nhau về cùng một bài.

## [ĐỔI HÀNH VI] `lead` chuyển từ `PostDetail` lên `PostSummary`

Đây là **thay đổi trong vùng của lane Kiến trúc**, nêu riêng ra ở đây vì vậy.

- `backend/lib/posts.ts`: hằng `POST_SUMMARY_COLUMNS` thêm `lead`; hàm
  `toPostSummary` thêm `lead: row.lead`; `interface PostSummary` thêm
  `lead: string | null`; `interface PostDetail` bỏ dòng `lead` (nay thừa, vì nó
  `extends PostSummary`).
- `frontend/src/admin/lib/apiClient.ts`: `type PostSummary` thêm `lead`,
  `type PostDetail` bỏ `lead` — đối xứng với trên.

Không cần migration: `lead` là cột có từ `0001_initial_schema.sql` dòng 56
(`lead text`), không phải cột thêm sau như `plate_images`, nên không có chuyện
database thật chưa có nó.

Đây là một cột `text` ngắn thêm vào một câu `select` đã đọc mười sáu cột, nên
không phải chuyện tốc độ. Nhưng nó đi ngược hướng mà lane tốc độ API đã đi
(`usePublishedPosts` bỏ `body` khỏi danh sách), nên ghi rõ ra đây để ai rà lại
biết là cố ý: `lead` là một dòng chữ, không phải cây block như `body`.

## [ĐỔI HÀNH VI] Ghim đưa bài lên đầu danh sách quản trị

`PostsPanel` — hằng `ordered`.

Trước: `posts.map(...)` vẽ đúng thứ tự máy chủ trả về, tức
`order('updated_at', { ascending: false })` ở `backend/api/posts/index.ts`. Ghim
không có tác dụng gì ở màn này; nó chỉ nói về thứ tự trong module khi đọc ngoài
site.

Sau: `const ordered = [...posts].sort((a, b) => Number(b.pinned) - Number(a.pinned))`,
rồi vẽ `ordered`. `sort` của JavaScript ổn định theo đặc tả, nên các bài không
ghim giữ nguyên thứ tự `updated_at` máy chủ đã chọn.

Xếp ở phía client chứ không sửa câu `order` phía máy chủ: câu ấy phục vụ mọi
người đọc `GET /api/posts`, còn "ghim lên đầu" là điều chủ site muốn thấy ở màn
quản trị.

## [ĐỔI HÀNH VI] Danh sách căn giữa

`PostsPanel` — `<div>` ngoài cùng của `return`, thêm
`style={{ maxWidth: 940, margin: '0 auto' }}`.

Trước, danh sách chạy hết bề ngang cửa sổ, nên trên màn rộng tiêu đề bài và cụm
nút cuối dòng nằm cách nhau cả gang tay.

## Bảng, cột và endpoint đã đụng

- Bảng `posts`, cột `lead` — **chỉ đọc thêm**, không ghi.
- `GET /api/posts` và `PUT /api/posts` (nhánh `handleReorder`) đều dùng
  `POST_SUMMARY_COLUMNS`, nên cả hai nay trả thêm `lead`.
- Không đụng bảng nào khác, không có DDL, không có migration.

## Đối chiếu ngược với bộ luật

`frontend/src/content/logic.ts`:

- **04** (một bài một tiêu đề, mọi nơi đọc cùng một trường): bản sửa đi đúng
  hướng luật này và mở rộng nó sang dòng mô tả — quản trị nay đọc cùng hàm
  `postDescription` với trang đọc.
- **08**: không liên quan. Nhóm 08 nói về soạn thảo chữ, không nói về danh
  sách — xem `docs/inbox/design/2026-09-18-nut-quan-tri.md`.

Không có luật nào bị mâu thuẫn.

## Kiểm

- `npm test`: 130 tệp, 1343 bài xanh, 2 bỏ qua.
- Bài mới: ba bài về dòng preview trong `PostCard.pin.test.tsx`
  (`describe('dòng preview dưới tiêu đề')`), một bài về thứ tự ghim ở cuối
  `PostsPanel.test.tsx`.
- Bài thứ tự ghim đã kiểm là **không đỗ vống**: bỏ `.sort(...)` đi thì nó đỏ.
- Nhìn bằng mắt: dựng bản tĩnh rồi chụp, theo cách ghi ở
  `docs/inbox/design/2026-09-19-nut-lech-cot-va-icon-ghim.md`.

## Đề xuất luật

Không có.

## Chưa ai nhìn tận mắt

Tất cả ảnh chụp đều từ bản dựng tĩnh ngoài cổng đăng nhập, dữ liệu là dữ liệu
giả. Hai chỗ chỉ chủ site kiểm được trên site thật: menu ba chấm của thẻ cuối
danh sách có bị khuất dưới mép màn không, và thẻ có còn đọc được khi cửa sổ hẹp
hơn 940px không.
