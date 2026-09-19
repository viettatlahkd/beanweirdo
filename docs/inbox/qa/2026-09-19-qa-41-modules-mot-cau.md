# QA-41: xoá module là một câu, sửa module thôi trả về cả bản ghi

PR: (chưa mở — sẽ điền)    nhánh: `claude/project-thread-rsb5j4`
Cắt từ: `origin/main` @ `6db2f50`

Lane kiến trúc nhả `/api/modules` cho lane QA sau khi họ thêm hai lượt đọc vào
đó ở PR #2 và #4 ("t không giữ, m gộp được thì cứ làm"). Chủ site bảo làm tiếp.

Ghi chú này ngắn vì **phần lớn những gì có thể tưởng là làm được thì không làm
được**, và mục đầu tiên nói đúng chỗ ấy.

## Không sửa, và vì sao

### `handlePatch` vẫn đọc cả bảng `modules` khi patch có `parent_id`

`backend/api/modules/[id]/index.ts`. Lượt đọc `select('id, parent_id')` ấy **ở
nguyên**, không đụng.

Phép kiểm là "đưa module này vào trong module kia có tạo vòng không". Câu ấy hỏi
về **đường đi trong cả cây**, không hỏi về một hàng — nên nó không nhét vào
mệnh đề `WHERE` của câu ghi được như các chỗ khác ở QA-39. Muốn gộp thì phải có
stored function với recursive CTE, và đó là đổi hình dạng schema để tiết kiệm
một lượt đọc mà người dùng gặp rất hiếm.

Nó cũng chỉ chạy khi patch **có** `parent_id`, tức khi chủ site đổi chỗ một
module. Sửa tên, màu, dàn trang — những thứ làm hàng ngày — không trả tiền cho
nó. Không có gì để lấy.

Tôi thêm hai bài kiểm khoá lượt đọc ấy lại (`đọc cây trước khi ghi, khi và chỉ
khi patch có parent_id`, và `không đọc cây cho một lần sửa không đụng
parent_id`), để lần sau ai dọn dẹp thì phải cố ý.

## Đã sửa

### [ĐỔI HÀNH VI] `DELETE /api/modules/:id` — hai câu thành một

Trước: đọc `select('id').eq('parent_id', id)` để đếm module con, trả 409 nếu còn,
rồi mới xoá.

Lượt đọc ấy **không quyết định gì**. `parent_id` là `ON DELETE RESTRICT`
(migration 0025), nên dù không đọc thì database vẫn từ chối y như vậy. Nó chỉ để
dịch lời từ chối thành một câu tiếng người.

Sau: xoá thẳng. Postgres trả mã `23503` ("còn hàng khác trỏ vào hàng này") thì
mới đọc, trong hàm mới `explainStillHeld`, để nói ra là còn mấy cái. Xoá một
module không có con — gần như mọi lần — là một câu lệnh.

Mã trạng thái và lời nhắn giữ nguyên: 204 khi xong, 404 khi không có module ấy,
409 kèm `still holds N module(s). Move or delete them first.` khi còn con.

**Guard `42703` bị bỏ, có chủ ý.** Lane kiến trúc dặn giữ nó (database chưa chạy
0025 thì không có cột `parent_id`). Nó không còn cần: không có cột thì không có
khoá ngoại nào để vi phạm, nên câu xoá thành công và không bao giờ vào tới nhánh
`23503`. Đường thường nay không hỏi cột ấy nữa.

### [ĐỔI HÀNH VI] `PATCH /api/modules/:id` thôi trả về cả bản ghi

Trước: `.select('*')` rồi `toModule(...)`. Một module có hơn 30 cột — bảy đường
dẫn ảnh, `feature_cells`, và bốn đoạn mô tả dài (`long_desc`, `treatment`,
`layout_note`, `blurb`).

Sau: `.select(['id', ...Object.keys(patch)].join(', '))`, trả `{ module: data }`
thẳng, không qua `toModule`. Đúng cùng bản sửa đã làm cho `PATCH /api/posts/:id`
ở QA-38.

Không chỗ nào đọc giá trị trả về: `frontend/src/screens/Cms.tsx` →
`patchModule` đặt state lạc quan (`setModules((ms) => ms.map(...))`) rồi mới
`await updateModule(id, patch)` và bỏ qua kết quả.

Bỏ `toModule` an toàn vì nó vốn là ánh xạ một-một, trừ `parent_id ?? null` và
`kind ?? 'normal'` — hai giá trị mà một lần PATCH chỉ trả về khi người gọi đã tự
gửi chúng lên. Kiểu trả về của `apiClient.updateModule` **chưa** thu hẹp theo,
xem mục cuối.

## Bảng, cột, endpoint đã đụng

| Endpoint | Đổi gì |
|---|---|
| `DELETE /api/modules/:id` | 2 câu → 1 ở đường thường. Mã và lời nhắn không đổi |
| `PATCH /api/modules/:id` | Thân trả về thu hẹp còn `id` + những cột vừa ghi |
| `PATCH /api/modules/:id` (nhánh `parent_id`) | **Không đổi** |

| Bảng | Cột | Đổi gì |
|---|---|---|
| `modules` | `parent_id` | Thôi đọc ở đường thường của DELETE; vẫn đọc ở nhánh hỏng |
| `modules` | mọi cột | DELETE và PATCH thôi `select('*')` |

Không đụng bảng nào khác. Không đụng `backend/lib/modules.ts`.

## Bài kiểm

5 bài mới ở `backend/api/modules/[id]/index.test.ts`, tất cả đếm **số câu lệnh**
chứ không chỉ đọc kết quả: xoá leaf là 1 câu, nhánh `23503` là 2 câu và nói đúng
số con, PATCH trả đúng `'id, title'`, và hai bài giữ phép chặn vòng cha-con.

Nhánh 409 trước đây **không có bài kiểm nào** — lần này có.

Toàn bộ: lint 0 lỗi, typecheck sạch, 125 file / 1293 test xanh, `vite build` xanh.

## Đối chiếu bộ luật

Không bản sửa nào chạm vào luật nào trong `logic.ts`. Luật **08.5** (xoá thẳng,
không hỏi lại) vẫn đúng: 409 ở đây không phải hộp xác nhận, nó là lời từ chối
khi thao tác sẽ kéo theo cả một nhánh bài viết.

## Còn nợ

`frontend/src/admin/lib/apiClient.ts` → `updateModule` vẫn khai
`Promise<Module>`, mà máy chủ nay trả về một phần. Không ai đọc giá trị ấy nên
không hỏng, nhưng kiểu đang nói dối. Thu hẹp nó thành
`Partial<Module> & { id: string }` là một dòng — tôi để lại thay vì làm kèm, vì
nó kéo theo `Cms.tsx` và lane giao diện đang sửa file đó.

## Bàn giao cho lane kiến trúc

Tôi có đụng `backend/api/modules/[id]/index.ts` — file các anh vừa sửa ở PR #2
và #4 — nhưng **không** đụng `backend/lib/modules.ts`, và `canReparent` cùng
`moduleTree.contract.test.ts` giữ nguyên, vẫn xanh. `git pull` trước khi làm
tiếp trên file ấy.

Phiên tôi không gọi được cross-session message lúc viết ghi chú này, nên đây là
đường bàn giao.
