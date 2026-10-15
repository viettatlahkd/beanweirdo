# QA-39: một câu thay vì đọc rồi ghi

PR: #6    nhánh: `claude/project-thread-rsb5j4`
Cắt từ: `origin/main` @ `3f15954`

Nối tiếp QA-38. QA-38 đi tìm những chỗ chậm cụ thể và vá từng chỗ. Ghi chú này
đi theo một câu hỏi khác của chủ site: *"quan trọng là cái hệ thống các design
cái cách gọi api, cách ghi vào db hay cách response ấy … vì mấy tác vụ của web
này đơn giản mà hiểu không"*.

Câu hỏi ấy đúng chỗ. Một hình đi qua gần hết các route ghi: **đọc một lượt để
kiểm tra, rồi mới ghi một lượt**, và nhiều chỗ còn đọc lượt thứ ba để trả lời.
Mỗi lượt là một chuyến đi tới Supabase; ba lượt cho một lần bấm nút.

## Đã sửa

### [ĐỔI HÀNH VI] `PATCH /api/tags?id=…` — hai câu thành một

`backend/api/tags.ts`, nhánh `req.method === 'PATCH'`.

Trước: `select('id, label').eq('id', id)` để biết tag có tồn tại không, rồi
`update({ label }).eq('id', id)`.

Sau: một câu `update({ label }).eq('id', id).select('id, label').maybeSingle()`.
Không dòng nào trả về nghĩa là không có tag nào mang `id` ấy — vẫn 404 như cũ,
bằng chính câu ghi.

Mã trạng thái và thân câu trả lời không đổi: 400 khi thiếu `label`, 404 khi
không có tag, 200 với `{ id, label }`.

Nhánh `DELETE` **vẫn đọc trước**, và tôi để nguyên có chủ ý: `notes.k` trỏ vào
**nhãn** chứ không phải `id`, nên không biết nhãn hiện tại thì không tìm được
ghi chép nào đang đeo nó. Lý do ấy nay nằm trong comment ngay trên câu đọc.

### [ĐỔI HÀNH VI] `POST /api/posts/:id/status` — năm trong bảy hành động thành một câu

`backend/api/posts/[id]/status.ts`, và bảng ở `backend/lib/posts.ts` →
`ALLOWED_FROM`, hàm mới `fixedStatusPatch`.

Trước: mọi hành động đều `select('*')` lấy cả bài về, gọi
`computeStatusTransition` để kiểm "hành động này có hợp lệ từ trạng thái hiện
tại không", rồi mới `update`. Hai lượt, lượt đầu kéo cả `body`.

Sau: phép kiểm ấy đi vào mệnh đề `WHERE` của chính câu ghi —
`.eq('id', id).in('status', allowedFrom)`. Không dòng nào trả về thì mới đọc một
lượt (hàm mới `explainMiss`) để phân biệt 404 với 400.

Năm hành động đi lối này: `publish`, `unpublish`, `archive`, `restore`,
`permanently-delete`.

Hai hành động **không**: `delete` và `restore-trash`. Cả hai chép cột này sang
cột kia (`previous_status` ↔ `status`), và PostgREST không nói được
`set previous_status = status` nếu không có stored function. Chúng giữ nguyên
đường cũ, kể cả `computeStatusTransition`.

Thân câu trả lời đổi: trước trả `{ post: <cả bài, mọi cột> }`, nay trả
`{ post: { id, …đúng những cột lần đổi này ghi } }`. Ba chỗ gọi —
`PostsPanel.tsx` (dòng `await transitionStatus(id, action)`), `Editor.tsx`
(`await transitionStatus(postId, 'publish')`) và `Cms.tsx` → `removeEntry` —
đều bỏ qua giá trị trả về; tôi đã đọc cả ba. Kiểu trả về của
`apiClient.transitionStatus` được thu hẹp theo, thành
`(Partial<PostDetail> & { id: string }) | { deleted: true }`.

`permanently-delete` vẫn trả `{ deleted: true }`.

### [ĐỔI HÀNH VI] `/api/hours?resource=kinds` — bỏ `bothSystems()`

`backend/api/hours.ts`. Hàm `bothSystems` bị xoá hẳn.

