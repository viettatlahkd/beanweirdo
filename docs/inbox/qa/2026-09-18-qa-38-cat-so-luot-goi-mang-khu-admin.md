# QA-38: cắt số lượt gọi mạng của khu admin

PR: #1    nhánh: `claude/project-thread-rsb5j4`
Cắt từ: `origin/main` @ `d46f9c2`

Chủ site báo: *"hiện tại tương tác gọi api các thứ siêu siêu chậm, tức là mỗi
lần click các butotn phải một lúc thì mới được ấy?"*

Năm chỗ, không chỗ nào là truy vấn chậm. Bốn chỗ trong PR này, bốn chỗ còn lại
để ở mục cuối.

## Đã sửa

### [SỬA LỖI] `applyCorsHeaders` thiếu `Access-Control-Max-Age`

`backend/lib/cors.ts` → `applyCorsHeaders` đặt bốn header CORS và không đặt
`Access-Control-Max-Age`.

Ba sự thật cộng lại:

- Khu admin và API là hai deployment khác origin. Bằng chứng:
  `frontend/src/admin/lib/apiClient.ts` → hằng `API_BASE` đọc
  `VITE_ADMIN_API_URL`, và `applyCorsHeaders` đọc `ADMIN_ALLOWED_ORIGIN`.
- `apiClient.ts` → `request` gắn `Authorization: Bearer` vào mọi lời gọi. Header
  này không nằm trong danh sách an toàn của CORS, nên trình duyệt hỏi phép trước
  **cả với `GET`**, không riêng `POST`/`PATCH`/`DELETE`.
- Thiếu `Access-Control-Max-Age`, Chrome nhớ phép ấy 5 giây. Hai lần bấm cách
  nhau hơn 5 giây là hỏi lại từ đầu.

Và `OPTIONS` không dừng ở biên: `cors.ts` → `withCors` trả 204 bên trong chính
function, nên chuyến đi thừa ấy còn có thể đánh thức một lambda nguội.

Tôi thêm `res.setHeader('Access-Control-Max-Age', '86400')` vào cuối
`applyCorsHeaders`.

