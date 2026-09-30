# Chuyển bài sang module khác

- Nhánh: `claude/project-thread-ey2sz1`
- PR: #29
- Lane: template / khu quản trị

Chủ site: *"thêm giúp tôi 1 option là chuyển bài sang các module khác được
không, ví dụ bài ở module Ghi01 giờ tôi muốn move nó sang roastery chẳng hạn
thì đang không có nút nào giúp tôi làm điều đó cả. và tạo 1 cái là chỉ có xoá
đi và tạo bài mới rồi copy paste lại thôi thì hơi phiền"*.

---

## 1. [ĐỔI HÀNH VI] `module_id` nay vá được qua `PATCH /api/posts/:id`

**Trước.** `PATCHABLE` trong `backend/api/posts/[id]/index.ts` không có
`module_id`, nên lượt vá nào gửi nó lên cũng bị lọc bỏ im lặng. Đổi module chỉ
làm được bằng SQL, hoặc bằng cách chủ site mô tả: xoá bài rồi tạo lại và chép
tay nội dung.

**Sau.** `module_id` nằm trong `PatchPostBody` và trong `PATCHABLE`.
`updatePost` ở `frontend/src/admin/lib/apiClient.ts` nhận thêm nó.

## 2. [ĐỔI HÀNH VI] Chuyển module thì `sort_order` bị trả về null

**Cái đã làm.** Trong `handlePatch`, sau dòng đặt `patch.updated_at`: lượt vá
nào có `module_id` mà **không** tự đặt `sort_order` thì `sort_order` được đặt
thành `null`.

**Bằng chứng cho việc phải làm thế.** `sort_order` đánh số 1..N **trong một
module**, không phải trong cả bảng — xem `handleReorder` ở
`backend/api/posts/index.ts`, nơi nó đánh lại số cho đúng một module một lượt.
Mang số 3 của module cũ sang module mới là chen vào giữa một dãy chẳng liên
quan, và đụng đúng bài đang giữ số 3 ở đó. `null` nghĩa là "chưa ai chọn" (xem
chú thích trên `PostSummary.sort_order`), tức bài về xếp theo ngày ở nhà mới.

**Bài kiểm.** `backend/api/posts/[id]/index.test.ts`, nhóm *"chuyển bài sang
module khác"*: ba trường hợp — chuyển module thì `sort_order` thành null;
lượt vá tự đặt `sort_order` thì giữ nguyên số ấy; lượt vá không chuyển module
thì không đụng tới cột đó.

## 3. [ĐỔI HÀNH VI] Menu ba chấm của thẻ bài có thêm "Chuyển sang module…"

**Cái đã làm.** `MenuItem` trong
`frontend/src/admin/components/PostCard.tsx` nhận thêm nhánh `{ kind: 'move' }`;
`PostCard` nhận thêm prop `onMove`; mục menu đứng ngay sau "Nhân bản".

**Vì sao chỗ đó.** Cùng lý do "Nhân bản" đứng đó: đây là việc làm với **chính
bài**, không phải một bước trạng thái như Đăng hay Lưu trữ. `onPick` đổi từ
một biểu thức ba ngôi sang if/else if/else vì nay có ba nhánh.

**Bài kiểm.** `PostCard.pin.test.tsx`: mục ấy gọi `onMove` chứ không gọi
`onAction`. Mười chỗ `render(<PostCard …>)` cũ được thêm `onMove={vi.fn()}`.

## 4. [ĐỔI HÀNH VI] Hộp thoại chọn module đích

**Cái đã làm.** `frontend/src/admin/components/MovePostDialog.tsx` (mới), dựng
theo khuôn `NewPostDialog`: nền mờ, Esc đóng, bấm ra ngoài đóng, khoá cuộn của
danh sách sau lưng.

- Một ô `<select>` chia hai nhóm `Module` / `Ghi chép` theo `Module.kind`, lấy
  từ `listModulesCached()`.
- Mở ra là ô chọn đứng sẵn ở module bài đang nằm, nên nút **Chuyển** tắt cho
  tới khi chọn sang chỗ khác.
