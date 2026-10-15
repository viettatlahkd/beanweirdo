# Nút tải ảnh ở góc mọi ô ảnh cố định của khuôn bài

Nhánh: `claude/project-thread-ey2sz1`, cắt từ `origin/main` @ `543b043`.
PR: chưa mở, đang đợi chủ site gật.

Thư mục `docs/inbox/template/` là mới. Ba lane trong `CLAUDE.md` là Kiến trúc ·
Tài liệu · QA hot-fix, và việc này không thuộc lane nào trong ba: nó là một yêu
cầu tính năng chủ site đặt thẳng, chạm `packages/post-renderer` và một
migration — hai thứ `CLAUDE.md` ghi là **của lane Kiến trúc**. Tôi không sửa
tệp nào lane ấy đang mở (`Cms.tsx`, `PostCard.tsx`, `PostsPanel.tsx` đều không
đụng tới), nhưng lane Kiến trúc nên đọc trước khi merge. Ghi ra đây thay vì để
im.

---

## [ĐỔI HÀNH VI] Mỗi ô ảnh cố định có một nút tải ảnh ở góc trên-phải

**Trước:** mọi ảnh của một bài đi qua `MediaBar` — một hàng chữ ở đầu khung
sửa, "ảnh bìa: tải ảnh lên – đặt link – xoá", cộng một hàng nữa cho ô ảnh phụ
của bitesize. Đúng hai chỗ đặt ảnh, cho sáu khuôn bài. Những ô ảnh còn lại mà
khuôn bài vẽ sẵn không có hàng nào cả; trên trang chúng đứng mãi ở mảng màu
mang chữ "chưa có ảnh" (`lib/postToRenderer.ts`, hằng `PLATE_FALLBACK`).

**Sau:** mỗi ô ảnh **cố định** mang một nút ở góc trên-phải của chính nó, chỉ
trong màn sửa. `MediaBar` ở nguyên, không bỏ đi.

Cơ chế: `packages/post-renderer/src/plates.tsx` — mới — xuất `PlateCorner`,
`plateHost` và kiểu `PlateAction`. Khuôn bài chỉ nói **chỗ**: nhận một móc
`renderPlateAction` và vẽ thứ nó trả về, ghim tuyệt đối vào góc ô. Nút trông
thế nào và bấm vào thì làm gì nằm ở `frontend/src/admin/components/PlateUpload.tsx`
(`PlateUpload`, `PlateImageUpload`) — gói renderer không có đường tải tệp nào
trong nó.

Trang công khai không truyền móc nào nên không vẽ gì. Bài kiểm
`everyTemplate.test.tsx`, nhóm *"nút tải ảnh ở góc ô ảnh cố định"*, khẳng định
cả hai chiều: có móc thì đủ số ô, không móc thì `[data-plate-corner]` rỗng ở cả
sáu khuôn.

Bản kiểm kê ô ảnh cố định, theo khoá mà khuôn bài đặt:

| Khuôn | Khoá ô | Ảnh cất ở đâu |
|---|---|---|
| article | `hero` | `posts.hero_image_url` |
| article | `primary`, `secondary`, `detail` | `posts.plate_images` — **mới** |
| article | `fig-<số phần>` | `posts.body[i].fig.imageUrl` |
| memo | `hero` | `posts.hero_image_url` |
| bitesize | `hero` | `posts.hero_image_url` |
| bitesize | `sub` | `posts.body.subImage` |
| longform | `fig-<số khối>`, `fig-<số khối>-<số khối con>` | `posts.body[i].src` |
| cards | — | không có ô ảnh cố định nào |
| report | — | không có ô ảnh cố định nào |

`cards` và `report` rỗng có chủ ý, và **không nhận** `renderPlateAction`: ảnh
trong hai khuôn ấy là khối `image` của kho dùng chung, nằm trong thân bài, và
khối ấy đã có đường tải ảnh riêng (`ImageBlockEditor` trong
`admin/screens/Editor.tsx`). Truyền móc vào chúng là lỗi biên dịch chứ không
phải một danh sách rỗng lặng lẽ.

## [SỬA LỖI] Ba ô ảnh của article xưa nay không có chỗ nào lưu ảnh