Cách tái hiện (chưa chạy được ở môi trường tôi đang ngồi — xem mục "Chưa đo
được"): mở `/ad-post`, DevTools › Network, bấm một nút, đợi hơn 5 giây rồi bấm
nút khác. Trước bản sửa: mỗi lần bấm là một cặp `OPTIONS` + request thật.

### [SỬA LỖI] `await` nằm trong vòng lặp, ba chỗ

- `backend/api/posts/index.ts` → `handleReorder`
- `backend/api/modules/index.ts` → `handleReorder`
- `backend/api/hours.ts` → `applyMoves`

Cả ba đều `for (…) { await supabase…update() }`. Kéo thả 10 bài là 10 lượt tới
DB xếp hàng chờ nhau, rồi mới tới câu `select` cuối.

Tôi đổi cả ba sang `Promise.all(…map(…))` và lấy lỗi đầu tiên bằng
`writes.find((w) => w.error)`. Số câu lệnh không đổi, chỉ khác là chúng đi cùng
lúc. Các dòng được ghi là rời nhau — mỗi câu `update` lọc theo `id` riêng, hoặc
theo `in('id', move.ids)` với các tập id rời nhau — nên thứ tự chúng tới nơi
không quyết định kết quả.

Thứ tự gọi `supabase.from(...)` không đổi, nên hai test cũ dựa vào
`mockReturnValueOnce` theo thứ tự (`posts/index.test.ts` "rewrites sort_order,
scoped to the module" và `modules/index.test.ts` "rewrites sort_order to 1..N in
the given order") vẫn xanh.

### [ĐỔI HÀNH VI] `PATCH /api/posts/:id` thôi trả về cả bài

`backend/api/posts/[id]/index.ts` → `handlePatch`.

**Trước:** `.select(POST_DETAIL_COLUMNS)`, mà `POST_DETAIL_COLUMNS = '*'`
(`backend/lib/posts.ts`). Phản hồi là `{ post: toPostDetail(row) }` — cả bài, kể
cả `body`.

**Sau:** `.select(returned)` với `returned = ['id', ...Object.keys(patch)]` đã bỏ
`body` ra. Phản hồi là `{ post: data }` — đúng những cột vừa vá, cộng `id`, và
không bao giờ có `body`.

Lý do: `frontend/src/admin/screens/Editor.tsx` → `applyPatch` tự lưu mỗi lần rời
ô, nên đổi một tiêu đề trong bài longform là gửi cả thân bài lên rồi kéo cả thân
bài về, để báo lại một giá trị người gọi vừa đưa.

Không chỗ nào đọc giá trị trả về. Tôi đã rà hết chỗ gọi `updatePost`:
`Editor.tsx` → `applyPatch`, `writeBody`, `step`; `frontend/src/screens/Cms.tsx`
→ `patchPost`; `frontend/src/admin/components/PostsPanel.tsx` → nút ghim. Cả năm
đều cập nhật state lạc quan trước rồi bỏ qua phản hồi.

Câu `update` vẫn mang `body` đi như cũ — chỉ phần trả lời bớt đi. Có test giữ
đúng điều đó.

Kiểu trả về ở `apiClient.ts` → `updatePost` đổi từ `Promise<PostDetail>` sang
`Promise<Partial<PostDetail> & { id: string }>`.

**Đây là đổi hành vi của API, nên specs phải đổi theo.** Tôi không sửa
`docs/SPEC.html` — đó là file của lane Tài liệu. Cần ghi lại: `PATCH
/api/posts/:id` trả về một phần bản ghi, không phải `PostDetail` đầy đủ.

### [ĐỔI HÀNH VI] `rawAdd` vẽ dòng mới trước khi máy chủ trả lời

`frontend/src/data/useHours.ts` → `rawAdd`.

**Trước:** `await createLog(entry)` rồi mới `setLogs(...)`.
**Sau:** chèn dòng với một id tạm (`tmp-…`) ngay, gọi `createLog`, rồi thay id
tạm bằng dòng thật. Hỏng thì `failed` gọi `load(true)` tải lại danh sách nên dòng
tạm biến mất cùng lúc lời báo lỗi hiện ra.

`rawPatch` và `rawRemove` ngay bên dưới trong cùng file đã lạc quan từ trước. Nên
trên `/practice`, sửa và xoá thì tức thì còn thêm thì đứng một nhịp — cảm giác
"lúc nhanh lúc chậm" đến từ chỗ đó.

Id tạm không bao giờ đi tới máy chủ: `createLog(entry)` nhận `entry` chứ không
nhận dòng đã chèn.

## Đối chiếu với bộ luật

`frontend/src/content/logic.ts`:

- **08.4** — *"Ở mọi mục tạo mới: tạo dòng trống trước rồi con trỏ nhảy vào"*.
  `rawAdd` cũ **không** theo luật này: nó chờ máy chủ rồi mới vẽ. Bản sửa đưa nó
  về đúng luật.
- **16.1** — *"Hàng mới bắt đầu tại thời điểm bấm 'thêm hoạt động'"*. Cùng hướng
  với trên.
- **08.3** — *"lưu ngay từng thay đổi, không có nút lưu toàn trang"*. Bản sửa
  `handlePatch` không đụng tới: số lần lưu không đổi, chỉ có phản hồi nhỏ đi.

Không có bản sửa nào mâu thuẫn với một luật trong `logic.ts`.

## Bảng, cột và endpoint đã đụng

| Endpoint | Bảng | Cột |
|---|---|---|
| Mọi endpoint (qua `withCors`) | — | — |
| `PATCH /api/posts/:id` | `posts` | ghi: không đổi. Đọc lại: `id` + các cột vừa vá, **bỏ** `body`. Trước đây đọc lại `*`. |
| `PUT /api/posts` | `posts` | ghi `sort_order`, `updated_at`; đọc `POST_SUMMARY_COLUMNS` |
| `PUT /api/modules` | `modules` | ghi `sort_order`; đọc `*` |
| `PATCH /api/hours?resource=assign` | `hour_logs` | ghi `kind` hoặc `project` |
| `DELETE /api/hours?resource=kinds` | `hour_logs` | ghi `kind` hoặc `project` (qua `applyMoves`) |
| `POST /api/hours` | `hour_logs` | không đổi ở server; chỉ phía gọi đổi |

Không có migration. Không đụng schema. Không đọc ghi dữ liệu thật của chủ site.

## Kiểm

`npm test`: 125 file, 1243 test xanh, 2 skipped. Trước bản sửa: 124 file, 1239
test. Bốn test mới:

- `backend/lib/cors.test.ts` — `Access-Control-Max-Age` có mặt.
- `backend/api/posts/[id]/index.test.ts` — `PATCH` chọn đúng cột vừa vá, không
  bao giờ chọn `body`, và câu `update` vẫn mang `body` đi.
- `frontend/src/data/useHours.optimistic.test.ts` — hai test: dòng có mặt trước
  khi máy chủ trả lời rồi được thay bằng dòng thật; và khi hỏng thì dòng tạm biến
  mất cùng lúc lời báo lỗi hiện ra.

`vite build`: xanh, 4.04s.

## Chưa đo được

Không có số đo nào từ production trong PR này.

- `backend/.env.local` và `frontend/.env.local` không có ở bản clone tôi đang
  làm việc, nên không gọi được Supabase thật.
- Chính sách mạng của môi trường tôi ngồi chặn `beanweirdo.vercel.app`: `curl`
  trả `CONNECT tunnel failed, response 403`.

Nên mọi con số về số lượt round trip ở trên là **đếm từ code**, không phải bấm
đồng hồ. Thứ duy nhất tôi đo thật là chi phí nạp `@supabase/supabase-js` lúc cold
start — `import` 44.7/45.8/46.4 ms và `createClient()` 69.1/69.5/70.9 ms qua ba
lần chạy, trên Node v22.22.2 ở máy này, không phải trên Vercel.

`backend/lib/supabase.ts` → `getSupabase` đã cache client nên chi phí đó chỉ trả
một lần mỗi instance. Chỗ này viết đúng từ trước, tôi không đụng tới.

## Chưa làm

Bốn việc còn lại, không gộp vào PR này vì mỗi cái rủi ro hơn hẳn bốn cái trên:

1. **Ghim region cho backend.** Không có `backend/vercel.json` nên Vercel chạy
   mặc định ở `iad1`. Nếu Supabase ở Singapore thì mỗi lượt function → DB đi vòng
   nửa vòng trái đất, và mỗi request có 1–3 lượt như thế. Cần biết region của
   Supabase trước khi làm; đã hỏi chủ site, chưa có câu trả lời.
2. **Upload ảnh lên thẳng Storage.** `backend/api/upload.ts` → `handler` nạp cả
   file vào bộ nhớ function rồi đẩy sang Supabase, nên người dùng chờ hai lần
   thời gian. `createSignedUploadUrl` để browser `PUT` thẳng sẽ bỏ được lượt thứ
   hai.
3. **Gộp `createTag` + `createPost`.** `MetadataStep.tsx` → `submit` gọi
   `createTag`, rồi `NewPostWizard.tsx` → `start` gọi `createPost`, rồi `Editor`
   mount gọi `getPost` + `listModules`. Bốn lượt nối tiếp, cộng preflight là
   khoảng tám chuyến mạng trước khi màn soạn hiện ra.
4. **Cột `thumbnail_url` cho `posts`.** `backend/lib/posts.ts` →
   `POST_SUMMARY_COLUMNS` có `body` trong danh sách select, chỉ để
   `toPostSummary` chạy `findSrc(row.body)` lấy một cái ảnh. Chú thích ngay trên
   hằng ấy đã nhìn ra vấn đề nhưng mới giải quyết được một nửa: `body` không gửi
   ra browser, nhưng vẫn đi từ Postgres sang function. Việc này cần DDL nên phải
   qua SQL Editor trên dashboard.

## Đề xuất luật (ý kiến, không phải sự thật)

- Mọi hàm ghi trong `useHours`, `Cms` và `Editor` đều lạc quan, trừ `rawAdd` —
  và không có gì trong code nói vì sao chỗ đó khác. Có thể đáng thành một luật
  trong nhóm 08: mọi thao tác ghi vẽ trước, gọi sau, không có ngoại lệ.
- `vite build` cảnh báo bundle 1,066 kB (gzip 322 kB) trong một chunk. Không liên
  quan tới PR này và không phải nguyên nhân chậm khi bấm nút, nhưng nó là thứ
  người dùng chờ ở lần tải đầu. Để lane Kiến trúc quyết có tách chunk không.
