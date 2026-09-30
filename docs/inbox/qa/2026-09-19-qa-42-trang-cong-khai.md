# QA-42 — trang công khai thôi kéo `body` của mọi bài

- **PR:** (chưa mở — chờ PR #11 merge xong mới đẩy nhánh này)
- **Nhánh:** `claude/project-thread-rsb5j4`
- **Lane:** QA hot-fix
- **Ngày:** 2026-09-19

Nối tiếp QA-39 (gộp đọc-rồi-ghi ở các route ghi) và QA-40 (cột
`posts.thumbnail_url`). QA-40 đã sửa danh sách bài **trong CMS**; ghi chú này
sửa đúng chuyện đó ở **trang công khai**, nơi khách vào đọc.

---

## [SỬA LỖI] `usePublishedPosts` không còn `select('*')`

**Trước:** `frontend/src/data/usePublishedPosts.ts` → `usePublishedPosts` gọi
`supabase.from('posts').select('*')`. `body` là toàn bộ nội dung một bài, nên
mỗi lần hook chạy là kéo về nội dung đầy đủ của mọi hàng nó khớp.

Nặng nhất là hai chỗ gọi hook **không kèm `moduleId`**, tức là khớp mọi bài đã
đăng của cả site:

- `frontend/src/components/Sidebar.tsx:237` — thanh bên, có mặt ở mọi trang
- `frontend/src/screens/Landing.tsx:373` — Trang chủ
- `frontend/src/screens/IndexScreen.tsx:420` — trang mục lục

**Sau:** thêm hằng `LIST_COLUMNS` trong cùng file, liệt kê **mọi cột của
`posts` trừ `body`**, và dùng nó làm mặc định.

Không có cú pháp "tất cả trừ một cột" ở PostgREST, nên phải liệt kê tay. Danh
sách đối chiếu với `backend/lib/posts.ts` → `POST_COLUMNS`; thứ giữ cho hai bên
khớp nhau là `backend/scripts/verify-schema.mjs`, không phải TypeScript.

**Tái hiện trước khi sửa:** mở DevTools → Network, vào trang chủ, tìm request
tới `/rest/v1/posts`. Query string cũ là `select=*`; giờ là danh sách cột.

## [ĐỔI HÀNH VI] thêm tuỳ chọn `withBody`

`UsePostsOptions` có thêm `withBody?: boolean`, mặc định `false`. Bật lên thì
hook quay về `select('*')`.

**Trước:** mọi chỗ gọi đều nhận `body`.
**Sau:** chỉ nhận `body` khi tự nói ra là cần.

Đúng **một** chỗ bật: `frontend/src/screens/Notes.tsx:374` —
`usePublishedPosts({ moduleId: 'ghi01', withBody: true })`. Trang Ghi mở bài
ngay tại chỗ (`OpenedPost` → `PostRenderer`) chứ không sang trang riêng, nên
nó thật sự cần thân bài trong danh sách.

Năm chỗ gọi còn lại không bật, và đã kiểm từng chỗ là không đọc `body`:

| Chỗ gọi | Đọc gì từ hàng |
|---|---|
| `Sidebar.tsx:237` | đếm và tiêu đề |
| `Landing.tsx:373` | qua `lib/moduleEntries.ts` → `moduleEntries` |
| `IndexScreen.tsx:420` | qua `moduleEntries` |
| `Archive.tsx:35` | tiêu đề, ngày, trạng thái |
| `ModuleScreen.tsx:627` | qua `moduleEntries` |
| `Article.tsx:51` (`fallback`) | chỉ `.id` — xem `fallbackId` |
| `Article.tsx:56` (`siblings`) | điều hướng bài trước/sau |

**Thân bài của trang đọc không đi qua hook này.** `Article.tsx` lấy bài đang
đọc từ `frontend/src/data/usePost.ts` → `usePost`, và `usePost` **vẫn để
`select('*')`** — một hàng thì lấy cả hàng là đúng. File đó không đổi.

## [SỬA LỖI] `postThumbnail` thôi lội `body`

**Trước:** `frontend/src/lib/postThumb.ts` có hàm nội bộ `findSrc` đi đệ quy
vào `body` tìm `src`/`imageUrl`, tới độ sâu 4. Tức là ảnh đại diện của một ô
trong danh sách chỉ vẽ được nếu đã kéo cả `body` về — chính là thứ QA-42 đang
bỏ.

**Sau:** `findSrc` xoá hẳn. `postThumbnail` còn một dòng:

```ts
return post.hero_image_url || post.thumbnail_url || null
```

Được như vậy vì QA-40 đã thêm cột `posts.thumbnail_url` và backend ghi sẵn
tấm ảnh đầu tiên trong thân bài vào đó (`backend/lib/posts.ts` →
`firstImageIn`, gọi ở `backend/api/posts/index.ts` khi tạo và
`backend/api/posts/[id]/index.ts` khi sửa `body`). Câu trả lời cũ phải tính
lúc vẽ; giờ nó nằm sẵn thành một cột.

Thứ tự ưu tiên giữ nguyên như bản cũ: ảnh bìa người dùng đặt tay
(`hero_image_url`) thắng ảnh lấy từ thân bài.

Tham số đổi từ `PostRow` sang `Pick<PostRow, 'hero_image_url' | 'thumbnail_url'>`
để hàng admin cũng truyền vào được.

## [SỬA LỖI] `useEffect` thiếu `withBody` trong danh sách phụ thuộc

Gặp khi đang viết phần trên. Thêm `withBody` vào mảng deps của `useEffect`
trong `usePublishedPosts`; không có nó thì đổi cờ giữa chừng sẽ không gọi lại.
Hiện chưa chỗ nào đổi cờ lúc chạy, nên đây là sửa lỗi chưa kịp xảy ra.

---

## Ép kiểu ở `setData` — vì sao cần

```ts
setData((data ?? []) as unknown as PostRow[])
```

Kiểu sinh sẵn của `supabase-js` **đọc chuỗi cột ngay trong lời gọi
`.select()`** và suy ra kiểu hàng từ đó. Nó không theo nổi một chuỗi chọn lúc
chạy (`withBody ? '*' : LIST_COLUMNS`) — trả về `ParserError`, và
`npm run typecheck` báo `TS2352`.

`PostRow` ở file này vốn **viết tay**, không sinh từ schema, nên phép ép không
làm mất thứ gì đang thật sự được kiểm. Có comment giải thích tại chỗ.

---

## Bảng, cột, endpoint đã đụng

- Bảng `posts` — **chỉ đọc**, không ghi gì.
- Cột đọc thêm: `thumbnail_url` (QA-40 thêm), `theme_color`. Cột thôi đọc ở
  đường mặc định: `body`.
- Endpoint: `GET /rest/v1/posts` của Supabase, gọi thẳng từ frontend bằng anon
  key. **Không** đụng route nào trong `backend/api/`.
- Không có migration, không có DDL. Cột `thumbnail_url` chủ site đã chạy tay ở
  SQL Editor hôm 2026-09-18 (QA-40).

## Đối chiếu bộ luật

`frontend/src/content/logic.ts`: không thấy luật nào nói về khối lượng dữ liệu
một trang tải, nên bản sửa này **không mâu thuẫn** với luật nào và cũng không
được luật nào đòi. Nó là chuyện hiệu năng, không phải chuyện hành vi hiển thị
— màn hình vẽ ra y hệt trước.

## Kiểm

Chạy từ gốc repo:

```
npm run lint       # 0 errors, 1 warning có sẵn ở ActivityRow.tsx:535
npm run typecheck  # sạch
npx vitest run     # 125 file, 1296 pass, 2 skip
cd frontend && npx vite build   # built in 2.53s
```

Test sửa/thêm:

- `frontend/src/lib/postThumb.test.ts` — viết lại 4 test theo hợp đồng mới,
  trong đó có một test khẳng định trả `null` chứ không phải `undefined` khi
  hàng không có cột.
- `frontend/src/data/usePublishedPosts.test.ts` — thêm 3 test: chuỗi select
  mặc định không phải `'*'`, không chứa `body`, có chứa `thumbnail_url`; đường
  `includeArchived` cũng vậy; `withBody: true` thì chọn `'*'`.
- `frontend/src/lib/moduleEntries.test.ts` — không sửa, nhưng nó bắt được lỗi:
  bản `postThumbnail` đầu tiên của tôi trả `undefined` trong khi test chờ
  `null`. Thêm `|| null` vào cuối.

**Chưa đo được bằng số thật.** Container này không có `.env.local` và chính
sách mạng chặn `beanweirdo.vercel.app`, nên mọi con số trong ghi chú này đều
đọc ra từ code, không phải đo.

---

## Đề xuất luật (ý kiến, không phải sự thật)

1. Một hook danh sách không nên mặc định `select('*')`. Cột nặng phải được
   người gọi nói ra là cần.
2. `Notes.tsx` vẫn có thể bỏ `withBody: true` nếu đổi sang gọi `usePost` lúc
   người đọc bấm mở. Tôi không làm trong PR này vì nó đổi cách màn hình ấy
   chạy chứ không chỉ đổi lượng dữ liệu — việc của lane Kiến trúc thì đúng hơn.
3. `apiClient.updateModule` còn khai báo trả `Promise<Module>` trong khi
   `/api/modules/[id]` (sau PR #11) chỉ trả `id` cộng các cột vừa ghi. Thu hẹp
   lại thành `Partial<Module> & { id: string }` thì đúng hơn, nhưng nó kéo theo
   `Cms.tsx` — file lane UI đang sửa — nên tôi để lại.
