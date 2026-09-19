# spine/tree-01-module-parent · Module có cha, và một chỗ duy nhất biết đọc cây

PR: (điền sau khi mở)   nhánh: claude/project-thread-vvnk0a   base: origin/main

## Bối cảnh

Chủ site nêu: thêm một bài mới hay thêm một mục vào mục lục đều rất khó, và cấu
trúc mong muốn là cây ba tầng — trang chủ, ba nhánh, rồi mục lục và mục con
dưới mỗi nhánh — trong đó mọi tầng về sau đều thêm được.

Chủ site đã chốt ba điều trước khi làm: ba nhánh là **node thật** (bấm vào mở ra
mục lục riêng); bài viết **được phép** nằm trực tiếp dưới một nhánh, không bắt
buộc qua mục lục; và làm PR 1 luôn.

Đây là PR 1 của ba PR. Nó **không đổi gì trên màn hình**.

## Đã đổi

- [ĐỔI HÀNH VI] `modules` có cột `parent_id` tự trỏ về `modules(id)`, `on delete
  restrict` — `backend/supabase/migrations/0025_module_parent.sql`. Mọi hàng
  hiện có nhận `null`, nên cây vẫn sâu đúng hai tầng như trước.
- [ĐỔI HÀNH VI] `landingModules` nay chỉ trả về các nút gốc, không phải mọi
  module — `frontend/src/data/useModules.tsx:landingModules`. Khi mọi
  `parent_id` còn là `null` thì tập trả về **giống hệt trước**; test
  `useModules.test.ts` khoá cả hai trường hợp. Từ lúc có hàng con, con không
  hiện ở trang chủ nữa vì nó đã được giới thiệu ở trang của cha.
- [ĐỔI HÀNH VI] `PATCH /api/modules/:id` nhận `parent_id` —
  `backend/lib/modules.ts:MODULE_PATCHABLE`. Trước khi ghi, endpoint đọc cả
  bảng và chạy `canReparent`; vi phạm trả `400` kèm lý do bằng chữ.
- [ĐỔI HÀNH VI] `DELETE /api/modules/:id` trả `409` khi module còn chứa module
  khác, thay vì để khoá ngoại ném ra `500` —
  `backend/api/modules/[id]/index.ts:handleDelete`.
- [SỬA LỖI] `groupByModule` bị chép nguyên văn ở hai file, `Landing.tsx` và
  `IndexScreen.tsx`. Nay còn một bản ở `frontend/src/lib/postGroups.ts`. Hai
  bản cũ giống nhau từng ký tự nên việc gộp không đổi hành vi.
- Thêm `frontend/src/lib/contentTree.ts` — `rootsOf`, `childrenOf`,
  `ancestorsOf`, `depthOf`, `descendantIds`, `buildTree`, `flattenTree`,
  `canReparent`. Chưa màn nào ngoài `landingModules` gọi tới; PR 2 mới nối
  breadcrumb và sidebar vào.
- Thêm `postsUnder` và `countUnder` trong `postGroups.ts` — câu hỏi "mọi bài
  nằm dưới nhánh này" mà bảng phẳng không hỏi được. Chưa có màn nào gọi.

## Khác với bản đề xuất đã gửi

Bản đề xuất nói thêm **hai** cột, `parent_id` và `path`. Khi viết thì bỏ `path`.

Lý do: mọi màn đã tải trọn bảng `modules` bằng một truy vấn (`useModules` gọi
`select('*')` không lọc), nên đi ngược lên cha trong bộ nhớ không tốn gì, và
`descendantIds` đủ để hỏi `posts` bằng một câu `in (…)`. Giữ `path` là giữ một
giá trị nói cùng một điều với `parent_id` ở hai chỗ, và nó sẽ có ngày lệch nhau
— đúng lý do `hour_logs` không có cột ấy (migration 0019).

## Luật chống vòng lặp nằm ở hai nơi, và vì sao

`canReparent` được viết hai lần: `frontend/src/lib/contentTree.ts` và
`backend/lib/modules.ts`. Frontend cần để CMS làm mờ lựa chọn không hợp lệ;
backend cần vì frontend không phải thứ duy nhất gọi được API.

Không gộp làm một vì frontend và backend là hai deployment Vercel riêng, cây
phụ thuộc riêng; cho backend import ra ngoài thư mục của nó là đánh đổi rủi ro
deploy lấy hai mươi dòng. Thay vào đó `frontend/src/lib/moduleTree.contract.test.ts`
chạy **cả hai** trên cùng một bảng trường hợp và bắt chúng trả lời giống nhau —
cùng cách `templateContract.test.ts` canh danh sách template.

Vòng lặp bị chặn ở API chứ không bằng trigger, theo tiền lệ migration 0019.

## Chạy trên cơ sở dữ liệu thật thì chưa

Migration **chưa được áp**. Môi trường phiên này là bản clone mới trong
container, không có `backend/.env.local`, nên không có `SUPABASE_DB_URL` —
`scripts/db-exec.mjs` không chạy được. Không có biến môi trường nào thay thế
(đã kiểm `env`).

