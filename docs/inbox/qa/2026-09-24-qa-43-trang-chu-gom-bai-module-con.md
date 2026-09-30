# PR #32 · nhánh `claude/project-thread-swvxtd`

Trang chủ gom bài của module con lên khối module cha.

## [SỬA LỖI] Module cha hiện 0 bài, không có bài mới nhất

**Tái hiện:** đặt module B vào trong module A (ô kéo thả ở `/ad-config`), đăng
bài vào B, để A không có bài riêng. Trang chủ hiện "A — 0 bài" và "chưa có bài
nào" ở mục Mới nhất. Chủ site gặp ở Cafe Hihi.

**Nguyên nhân:** `Landing` (`frontend/src/screens/Landing.tsx`) lấy bài bằng
`groupByModule`, hàm này chỉ nhóm bài nằm thẳng trong một module. Trong khi đó
`landingModules` (`frontend/src/data/useModules.tsx`) chỉ trả module gốc, nên
bài của module con không có chỗ nào hiện trên trang chủ.

**Tôi đổi:** `Landing` dùng `postsUnder` (`frontend/src/lib/postGroups.ts`) để
lấy bài của cả nhánh, đi qua các module có `visibility !== 'private'`. Nhánh có
module con thì sắp lại bằng `newestFirst` (`frontend/src/lib/postOrder.ts`, giờ
được export), vì `sort_order` đánh lại từ 1 trong từng module. Module không có
con thì giữ nguyên thứ tự truy vấn như trước.

Sidebar vốn đã đếm cả nhánh (`countUnder` trong `Sidebar.tsx`), nên đây là trang
chủ bắt kịp, không phải hành vi mới.

**Test:** `Landing.test.tsx` — "counts and lists the posts of sub-modules under
their top-level parent". Đỏ trên `main`, xanh trên nhánh này. `npm test`: 140
file, 1433 test xanh; `vite build` xanh.

## Đã đụng

- Bảng: `modules` (`parent_id`, `visibility`) và `posts` (`module_id`,
  `published_at`), chỉ đọc qua `useModules` và `usePublishedPosts`, không đổi
  truy vấn.
- Endpoint: không.
- Chưa ai nhìn tận mắt trang chủ thật sau khi sửa: phiên từ xa không mở được
  `*.vercel.app`.
