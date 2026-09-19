# spine/tree-07-kho-dang-ky-dan-trang · dàn trang và template gom về một chỗ

PR: #10   nhánh: claude/project-thread-vvnk0a
base: origin/main @ `6db2f50`

Phần thứ ba của loạt thay đổi cấu trúc. `tree-01`…`tree-06` làm cho **mục lục**
sâu được nhiều tầng; phần này làm cho **dàn trang** thêm được mà không phải sửa
chín chỗ.

## Vì sao có phần này

Đếm số chỗ phải sửa để thêm một dàn trang module thứ tư, đo trên `origin/main`:

1. `frontend/src/data/useModules.tsx` — `export type ModuleLayout = 'band' | …`
2. `frontend/src/content/modules.ts` — bản sao thứ hai của đúng kiểu ấy
3. `backend/lib/modules.ts` — `MODULE_LAYOUTS`
4. `frontend/src/screens/ModuleScreen.tsx` — chuỗi `if (m.layout === …)`
5. `frontend/src/screens/Landing.tsx` — chuỗi `if` thứ hai
6. `frontend/src/screens/Cms.tsx` — danh sách `<option>` gõ tay
7. `frontend/src/lib/modulePageImages.ts` — `pageSlotCount` trả 4/4/1 bằng `if`
8. `frontend/src/admin/moduleForm.ts` — bảng `NAMES_BY_LAYOUT`
9. SQL: `check (layout in (…))` ở `0001_initial_schema.sql:30` và
   `0002_templates_and_post_status.sql:6`

Chỗ thứ 9 đắt nhất: tám chỗ kia đi cùng một PR, còn nó cần chủ site tự dán SQL.

**Bằng chứng là con số ấy có thật:** khi cần dàn trang thứ tư, hai lần, không ai
thêm. `frontend/src/screens/Notes.tsx` và `Hours.tsx` được viết thành trang
riêng rồi nối vào bằng bảng id gõ tay trong `frontend/src/lib/moduleTarget.ts`
(`ghi01 → goNotes()`, `ghi02 → goHours()`). Hai lần đi vòng, không lần nào sửa.

## Đã đổi

### Dàn trang module

- [ĐỔI HÀNH VI] Thêm `frontend/src/content/layouts.ts` — `MODULE_LAYOUTS`, mỗi
  dàn trang một hàng gồm `key`, `label` (chữ trong CMS) và `pageImageNames`
  (tên các ô ảnh trên trang module, **theo thứ tự**). Kèm `layoutSpec`,
  `MODULE_LAYOUT_KEYS`, `pageSlotCountOf`. Thêm một dàn trang nay là **một hàng
  ở đây + một giá trị trong `backend/lib/modules.ts`**, và `layouts.contract.test.ts`
  bắt nếu quên chỗ thứ hai.
- [SỬA LỖI] `pageSlotCountOf` đếm bằng `pageImageNames.length` thay vì một
  `if`-chain riêng. Trước đó **số ô và tên ô là hai sự thật rời nhau**: số ô ở
  `pageSlotCount` trong `frontend/src/lib/modulePageImages.ts`, tên ô ở
  `NAMES_BY_LAYOUT` trong `frontend/src/admin/moduleForm.ts`, không gì buộc
  chúng khớp. Hai bên **đang** khớp (cả hai nói specimen bốn ô), nhưng đã từng
  lệch: chú thích còn nguyên trong `pageSlotCount` ở `origin/main` — *"ô thứ tư
  của specimen từng là mảng màu đặc chứ không phải chỗ đặt ảnh, nên khung sửa
  chỉ mời ba"* — trong khi hàm ngay dưới nó `return 4`. Nghĩa là chú thích tả
  một tình trạng đã sửa ở một bên mà người sửa không biết bên kia. Nay đếm bằng
  cách đếm tên, nên hai con số không còn là hai nữa.
- [ĐỔI HÀNH VI] `frontend/src/screens/ModuleScreen.tsx` — `LAYOUT_SCREENS` kiểu
  `Record<ModuleLayout, …>` thay cho chuỗi `if`. `Record` bắt **thiếu** ở lúc
  biên dịch; chuỗi `if` thì im lặng rơi xuống nhánh cuối.
- [ĐỔI HÀNH VI] `frontend/src/screens/Landing.tsx` — `BAND_OF`, cùng kiểu
  `Record`, chọn kiểu dải nào cho mỗi dàn trang. **JSX không đụng tới.** Chi
  tiết ở mục "Chưa làm" bên dưới.
- [ĐỔI HÀNH VI] `frontend/src/screens/Cms.tsx` — ô chọn dàn trang sinh từ
  `MODULE_LAYOUTS`, không gõ tay `<option>` nữa.
- [SỬA LỖI] `frontend/src/data/useModules.tsx` bỏ bản sao kiểu `ModuleLayout`,
  nay `export type` lại từ kho đăng ký.
- [SỬA LỖI] Xoá `frontend/src/content/modules.ts` (82 dòng). **Đã kiểm trước khi
  xoá:** không file `.ts`/`.tsx` nào import, chỉ còn nhắc trong `docs/`. Đây là
  mục **C4** trong `docs/spine/SO-BAN-GIAO.md`, nay đánh XONG.

### Danh sách template bài viết