Mã đã viết để **an toàn khi merge trước lúc migration chạy**:
- `ModuleRow.parent_id` khai là `parent_id?: string | null`, vắng mặt đọc thành
  "không có cha" — `contentTree.ts:parentIdOf`.
- `handleDelete` bỏ qua lỗi Postgres `42703` ("không có cột ấy") thay vì trả
  `500` — nếu không, xoá module sẽ hỏng cho tới khi migration chạy.
- Đường `PATCH` có `parent_id` chỉ chạy khi client gửi `parent_id`, mà chưa
  client nào gửi.

Có test cho cả ba đường "chưa migration": `contentTree.test.ts`,
`useModules.test.ts`, `moduleTree.contract.test.ts`.

## Đụng dữ liệu

- Bảng `modules`: **thêm** cột `parent_id`, thêm index `modules_parent_idx`,
  thêm `comment on column`. Không sửa, không xoá cột nào.
- Bảng `posts`: không đụng.
- Endpoint đụng tới: `PATCH /api/modules/:id` (nhận thêm một khoá),
  `DELETE /api/modules/:id` (thêm một lần đọc và một mã lỗi mới),
  `POST /api/modules` (hàng mới có `parent_id: null`).
- Chưa ghi gì vào cơ sở dữ liệu thật của chủ site trong PR này.

## Đối chiếu bộ luật

- **Nhóm 05 · Điều hướng** — chưa mâu thuẫn ở PR này. Luật viết đường dẫn thành
  ba chặng cố định (`[[landing]] › [[home]] › module`, ví dụ
  `Trang chủ › Mục lục › sensory › Sensory Lexicon`); PR 1 không đụng
  breadcrumb nên luật vẫn đúng. **PR 2 sẽ mâu thuẫn** và phải sửa luật này
  thành câu không đếm chặng.
- **Nhóm 05** cũng nói "Với mọi module đã tạo và công khai: luôn hiện, kể cả
  khi chưa có bài nào". `landingModules` nay bỏ hàng con khỏi trang chủ — không
  mâu thuẫn, vì luật ấy nói về sidebar và mục lục, và hàng con vẫn hiện ở cả
  hai chỗ đó. Nhưng câu chữ đang mỏng, nên nêu ra đây.
- **Nhóm 01 · Màu** viết cứng ba module ("hồng cho sensory, xanh lá cho
  biochemistry 101, vàng đất cho roasting"). Chưa đụng ở PR này; sẽ phải đổi
  khi màu kế thừa theo nhánh.

## Kiểm chứng

- `npm test`: **127 file, 1287 test xanh**, 2 skip. Typecheck sạch cả ba
  tsconfig.
- `vite build`: xanh, 241 module.
- Test mới: 23 cho `contentTree`, 13 cho hợp đồng hai bản `canReparent`, 9 cho
  `postGroups`, 4 cho `landingModules` với cây.
- Một test tôi viết sai lúc đầu và nó bắt được: khẳng định "chuyển `c` vào dưới
  `a` phải bị từ chối" — sai, vì `a` không phải hậu duệ của `c`. Cả hai bản
  `canReparent` đều trả `ok` và đều **kết thúc** trên bảng có sẵn vòng lặp, tức
  đúng điều test định kiểm. Đã sửa khẳng định, không sửa mã.
- Chưa mở trình duyệt xem: PR này không đổi gì nhìn thấy được trên màn hình, và
  `/practice` nằm sau cổng đăng nhập.

## Việc tiếp theo

- **Áp migration 0025** lên cơ sở dữ liệu hosted. Cần `SUPABASE_DB_URL`.
- **PR 2** — breadcrumb, sidebar và sơ đồ trang đọc `ancestorsOf`; đổi
  `MapRow.kids` từ `string[]` sang `MapRow[]` (`Cms.tsx`). Xong PR 2 là tạo ba
  hàng cha trong CMS và cây ba tầng chạy thật.
- **PR 3** — kho đăng ký cho dàn trang và template, bỏ ràng buộc `check`, xoá
  `frontend/src/content/modules.ts` (82 dòng chép lại dữ liệu module, hiện chỉ
  còn một test import lấy mỗi cái kiểu).

## Đề xuất luật (chưa ghi vào `logic.ts`)

- Độ sâu của mục lục là một sự kiện của dữ liệu, không phải một con số viết
  trong mã. Màn nào cần biết mình ở tầng mấy thì hỏi tổ tiên, không đếm.
- Một module không nằm trong chính nó, trực tiếp hay qua một vòng dài. Đây là
  luật duy nhất cây có.
- Xoá một module đang chứa module khác thì bị từ chối, không phải xoá lan. Bài
  viết thì ngược lại: chúng theo module chứa chúng.
- Một hàng có cha không đọc được thì hiện ở tầng trên cùng, không biến mất. Một
  mục không tới được đọc như một mục đã bị xoá.

## SPEC lỗi thời

- Chưa. PR này không đổi gì người đọc thấy. `docs/SPEC.html` sẽ lỗi thời từ PR 2.