Trước: cả ba route (`POST`, `PATCH`, `DELETE`) kết thúc bằng
`select('*')` đọc lại **cả bảng** `activity_kinds` rồi trả về hai danh sách
`{ kinds, projects }` đầy đủ.

Lượt đọc ấy thừa. `frontend/src/data/useHours.ts` đã đặt state **trước** khi gọi
máy chủ — `addTag` (`setter((xs) => xs.concat([trimmed]))`), `rawRename`
(`setter((xs) => xs.map(…))`), `removeTag` (`setter((xs) => xs.filter(…))`) đều
sửa danh sách ở ngay đầu hàm. Cả ba **có** đọc giá trị trả về
(`setKinds(saved.kinds); setProjects(saved.projects)`) — nhưng để ghi đè lên
đúng cái chúng vừa tự đặt, bằng một giá trị y hệt. Tôi bỏ ba cặp gán ấy đi cùng
với `bothSystems`.

Sau: `handleCreateKind` trả `{ name, system }`, `handleRenameKind` trả
`{ name: next, system }`, `handleDeleteKind` trả `{ affected }`.

`affected` **được giữ** và vẫn phải đọc: `useHours.removeTag` dùng nó trong
nhánh `undo`, và nó phải gồm cả những hoạt động cũ hơn khoảng thời gian đang
hiện trên màn. Đây là chỗ duy nhất trong ba route còn đọc DB để trả lời. Liên
quan luật **08.5** (xoá thẳng, hoàn tác thay cho hộp xác nhận) và **08.6**
(Ctrl+Z hoàn tác thao tác ghi gần nhất) — bỏ `affected` là phá cả hai.

Không đụng tới **16.3** (tag `khác` không đổi tên, không xoá được): phép chặn ấy
nằm ở chỗ khác trong cùng file và tôi không sửa.

### [ĐỔI HÀNH VI] `POST /api/upload` — cấp vé, không nhận tệp

`backend/api/upload.ts` và `frontend/src/admin/lib/apiClient.ts` → `uploadImage`.

Trước: tệp đi trình duyệt → Vercel → Supabase. `formidable` ghi ra đĩa tạm,
`readFile` nạp cả vào bộ nhớ, rồi `storage.upload()` đẩy tiếp. Người dùng chờ
hết lượt một **rồi mới** bắt đầu lượt hai, và lượt hai bắt đầu từ con số không.

Sau: máy chủ chỉ ký một vé — `createSignedUploadUrl` không chạm byte nào — và
trả `{ path, token, url }`. Trình duyệt gọi `uploadToSignedUrl` đẩy thẳng lên
Storage. Một lượt thay vì hai.

- Thân request đổi từ `multipart/form-data` (trường `file`) sang JSON
  `{ filename, contentType }`. `export const config = { api: { bodyParser: false } }`
  bị bỏ theo.
- `requireAuth` vẫn là thứ quyết định ai xin được vé. Vé tự nó là giấy phép ghi
  cho đúng một đường dẫn, nên không lộ thêm khoá nào ra client.
- Địa chỉ đọc tính sẵn bằng `getPublicUrl` (bucket `post-images` là public từ
  migration 0004), nên chỗ gọi không phải hỏi lại sau khi tải xong.
- **Chữ ký `uploadImage(file): Promise<{ url: string }>` không đổi**, nên bảy
  chỗ đang gọi nó không phải sửa gì, và luật **15.4** (tải xong thì mở ngay màn
  đặt ảnh vào khung) chạy y như cũ.
- Vé ký được nhưng tệp không lên được thì ném `ApiError(…, 502)` với lời riêng,
  không đội lốt lỗi của `/api/upload`.

Đây là chỗ duy nhất trong PR này tôi **không kiểm được đầu-cuối** — xem mục
"Chưa đo được".

### [ĐỔI HÀNH VI] `POST /api/posts` nhận `kindLabel`

`backend/api/posts/index.ts`, `frontend/src/admin/screens/MetadataStep.tsx`.