Cùng một hình dạng hỏng, ở chỗ khác. Danh sách template viết ra **bốn** lần ở
frontend: `TEMPLATES` trong `frontend/src/admin/lib/apiClient.ts`,
`PostTemplate` trong `frontend/src/data/usePublishedPosts.ts`, và **hai** bảng
`TEMPLATE_LABEL` — một ở `frontend/src/admin/components/PostCard.tsx`, một ở
`frontend/src/admin/screens/Editor.tsx`.

- [SỬA LỖI] Bảng ở `Editor.tsx` khai kiểu `Record<string, string>`, nên thiếu
  một template **không phải lỗi biên dịch** — chỉ là ô chọn template thiếu một
  dòng, im lặng. Đây đúng là cách hỏng cũ: migration `0010` thêm `longform` và
  `memo`, một bản sao không cập nhật, và suốt nhiều tháng tạo hai loại ấy qua
  admin trả `400` trong khi hai bài loại ấy đã đăng trên site
  (`packages/post-renderer/src/templateContract.test.ts` ghi lại vụ đó).
- [ĐỔI HÀNH VI] Thêm `frontend/src/content/templates.ts` — `POST_TEMPLATES`,
  `POST_TEMPLATE_KEYS`, `TEMPLATE_LABEL` kiểu `Record<PostTemplate, string>`.
  Bốn bản sao trên nay import từ đây. `apiClient.ts` vẫn `export` tên cũ
  (`TEMPLATES`, `PostTemplate`) nên các màn admin không phải đổi import.

**Tôi gom danh sách, không gom chỗ vẽ.** `PostRenderer` vẫn `switch` trên
union: mỗi template nhận một `post` **khác hình dạng** (`ArticlePostData`,
`CardsPostData`, …), và chính cái `switch` ấy là thứ khiến TypeScript kiểm tra
hình dạng. Đổi nó thành bảng tra là đổi một `switch` được kiểm lấy một cái
không. Dàn trang là markup thay thế được trên **một** hình dạng; template thì
không.

### Migration 0026

`backend/supabase/migrations/0026_open_layout_list.sql` bỏ hai ràng buộc
`check` trên `layout` (`modules_layout_check`, `templates_layout_check` — khai
inline ở 0001/0002 nên Postgres tự đặt tên).

**Bỏ ràng buộc không bỏ việc kiểm.** `PATCH /api/modules/:id` đã đối chiếu
`MODULE_LAYOUTS` và trả `400` kèm danh sách giá trị hợp lệ —
`backend/api/modules/[id]/index.ts`, có test `'rejects an unknown layout'` ở
`backend/api/modules/[id]/index.test.ts`. Cái đổi là **nơi** giữ danh sách: một
file mã đi theo bản deploy, thay vì một ràng buộc chỉ đổi được bằng tay.

**Chỉ `layout`.** `posts.template` (0022) và `templates.renderer` (0023) giữ
nguyên ràng buộc: thêm một template vốn đã phải viết một component React mới,
nên DDL ở đó không cản thêm gì, mà `templateContract.test.ts` đang đọc đúng
ràng buộc ấy để bắt lệch.

## Thứ tự merge và chạy SQL

**Mã này an toàn khi merge trước lúc chạy 0026.** Kho đăng ký hiện chỉ chứa
đúng ba dàn trang mà ràng buộc đang cho phép, nên database cũ và mã mới nói
cùng một thứ. 0026 chỉ **cần** vào lúc thêm dàn trang thứ tư — chạy trước thì
hơn, nhưng không phải chạy cùng lúc.

## Đụng dữ liệu

- Không thêm, xoá hay đổi cột nào. 0026 **bỏ hai ràng buộc**, không đụng dữ liệu
  trong bảng.
- Bảng đụng tới: `modules` (ràng buộc `layout`), `templates` (ràng buộc
  `layout`). Không endpoint nào đổi hành vi.
- **Chưa ghi gì vào dữ liệu thật.** 0026 chưa chạy.

## Đối chiếu bộ luật

- **Nhóm 01** đang kể tên ba module cố định. Vẫn mâu thuẫn, đã nêu từ `tree-02`;
  phần này không làm nó nặng thêm và cũng không sửa (không phải lane của tôi).
- Không luật nào trong `logic.ts` nói về dàn trang module hay danh sách
  template, nên không có mâu thuẫn mới.

## Kiểm chứng

- `npm test`: **127 file, 1303 test xanh**, 2 skip. `npm run lint` 0 lỗi (còn
  một cảnh báo `useEffect` cũ ở `frontend/src/components/ActivityRow.tsx`, có
  sẵn từ trước, không thuộc thay đổi này). `npx vite build` xanh.
- Test mới: `frontend/src/content/layouts.contract.test.ts` (5) và
  `frontend/src/content/templates.contract.test.ts` (3).
- **Test "không migration nào ràng buộc layout" đã kiểm là không đỗ vống:** bỏ
  file 0026 đi rồi chạy lại thì nó đỏ, báo đúng `{ modules: ['band', …],
  templates: [...] }`. Đưa 0026 về thì xanh.
- **Chưa mở trình duyệt xem, và phiên này không xem được** — thiếu
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Phần kiểm được ở đây chỉ có
  test và build.

## Đề xuất luật (chưa ghi vào `logic.ts`)

- Số ô ảnh của một dàn trang là số tên ô nó khai. Không có chỗ thứ hai nào nói
  con số ấy.
- Một dàn trang mới là một hàng dữ liệu cộng một component; không phải một
  migration.
