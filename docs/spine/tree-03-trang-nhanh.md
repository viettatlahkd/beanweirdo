# spine/tree-03-trang-nhanh · Trang module liệt kê cả module con

PR: #4   nhánh: claude/project-thread-vvnk0a   base: origin/main

Cùng một PR với `tree-02-ancestors`. Ghi riêng vì phần này viết sau khi ghi chú
kia đã đẩy lên, và luật của repo nói không sửa ghi chú đã nộp.

## Bối cảnh

Sau `tree-02`, cây đã đọc được ở đường dẫn và sidebar, nhưng **trang module thì
chưa**. `ModuleScreen` chỉ chạy `usePublishedPosts({ moduleId })` — bài nằm trực
tiếp dưới module. Một nhánh như "bean weirdo" không có bài trực tiếp nào, nên nó
vẽ ra một cái tiêu đề lớn trên một lưới rỗng, trong khi mọi thứ thuộc về nó nằm
ở tầng dưới. Đây là chỗ cuối cùng trang công khai còn dừng ở hai tầng.

## Đã đổi

- [ĐỔI HÀNH VI] Trang module nay liệt kê **module con trước, rồi bài của chính
  nó** — `frontend/src/lib/moduleEntries.ts:entriesOf`. Trước đó module con
  không xuất hiện ở đâu trên trang ấy.
- [ĐỔI HÀNH VI] Bấm một hàng module mở trang module ấy, qua
  `moduleTarget:openModule` — nên một nhánh là Ghi 01 vẫn nhảy sang màn Notes
  chứ không vào trang module chung. Hàng bài vẫn `openPost` như cũ.
- [ĐỔI HÀNH VI] Ba dàn trang (`Band`, `Specimen`, `Sequence`) nay nhận
  `rows: EntryView[]` + `onOpen`, không nhận `posts: PostRow[]` nữa —
  `frontend/src/screens/ModuleScreen.tsx:LayoutProps`. Mỗi dàn trang trước đây
  tự đọc `e.en`, `e.kind`, `e.date_label`, `postDescription(e)`, tức là **ba bản
  chép tay của cùng một hàng**; thêm một loại hàng thứ hai là phải viết lại cả
  ba. Nay một hàng đọc thế nào quyết ở `entryViews`, dàn trang chỉ quyết nó
  **trông** thế nào.
- [SỬA LỖI] `withTints` (cũ, trong `ModuleScreen.tsx`) chuyển thành phần tô màu
  của `entryViews`. Module con **không** tính vào chuỗi tô màu xen kẽ của bài —
  nếu tính thì hai bài đầu tiên sau hai nhánh sẽ trùng màu và đọc thành một
  khối.
- [ĐỔI HÀNH VI] Hàng module mang **màu accent của chính nó**, không mang tint
  của module đang mở. Luật nhóm 01 nói màu là thứ nhận ra một module trước khi
  đọc tên nó.
- [SỬA LỖI] `ModuleScreen.test.tsx` giả `../data/useModules` bằng
  `importOriginal` thay vì thay cả module. Bản giả cũ chỉ có `useModules`, nên
  màn hình gọi bất kỳ hàm lọc nào khác trong file ấy là test nổ.

## Một quyết định có thể gây bất ngờ

**Hàng module không có số bài.** Hàng bài hiện `số · loại · ngày`; hàng module
hiện `số · "mục lục" · concept`. Chỗ lẽ ra là "6 bài" đang là `concept` của
module.

Lý do: `ModuleScreen` chỉ tải bài của đúng module đang mở
(`usePublishedPosts({ moduleId })`). Đếm bài của một nhánh con cần **toàn bộ**
bài của site, tức là một truy vấn rộng hơn hẳn — và luồng đang tối ưu tốc độ API
đi đúng hướng ngược lại. Sidebar đếm được vì nó đã có sẵn cả hai danh sách.

Nếu chủ site muốn con số ấy thì đó là một PR riêng, và phải bàn với luồng API.

## Chưa làm, và vì sao

- **Màn Mục lục (`IndexScreen`) vẫn liệt kê phẳng.** `indexModules` trả về mọi
  module công khai không phân cấp, nên sau khi migration chạy, Mục lục sẽ liệt
  kê "bean weirdo", "Roasting", "Biochem" ngang hàng nhau. Không hỏng — mọi mục
  vẫn tới được — nhưng chưa phản ánh cây. Tôi **không** đổi `indexModules` vì
  `sidebarModules` là chính nó, và sidebar **cần** danh sách đầy đủ để dựng cây.
  Việc đúng là cho `IndexScreen` lồng cấp như sidebar; để PR sau.
- **Sơ đồ trang trong `Cms.tsx`** — vẫn như `tree-02` đã nói, chờ PR #3 merge.
  Đã kiểm lại danh sách file của PR #3: nó **không** đụng `ModuleScreen.tsx`,
  nên phần việc trong ghi chú này không giẫm chân ai.

## Đụng dữ liệu

- Không đổi schema, không đổi endpoint, không đổi hợp đồng API.
- Không thêm truy vấn nào. `ModuleScreen` vẫn đúng hai truy vấn như trước
  (`useModules`, `usePublishedPosts`); module con lấy từ danh sách module đã
  tải sẵn.
- Không ghi gì vào cơ sở dữ liệu thật.
- **Migration 0025 vẫn chưa được áp.** Cho tới khi nó chạy, mọi `parent_id` là
  `undefined`, `childrenOf` trả rỗng, và mọi trang module vẽ **y hệt trước**.

## Đối chiếu bộ luật

- **Nhóm 01 · Màu** — hàng module con mang accent của chính nó, đúng tinh thần
  "màu là thứ nhận ra module trước khi đọc tên". Luật chưa nói gì về màu trong
  danh sách của một module khác; đề xuất bổ sung ở mục cuối.
- **Nhóm 05 · Điều hướng** — không mâu thuẫn thêm ngoài chỗ `tree-02` đã nêu.
- **Nhóm 04 · một bài một tiêu đề** — vẫn đúng: `entryViews` lấy tiêu đề bài từ
  `post.en`, không đọc chỗ nào khác.

## Kiểm chứng

- `npm test`: **131 file, 1322 test xanh**, 2 skip. Typecheck sạch cả ba
  tsconfig. `vite build` xanh.
- Test mới: 12 cho `moduleEntries` (thứ tự nhánh-trước-bài, màu, mô tả, ảnh),
  2 cho `ModuleScreen` (nhánh hiện ra và bấm được; nhánh riêng tư không hiện).
- Hai test `ModuleScreen` có sẵn xanh không đổi nội dung kiểm — chỉ sửa cách
  giả module.
- **Chưa mở trình duyệt xem.** Với dữ liệu hiện tại (chưa có `parent_id` nào)
  màn hình không đổi gì, nên không có gì để xem. Khi migration đã chạy và có
  nhánh thật thì phải xem mắt: hàng module ở cả ba dàn trang, nhất là
  `Specimen` (ô vuông) và `Sequence` (hàng số lớn).

## Đề xuất luật (chưa ghi vào `logic.ts`)

- Trang của một module liệt kê module con trước, bài của chính nó sau.
- Một hàng dẫn tới module mang màu của module ấy; một hàng dẫn tới bài mang
  tint của module đang mở.
- Module riêng tư không hiện trong danh sách của module cha.

## SPEC lỗi thời

- `docs/SPEC.html` — mục mô tả trang module: nay nó liệt kê hai loại mục, không
  chỉ bài viết.