Trước: màn "bài mới" gọi `createTag(label)` để lấy `id`, **chờ** nó xong, rồi
mới gọi `createPost({ kind: id, … })`. Hai lượt nối tiếp, mỗi lượt một
preflight, trước khi màn soạn kịp mở.

Sau: `MetadataStep.submit()` không còn `async` và không gọi `createTag` nữa; nó
chuyển nguyên văn chữ chủ site gõ qua `kindLabel`. `POST /api/posts` tự tính
`id = slug(kindLabel)` và ghi tag cùng lúc với lúc ghi bài:

```ts
const [{ data, error }, tagResult] = await Promise.all([insert, tagWrite ?? …])
```

`Promise.all` ở đây không phải cho gọn: `PostgrestBuilder` chỉ phát request khi
có ai `.then()` nó, nên dựng câu lệnh vào biến rồi `await` sau **vẫn là nối
tiếp**. Đúng chỗ này tôi đã viết sai một lần trong lúc làm và tự sửa lại.

`kind` (id có sẵn) vẫn nhận được như cũ; `kindLabel` chỉ là đường thứ hai.

### [SỬA LỖI] `slug()` nay dùng chung

File mới `backend/lib/tags.ts` (+ `backend/lib/tags.test.ts`, 5 test).

`POST /api/tags` và `POST /api/posts` nay đều tạo được tag, nên cả hai phải tính
ra **cùng một** `id` cho cùng một nhãn. Hàm `slug` trước nằm riêng trong
`tags.ts`; nay ở một chỗ, hai bên cùng gọi. Lệch nhau một ký tự là hai tag khác
nhau cho một chữ, và `posts.kind` trỏ vào cái không có trong bảng.

Test phủ: dấu tiếng Việt, chữ `đ`, khoảng trắng liền nhau, gạch nối ở hai đầu,
và chuỗi không còn chữ nào.

### [SỬA LỖI] Ba danh sách gần như bất động nay có cache dùng chung

File mới `frontend/src/admin/lib/lists.ts` (+ `lists.test.ts`, 5 test).

`listModules`, `listTags`, `listTemplates` được gọi lại mỗi lần một màn admin
mở: `MetadataStep`, `Editor`, `Preview`, `Cms` đều tự gọi phần của mình. Ba danh
sách ấy đổi vài lần một tháng.

`once()` cache **lời hứa**, không cache kết quả — nên hai màn mở cùng lúc dùng
chung một chuyến đi, chứ không phải hai. Lời hứa hỏng thì bị bỏ ngay
(`.catch((e) => { inFlight = null; throw e })`), nên một lần mạng lỗi không dính
lại.

Chỗ xoá cache (`forgetModules`, `forgetTags`, `forgetTemplates`) đặt ở:
`Cms.tsx` → `run` (trước `load()`), `patchModule`, `dropModule`, và hai chỗ tạo
/ xoá module. Thiếu một chỗ trong số đó là màn hiện danh sách cũ sau khi chủ site
vừa sửa — nên đây là phần tôi kiểm kỹ nhất.

`MetadataStep.test.tsx` phải thêm `beforeEach(() => forgetAllLists())`: cache
sống ở cấp module nên nếu không, test này rò sang test kia trong cùng file.

### [SỬA LỖI] Bỏ gói `formidable` khỏi backend

`backend/package.json`, `package-lock.json`. Sau khi `/api/upload` thôi nhận tệp
thì `formidable` và `@types/formidable` không còn ai gọi (`grep -rn formidable`
chỉ còn một dòng comment). Gói ít hơn thì bundle của function nhỏ hơn, và cold
start là một phần của đúng cái chủ site đang than.

`backend/package-lock.json` không đổi — nó vốn không chứa `formidable`.

## Bảng, cột, endpoint đã đụng

| Endpoint | Đổi gì |
|---|---|
| `PATCH /api/tags?id=` | 2 câu → 1. Thân trả về không đổi |
| `DELETE /api/tags?id=` | Không đổi (giữ lượt đọc, có comment lý do) |
| `POST /api/posts/:id/status` | 5/7 hành động 2 câu → 1. Thân trả về thu hẹp |
| `POST /api/hours?resource=kinds` | Trả `{ name, system }` thay vì `{ kinds, projects }` |
| `PATCH /api/hours?resource=kinds` | Trả `{ name, system }` thay vì `{ kinds, projects }` |
| `DELETE /api/hours?resource=kinds` | Trả `{ affected }` thay vì `{ kinds, projects, affected }` |
| `POST /api/upload` | Nhận JSON `{ filename, contentType }`, trả `{ path, token, url }` |
| `POST /api/posts` | Nhận thêm `kindLabel` |

