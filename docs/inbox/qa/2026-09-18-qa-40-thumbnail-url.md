# QA-40: danh sách bài thôi kéo cả thân bài về

PR: #8    nhánh: `claude/project-thread-rsb5j4`
Cắt từ: `origin/main` @ `d42aa72`

Phần còn lại của QA-39, chỗ duy nhất t đã hoãn có chủ ý vì nó cần DDL. Chủ site
đã chạy DDL lúc 17:04 và lượt điền dữ liệu ngay sau đó.

## Đã sửa

### [ĐỔI HÀNH VI] `POST_SUMMARY_COLUMNS` bỏ `body`, thêm `thumbnail_url`

`backend/lib/posts.ts`.

Trước: hằng ấy kết thúc bằng `, body`. Không phải vì danh sách bài cần nội dung
bài, mà vì `toPostSummary` tính ảnh đại diện **trên đường trả về**:
`row.hero_image_url || findSrc(row.body)`. Nghĩa là mỗi lần mở `/ad-post`, toàn
bộ nội dung của **mọi** bài đi qua mạng để vẽ một hàng ô ảnh 44px.

Sau: câu select lấy `thumbnail_url` thay cho `body`, và `toPostSummary` trả
`row.hero_image_url || row.thumbnail_url`.

Hai chỗ dùng hằng này đều đổi theo: `handleList` (`GET /api/posts`) và
`handleReorder` (`PUT /api/posts`).

### [ĐỔI HÀNH VI] `findSrc` đổi tên thành `firstImageIn` và được export

Cùng file. Thân hàm không đổi một dòng nào — vẫn depth 4, vẫn `src` rồi
`imageUrl`, vẫn lần theo `fig`/`items`/`sections`/`blocks`/`cards`. Chỉ khác
**lúc nào nó chạy**: trước là lúc đọc danh sách, nay là lúc ghi bài.

### [ĐỔI HÀNH VI] Hai chỗ ghi `body` tự tính lại `thumbnail_url`

- `backend/api/posts/index.ts` → `handleCreate`: thêm
  `thumbnail_url: firstImageIn(startingBody)` vào câu `insert`. Bài mới dựng từ
  template hoặc copy từ bài khác có thể mang sẵn ảnh bên trong.
- `backend/api/posts/[id]/index.ts` → `handlePatch`: nếu `patch` có khoá `body`
  thì đặt `patch.thumbnail_url = firstImageIn(patch.body)`. Tính từ giá trị
  **đang gửi lên**, không đọc lại từ DB, nên vẫn đúng một câu lệnh.

`thumbnail_url` **không** nằm trong `PATCHABLE`: nó là cột dẫn xuất, khách gọi
không đặt được. Có bài kiểm riêng cho điều đó.

### Vì sao cột chỉ giữ "ảnh trong thân bài", không giữ ảnh bìa

Đây là quyết định thiết kế duy nhất trong PR này, nên nói rõ.

`hero_image_url` đã là một cột riêng. Nếu `thumbnail_url` giữ **kết quả cuối**
(bìa, không có bìa thì ảnh trong bài) thì nó có **hai** đầu vào, và phải tính
lại ở cả hai chỗ — đổi bìa cũng phải nhớ, đổi thân bài cũng phải nhớ. Quên một
chỗ là ô ảnh sai mà không ai biết.

Để cột chỉ phụ thuộc `body` thì có đúng **một** lúc phải tính lại. Phần ghép
nằm ở `toPostSummary`, chỗ rẻ nhất, vì nó chỉ là một phép `||` trên dữ liệu đã
có sẵn trong tay.

Hệ quả: câu SQL điền dữ liệu **ghi đè** lên phần mà câu DDL vừa điền từ
`hero_image_url`. Cố ý, và đã nói trước với chủ site.

### [SỬA LỖI] `verify-schema.mjs` kiểm thêm cột `thumbnail_url`

`backend/scripts/verify-schema.mjs`. Cột này vào DB bằng DDL chạy tay trên
dashboard chứ không bằng file migration, nên không có gì bảo đảm nó có mặt ở
mọi môi trường. Mà thiếu nó thì **mọi** request tới danh sách bài trả 500 —
đúng cái đã xảy ra một lần với migration 0016, và chính comment trên
`POST_SUMMARY_COLUMNS` kể lại chuyện đó. Thêm một dòng assert là rẻ hơn nhiều
so với lần phát hiện sau.

## Bài kiểm

`backend/lib/posts.test.ts`: tách `describe('toPostSummary — thumbnail')` cũ làm
hai. Phần lần vào thân bài chuyển sang `describe('firstImageIn')` và giữ nguyên
mọi trường hợp cũ (ảnh lồng nhau, `imageUrl`, không có ảnh, body rỗng), thêm một
ca `imageUrl` mà trước đây không có test riêng. Phần còn lại kiểm đúng phép ghép
`bìa || cột`.