`toArticleData` trong `frontend/src/lib/postToRenderer.ts` điền thẳng
`imageUrl: null` cho `platePrimary`, `plateSecondary` và `detailPlate`. Không
phải "chưa ai đặt ảnh": không có cột nào để đặt vào, nên ba ô ấy vẽ mảng màu
vĩnh viễn, đúng cái chủ site chụp lại.

Tái hiện: mở một bài article bất kỳ trên `/ad-post`, ba ô "ảnh chính — chưa có
ảnh", "ảnh phụ — chưa có ảnh", "chi tiết — chưa có ảnh" không có đường nào đổi
được.

Nay ba ô đọc từ hàm `plateImage(post, key)` cùng tệp. Bài kiểm:
`frontend/src/lib/postToRenderer.plates.test.ts`.

## Bảng, cột và endpoint đã đụng

- **Bảng `posts`, cột mới `plate_images jsonb`** —
  `backend/supabase/migrations/0027_post_plate_images.sql`. **Chưa chạy trên
  database thật**; chủ site phải tự dán vào SQL Editor, phiên từ xa không chạm
  được database. Trước khi chạy: đọc bài vẫn bình thường
  (`POST_DETAIL_COLUMNS` là `*`, `toPostDetail` trả `row.plate_images ?? null`),
  nhưng bấm nút tải ảnh ở ba ô của article sẽ **lỗi khi lưu**. Năm nhóm ô còn
  lại không phụ thuộc migration này.
- **`PATCH /api/posts/:id`** — `PATCHABLE` trong `backend/api/posts/[id]/index.ts`
  thêm `'plate_images'`.
- **`backend/lib/posts.ts`** — `POST_COLUMNS`, `PostRow`, `PostDetail`,
  `toPostDetail` đều thêm `plate_images`.
- **`POST /api/upload`** — dùng lại y nguyên, qua `uploadImage` sẵn có. Không
  thêm endpoint nào.
- **Không đụng** `LIST_COLUMNS` trong `frontend/src/data/usePublishedPosts.ts`:
  đó là danh sách cột viết tay, thêm một cột chưa có thật vào là mọi trang công
  khai đỏ ngay. Danh sách bài vẽ ảnh đại diện chứ không vẽ khuôn bài, nên nó
  không cần cột này.

## Đối chiếu với bộ luật (`frontend/src/content/logic.ts`)

- **08.5** — "ở mọi thao tác xoá: xoá thẳng, không hỏi lại". Nút gỡ ảnh
  (`IconTrash`) ở góc ô gỡ thẳng, không hộp xác nhận. Theo cách chủ site chốt
  ngày 2026-09-18 thì nhóm 08 nói về soạn thảo chữ, nên đây là *không mâu
  thuẫn*, không phải *tuân thủ*.
- **09** — "một template là một tờ trắng, điền dưới module nào thì mặc màu
  module ấy". Nút dùng `ab-secondary` của `admin.css`, không lấy màu bài. Nó là
  công cụ của màn sửa, không phải một phần của bài.
- Không luật nào trong `logic.ts` nói về ô ảnh cố định của khuôn bài. Không
  luật nào bị bản sửa này làm sai.

## Chưa nhìn tận mắt

Phiên từ xa không dựng được app và `/ad-post` nằm sau cổng đăng nhập, nên toàn
bộ phần trên đo bằng `npm test` (130 tệp, 1335 bài, xanh) và `vite build`, chứ
**chưa ai mở trình duyệt xem nút nằm đúng góc chưa**. Hai chỗ đáng nhìn trước
khi merge:

1. Ô hero của article trên màn hẹp: nó đổi từ `position: absolute` sang
   `relative` ở bản điện thoại, nút đi theo nhưng chưa ai xác nhận bằng mắt.
2. Ô ảnh của memo: trên trang thật nó **vắng mặt** khi bài chưa có ảnh; trong
   màn sửa nay nó luôn dựng, nếu không thì không có góc nào để bấm. Tức màn sửa
   và trang thật lệch nhau đúng một ô — cố ý, nhưng là chỗ dễ đọc thành lỗi.

## Đề xuất luật

Không có. Việc này thêm một đường thao tác, không đặt ra quy ước mới nào.
