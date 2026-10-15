# Thân bài rỗng không có chỗ gõ

- Nhánh: `claude/project-thread-ey2sz1`
- PR: #28
- Lane: template / mặt soạn

Chủ site: *"sao cái longform với bitesize không gõ được mà cứ ở headlines mãi
vậy kiểm tra fix bug hộ đi, click vào không ra con trỏ [|] edit"*.

---

## 1. [SỬA LỖI] Bài chưa có gì trong thân thì không vẽ mặt soạn nào

**Cái đã làm.** Bốn chỗ trong `Editor.tsx` — `useElementBody.renderAfterElements`
(memo và bitesize dùng chung), `LongformEditor.renderAfterBlocks`,
`ArticleEditor.renderAfterSections` — nay vẽ một `LiveRun` rỗng khi thân bài
không có phần tử nào, thay vì chỉ vẽ cái máng `+`.

**Bằng chứng.** Cả ba hàm ấy trước đây trả về một `div.awc-rep-block` chứa
đúng một `InsertPlus` và không có ô nhập nào. Đo trong Chrome trên trang thử,
thân bài rỗng: `document.querySelectorAll('.awc-live-input').length === 0` ở
`longform`, `bitesize`, `memo` và `article`; `report` không dính vì nó dựng dải
chữ theo đường riêng. Không có mặt soạn thì bấm vào giữa trang không sinh con
trỏ, và ô duy nhất gõ được trên màn là dòng tiêu đề — đúng câu *"cứ ở headlines
mãi"*.

`toRuns([])` trong `flow.ts` vốn **đã** trả về một dải rỗng để gõ vào, kèm chú
thích *"Trong một trình soạn thì chỗ để gõ phải có sẵn"*. `toLongformRuns` và
`toSectionRuns` cũng vậy. Thiếu sót nằm ở chỗ vẽ, không ở chỗ tính:
`wrapElement` / `wrapBlock` / `wrapSection` chạy theo từng phần tử, nên mảng
rỗng thì chúng không chạy lần nào và dải ấy không bao giờ được vẽ ra.

**Không phải hồi quy của PR #27.** Đoạn `renderAfterElements` chỉ vẽ nút `+`
vào repo ở commit `3c13d7b` *"Memo và bitesize dùng chung một mặt soạn thân
bài"*, trước PR #27. PR #27 không đụng tới đường vẽ này.

**Đã đo trong Chrome thật** (Playwright, `frontend/harness.html`): năm khuôn
`longform`, `bitesize`, `memo`, `report`, `article` × ba hình dạng thân bài
(bộ mẫu, rỗng, toàn tiêu đề) — mười lăm trường hợp. Trước bản sửa, bốn trường
hợp "rỗng" không có mặt soạn nào; sau bản sửa cả mười lăm đều gõ được chữ vào.
Đo thêm một vòng nữa: gõ hai dòng vào thân rỗng, rời ô, thì chữ ở lại và `## `
vẫn thành tiêu đề như thường.

**Bài kiểm.** `Editor.flow.test.tsx`, nhóm *"bài chưa có gì trong thân"*: năm
khuôn, mỗi khuôn dựng với thân rỗng và đếm `.awc-live-input`. jsdom không dựng
`contenteditable` nên nó không gõ được chữ nào — nó kiểm đúng cái đã thiếu, là
**có** một mặt soạn trên màn.

**Đối chiếu bộ luật.** Không mâu thuẫn. Nhóm `08` (*Ghi — sửa và lưu*) nói
*"ở mọi mục tạo mới: tạo dòng trống trước rồi con trỏ nhảy vào"* — bản sửa này
đi cùng hướng với luật ấy chứ không ngược: nay bài rỗng có sẵn một dòng trống
để gõ. (Con trỏ **chưa** tự nhảy vào; xem mục đề xuất bên dưới.)

## 2. Trang thử dựng thêm hai hình dạng thân bài

**Cái đã làm.** `frontend/src/harness.tsx` nhận thêm `?b=empty` và `?b=heads`.

**Vì sao.** Trang thử chỉ dựng một bộ mẫu có đủ tiêu đề, đoạn văn và widget,
tức đúng hình dạng mà lỗi trên **không** xảy ra. Bài rỗng là hình dạng của mọi
bài lúc vừa tạo, và nó không có trong trang thử.

## Bảng, cột, endpoint đã đụng

Không có. Thuần phía trình duyệt, không đổi cách lưu, không gọi endpoint nào.

## Chưa nhìn tận mắt

- `/practice` sau cổng đăng nhập nên mọi phép đo chạy trên trang thử, không
  phải trên bài thật của chủ site.
- Không đo được `cards`: khuôn ấy không có dải chữ thân bài.
- Chưa biết bài longform/bitesize của chủ site có đúng là thân rỗng hay không.
  Nếu họ vẫn không gõ được sau bản sửa này thì lỗi là chuyện khác, và cần một
  ảnh chụp màn hình bài ấy.

## Đề xuất luật (ý kiến, chưa làm)

- Nhóm `08` nói con trỏ phải **nhảy vào** dòng vừa tạo. Ở đây mặt soạn có sẵn
  nhưng chưa tự nhận tiêu điểm lúc mở bài rỗng, nên vẫn phải bấm một cái. Tự
  lấy tiêu điểm thì phải cân với dòng tiêu đề — bài mới thì người viết đặt tên
  trước hay viết thân trước, đó là câu hỏi của chủ site chứ không phải của tôi.