Bài kiểm mới khoá thiết kế lại:
- `posts/index.test.ts` — "lấy thumbnail_url, và không hỏi body": đọc thẳng
  chuỗi cột mà `handleList` truyền cho `.select()` và khẳng định nó **không**
  chứa `body`. Đây là bài kiểm sẽ đỏ nếu ai đó thêm `body` lại vào hằng.
- `posts/index.test.ts` — hai ca cho `handleCreate`, đọc thẳng đối tượng truyền
  cho `.insert()`.
- `posts/[id]/index.test.ts` — bốn ca cho `handlePatch`: tính lại khi thân bài
  đổi, về `null` khi bài hết ảnh, **không** đụng tới cột khi lần sửa không chạm
  thân bài, và khách gọi tự gửi `thumbnail_url` thì bị bỏ qua.

Toàn bộ: lint 0 lỗi, typecheck sạch, 125 file / 1288 test xanh, `vite build` xanh.

## Bảng, cột, endpoint đã đụng

| Endpoint | Đổi gì |
|---|---|
| `GET /api/posts` | Câu select bỏ `body`, thêm `thumbnail_url`. Thân trả về không đổi |
| `PUT /api/posts` (reorder) | Như trên, cùng hằng |
| `POST /api/posts` | Câu insert ghi thêm cột `thumbnail_url` |
| `PATCH /api/posts/:id` | Ghi thêm `thumbnail_url` khi và chỉ khi lần sửa chạm `body` |
| `GET /api/posts/:id` | Không đổi (vẫn `*`, vẫn trả cả `body`) |

| Bảng | Cột | Đổi gì |
|---|---|---|
| `posts` | `thumbnail_url` | **Cột mới.** Đọc ở hai route danh sách, ghi ở hai route tạo/sửa |
| `posts` | `body` | Thôi **đọc** ở hai route danh sách. Cách ghi không đổi |

Không đụng bảng nào khác.

## Đối chiếu bộ luật

Luật **15.1** ("Ô ảnh không có ảnh thì là hộp màu, không tính là ảnh") vẫn giữ:
`thumbnail_url` rỗng thì `PostCard.tsx` vẽ hộp màu như cũ, và t có bài kiểm cho
đúng đường `null` ấy ở cả hai chỗ ghi.

Không bản sửa nào mâu thuẫn với luật nào.

## Chưa đo được

Vẫn không có `.env.local` ở container này và mạng vẫn chặn
`beanweirdo.vercel.app`, nên **không con số nào là số đo**. Cỡ gói dữ liệu tiết
kiệm được phụ thuộc vào bài dài bao nhiêu, và t không đọc được dữ liệu thật.

Chủ site tự chạy DDL và câu điền dữ liệu; t không chạy lệnh nào vào DB thật.

Một khác biệt đã báo trước với chủ site: câu SQL điền dữ liệu dùng
`jsonb_path_query_first(body, '$.**.src')`, đi theo thứ tự duyệt của Postgres,
còn `firstImageIn` đi theo thứ tự riêng của nó. Bài nào có nhiều ảnh thì hai bên
**có thể** chọn khác tấm. Không sai, và lần sửa bài kế tiếp sẽ đưa nó về đúng
hàm trong mã.

## Đề xuất luật

1. **Một cột dẫn xuất chỉ nên có một đầu vào.** Hai đầu vào là hai chỗ phải nhớ
   tính lại, và chỗ bị quên không kêu lên tiếng nào. Phần ghép để chỗ đọc làm.

2. **Cột nào vào DB bằng DDL chạy tay thì thêm một dòng vào `verify-schema.mjs`
   ngay lúc đó.** Migration có file làm bằng chứng, DDL chạy tay thì không có gì
   cả ngoài trí nhớ.

## Một chỗ khác, không thuộc PR này

`frontend/src/data/usePublishedPosts.ts` (dòng 99–100) gọi
`supabase.from('posts').select('*')` cho **trang công khai**. Tức là mọi khách
vào site đều tải toàn bộ thân bài của mọi bài đã đăng, và
`frontend/src/lib/postThumb.ts` vẫn tính ảnh đại diện từ `body` y như khu admin
từng làm.

T **không** sửa: đó là đường FE↔DB của trang công khai, thuộc lane kiến trúc, và
nằm ngoài phạm vi chủ site giao ("tốc độ khu admin"). Nhưng nó cùng một hình với
cái vừa sửa, và ở phía có nhiều người dùng hơn hẳn. Nêu ra để lane kiến trúc
quyết.