| Bảng | Cột đọc/ghi | Đổi gì |
|---|---|---|
| `tags` | `id`, `label` | PATCH thôi đọc trước khi ghi |
| `posts` | `id`, `status`, `previous_status`, `deleted_at`, `published_at`, `updated_at`, `kind` | Bỏ `select('*')` ở status; `select` nay chỉ những cột vừa ghi |
| `activity_kinds` | `name`, `system`, `sort_order` | Thôi `select('*')` cả bảng sau mỗi lần ghi |
| `notes` | `id`, `k` | Không đổi |
| Storage `post-images` | — | Ghi bằng vé ký từ trình duyệt thay vì qua function |

## Chưa đo được

Không có `.env.local` ở container này, và chính sách mạng chặn
`beanweirdo.vercel.app`, nên **không con số nào trong ghi chú này là số đo**.
Mọi khẳng định ở trên là đọc mã và đếm số câu lệnh, không phải bấm giờ.

Cụ thể chỗ đáng lo nhất: đường `uploadToSignedUrl` là thay đổi duy nhất mà tôi
không chạy thật được lần nào. Cách thử mất mười giây: mở `/ad-post`, vào một
bài, đính một ảnh, xem ảnh có hiện không. Nếu hỏng, lỗi sẽ nói tên mình
("Không tải được ảnh lên kho: …") chứ không lẫn với lỗi khác.

GitHub Actions vẫn chưa chạy lần nào cho repo này (đã báo ở QA-38), nên thứ thay
CI là `npm ci && npm test` chạy ở máy.

## Đã bỏ khỏi phạm vi

Hai việc tôi nói sẽ làm mà không làm, cùng lý do:

1. **`POST /api/modules` gộp read-then-write.** `backend/api/modules/[id]/index.ts`
   và `backend/lib/modules.ts` đang được lane kiến trúc sửa ở commit `3f15954`.
   CLAUDE.md cấm sửa file của lane khác. Việc này cũng cần DDL. Để lại cho lane
   kiến trúc.

2. **Cột `thumbnail_url`.** Câu DDL đã viết sẵn ở
   `docs/inbox/qa/2026-09-18-qa-39-thumbnail-url.sql`. Phần **mã** thì hoãn có
   chủ ý: `POST_SUMMARY_COLUMNS` đang kéo cả `body` về chỉ để `toPostSummary`
   tìm ảnh đầu tiên (hàm `findSrc`) — đó là payload lớn nhất của khu admin. Bỏ
   `body` khỏi câu select **trước khi** cột mới tồn tại thì mọi request tới danh
   sách bài trả 500. Thứ tự bốn bước nằm trong chính file `.sql`.

## Đề xuất luật

Không phải sự thật về bản sửa, mà là thứ tôi nghĩ nên thành luật. Chủ site quyết.

1. **Một lần bấm nút là một câu lệnh, trừ khi có lý do viết ra được.** Phép kiểm
   "trạng thái hiện tại có cho phép không" gần như luôn đi được vào `WHERE` của
   chính câu ghi, và `returning` rỗng là câu trả lời. Chỉ đọc thêm ở nhánh
   **hỏng**, vì hỏng thì hiếm.

2. **Route ghi trả về đúng thứ nó vừa ghi.** Không đọc lại cả bảng để trả lời.
   Chỗ gọi hoặc đã biết rồi, hoặc tự đọc lại được khi cần.

3. **Tệp không đi qua serverless function.** Ký vé, để trình duyệt đẩy thẳng.

4. **Danh sách gần như bất động thì cache ở client**, nhưng mỗi chỗ ghi phải có
   một chỗ xoá cache đi kèm — và chỗ xoá ấy viết cùng lúc với chỗ ghi, không để
   sau.