- Lưu bằng nút bấm, không tự lưu lúc rời ô.
- `onMoved` được `await`: ghi hỏng thì hộp thoại **ở lại** với lựa chọn vừa
  làm. Lỗi bị nuốt trong chính `onClick` vì nơi gọi đã báo bằng toast, còn lời
  hứa hỏng thoát ra khỏi một trình xử lý sự kiện React thì không ai bắt.

**Bài kiểm.** `MovePostDialog.test.tsx`, bảy trường hợp.

**Một ghi chú cảnh báo hiện ra sau khi đã chọn module khác**, nói hai điều:
đường dẫn cũ của bài sẽ không mở được nữa, và vị trí tự chọn bị bỏ.

**Sự thật đứng sau câu cảnh báo ấy.** Slug công khai dựng từ `module_id` —
`frontend/src/lib/postSlug.ts`, hàm `uniqueSlug` — trừ bài đã tự gõ slug
riêng. Nên chuyển module là đổi địa chỉ, và ai đã lưu đường dẫn cũ thì hỏng.
Trên màn hình trước đây không có gì nói điều đó.

## 5. `PostsPanel` nối dây

`handleMove` gọi `updatePost(id, { module_id })`, đóng hộp thoại, rồi nạp lại
**cả hai** danh sách (`load()` và `loadCounts()`) và gọi `onChanged?.()`: bài
đổi module là đổi cả thẻ trong danh sách lẫn số đếm của module ở màn khác.

## Bảng, cột, endpoint đã đụng

- Bảng `posts`, cột `module_id`: nay **ghi** được qua `PATCH /api/posts/:id`
  (trước chỉ đọc và chỉ đặt lúc tạo bài).
- Bảng `posts`, cột `sort_order`: nay bị **ghi null** kèm theo mỗi lượt chuyển
  module.
- Endpoint `PATCH /api/posts/:id` — chỉ endpoint này. Không thêm endpoint mới,
  không migration, không DDL.
- `GET /api/modules` đọc thêm một lượt khi mở hộp thoại, qua
  `listModulesCached()` nên thường là cache sẵn.

## Đối chiếu bộ luật

Không mâu thuẫn với nhóm nào trong `frontend/src/content/logic.ts`. Nhóm `08`
(*Ghi — sửa và lưu*) nói về sửa và lưu chữ trong bài, không nói về chỗ bài
nằm. Chủ site đã làm rõ ngày 2026-09-18 rằng luật "xoá không hỏi" của nhóm ấy
là xoá **chữ** lúc đang soạn, không phải xoá bài hay đối tượng nào khác, nên
nút Chuyển có một bước xác nhận là đúng hướng chứ không ngược.

## Chưa nhìn tận mắt

- `/practice` sau cổng đăng nhập, nên hộp thoại này **chưa được nhìn trên màn
  thật** — chỉ có `npm test` và `vite build` đứng sau. Nó là thứ thấy được
  bằng mắt, nên cần chủ site mở thử một lần.
- Chưa chuyển thử một bài thật. Việc ghi vào dữ liệu thật của chủ site phải
  hỏi trước, và phiên này không chạm được vào database.
- Chưa kiểm chuyện gì xảy ra với bài đã **tự gõ slug riêng**: đọc
  `uniqueSlug` thì slug ấy giữ nguyên nên đường dẫn không đổi, nhưng chưa chạy
  thử.

## Đề xuất luật (ý kiến, chưa làm)

- Đường dẫn cũ hỏng hẳn sau khi chuyển. Nếu chủ site chuyển bài thường xuyên
  thì đáng có một bảng chuyển hướng slug cũ → bài, để đường dẫn ai đã lưu vẫn
  mở được. Đó là thêm bảng, tức việc riêng, không gộp vào đây.
- Hộp thoại chỉ chuyển **một** bài một lần. Chọn nhiều bài rồi chuyển cả cụm
  là việc khác, và danh sách bài hiện chưa có cách chọn nhiều.
