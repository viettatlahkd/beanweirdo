# spine/tree-06-chon-cha-trong-cms · CMS có chỗ đặt module vào module khác

PR: (điền sau khi mở)   nhánh: claude/project-thread-vvnk0a
base: origin/main @ `6db2f50`

Đi cùng `tree-05-muc-luc-long-cap` trong một PR. File riêng vì `tree-05` đã đẩy
lên trước khi phần này viết ra.

## Bối cảnh

Migration 0025 **đã chạy trên database thật** ngày 2026-09-18 — chủ site tự dán
SQL vào SQL Editor, rồi chạy `information_schema` xác nhận: đúng một dòng
`parent_id`, kiểu `text`, nullable.

Tới lúc ấy mọi bề mặt đã đọc được cây (PR #2, PR #4), nhưng **không có chỗ nào
đặt được `parent_id`**. `MODULE_PATCHABLE` ở backend có nó, API kiểm vòng lặp
cha-con đàng hoàng, mà trong CMS thì không một ô nào. Nghĩa là xếp một mục vào
trong mục khác vẫn phải gọi API bằng tay — đúng cái việc vặt mà cả loạt thay đổi
này đặt ra để bỏ đi.

## Đã đổi

- [ĐỔI HÀNH VI] Thêm ô chọn **"Nằm trong"** trong bảng sửa của mỗi module —
  `frontend/src/screens/Cms.tsx`, hằng `parentRow`. Để trống nghĩa là ở tầng
  trên cùng. Tên module trong danh sách thụt vào theo độ sâu bằng khoảng trắng
  rộng, nên chọn xong là thấy ngay mình đang đặt vào đâu.
- [ĐỔI HÀNH VI] `possibleParents` — `frontend/src/lib/contentTree.ts`. Danh sách
  bỏ đi chính module ấy và mọi thứ đã nằm trong nó. Thà không bày ra lựa chọn
  sẽ bị từ chối, còn hơn bày ra rồi báo lỗi sau khi bấm.
- [SỬA LỖI] `parent_id` nay được khai trong kiểu `Module` của
  `frontend/src/admin/lib/apiClient.ts`. Trước đó runtime **có** trường ấy còn
  kiểu thì **không**, nên `rootsOf(modules)` ở sơ đồ trang (PR #4) đang đọc một
  trường mà TypeScript tin là không tồn tại. Chạy đúng, nhưng đúng do may.

## Một quyết định có thể gây bất ngờ

Ô chọn nằm ở **hàng riêng**, không chen vào hàng Tên/Màu/Dàn trang/Concept. Hàng
ấy đã bốn cột ở 1fr + 112 + 124 + 128; nhét cột thứ năm vào thì tên module bị
bóp. Một `select` rộng 340px đứng riêng đọc dễ hơn.

## Chưa làm, và vì sao

- **Không có nút "tạo module con" ngay tại chỗ.** Tạo module mới rồi chọn cha là
  hai bước. Gộp thành một bước là việc đáng làm, nhưng nó đụng `createModule`
  ở backend — để sau, và nên hỏi chủ site xem hai bước có thật sự phiền không.
- **Kéo-thả để đổi cha chưa có.** Kéo-thả hiện chỉ đổi `sort_order`. Đổi nó
  thành kéo vào trong một module khác là một luồng tương tác khác hẳn, không
  phải phần mở rộng của cái đang có.

## Đụng dữ liệu

- Không đổi schema, không đổi endpoint. Dùng `PATCH /api/modules/:id` sẵn có,
  với `parent_id` đã nằm trong `MODULE_PATCHABLE` từ PR #2.
- Không thêm truy vấn nào: danh sách module đã tải sẵn trong màn CMS.
- **Chưa ghi gì vào dữ liệu thật.** Chưa tạo module thử nào, chưa đổi `parent_id`
  của module nào đang có.

## Đối chiếu bộ luật

- Không mâu thuẫn luật nào. `logic.ts` chưa nói gì về quan hệ cha-con giữa các
  module — ba luật cần sửa đã nêu ở `tree-02` và `tree-03`, vẫn còn nguyên đó.
- **Nhóm 05** — *"Với mọi module đã tạo và công khai: luôn hiện"*: vẫn đúng.
  Đặt cha cho một module không giấu nó đi, chỉ đổi chỗ nó đứng.

## Kiểm chứng

- `npm test`: **125 file, 1295 test xanh**, 2 skip. `npm run lint` 0 lỗi.
  `vite build` xanh. Đã gộp `origin/main` (có #6 và #8), không xung đột.
- Test mới: 5 cho `possibleParents` — bỏ chính nó, bỏ mọi thứ bên trong dù sâu
  mấy tầng, giữ nguyên thứ tự, và **một test đối chiếu**: với mọi cặp
  (con, cha) có thể có, `possibleParents` và `canReparent` phải trả lời giống
  nhau. Nếu hai bên lệch nhau thì một trong hai đang nói dối người dùng.
- **Chưa mở trình duyệt xem, và phiên này không xem được** — thiếu
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, nên dựng vite lên cũng chỉ ra
  một trang rỗng. Phần kiểm được ở đây **chỉ có test**. Ô chọn này là thứ đầu
  tiên trong cả loạt **ghi vào dữ liệu thật** khi bấm, nên nó cần người nhìn:
  chủ site mở `/ad-sitemap`, đặt một module vào trong module khác, rồi xem
  Mục lục và trang nhánh.

## Đề xuất luật (chưa ghi vào `logic.ts`)

- Một module đặt được vào trong module khác, không giới hạn độ sâu. Không đặt
  được vào chính nó hay vào thứ đang nằm trong nó.
- Chỗ chọn chỉ bày ra những lựa chọn sẽ được chấp nhận.
