# spine/tree-02-ancestors · Đường dẫn và sidebar đọc tổ tiên

PR: (điền sau khi mở)   nhánh: claude/project-thread-vvnk0a   base: origin/main

## Bối cảnh

PR 2 của ba PR cấu trúc lại mục lục. PR 1 (`tree-01-module-parent`, đã merge
`3f15954`) thêm cột `parent_id` và `lib/contentTree.ts`. PR này là bước nối các
bề mặt vào lớp ấy — tức là bước **mở khoá độ sâu**.

## Đã đổi

- [ĐỔI HÀNH VI] `buildCrumbs` nay dựng phần module của trail bằng
  `ancestorsOf`, không phải mảng viết tay độ dài cố định —
  `frontend/src/lib/crumbs.ts:branches`. Trail dài bằng độ sâu của nhánh.
- [SỬA LỖI] `crumbBack` trên màn module lùi về **nhánh cha**, không về thẳng
  Mục lục — `frontend/src/lib/crumbs.ts:crumbBack`. Trước đó từ Roasting bấm
  `←` là nhảy qua mọi nhánh ở giữa. Nhận thêm tham số `modules` tuỳ chọn;
  không truyền thì trả về đúng hành vi cũ.
- [ĐỔI HÀNH VI] Sidebar vẽ đệ quy qua `flattenTree`, mỗi hàng mang `depth` và
  thụt vào 15px mỗi bậc — `frontend/src/components/Sidebar.tsx:section`.
- [ĐỔI HÀNH VI] `Row` nhận `depth: number` thay vì chỉ có cờ `sub` —
  `frontend/src/components/Sidebar.tsx:Row`. `sub` nói được "một bậc" và không
  nói được "hai", đúng thứ đã chặn cả site ở hai tầng. `sub` giữ nguyên cho
  trường hợp cũ của nó.
- [ĐỔI HÀNH VI] Số bài cạnh tên module nay đếm **cả nhánh** qua `countUnder`,
  không chỉ bài nằm trực tiếp dưới nó.

## Một quyết định có thể gây bất ngờ

Luật nhóm 05 nói *"Sidebar xếp module thường trước, module đặc biệt sau"*. Khi
một module thường là **con** của một module đặc biệt, hai điều ấy mâu thuẫn:
không thể vừa xếp trên vừa nằm dưới cha nó.

Tôi cho quan hệ cha-con thắng. Hàng con nằm ngay dưới cha và thụt vào một bậc,
và chỗ thụt vào là thứ nói nó thuộc về đâu. Có test khoá:
`Sidebar.tree.test.ts` — *"lets the tree win over the normal-before-special
sort"*. Nếu chủ site muốn ngược lại thì đây là chỗ đổi.

## Chưa làm, và vì sao

**Sơ đồ trang trong `Cms.tsx` chưa đụng.** `MapRow` vẫn là
`{ label, desc, kids: string[] }`, nên tầng thứ ba chưa hiện trong CMS.

Luồng button đang mở PR #3 sửa `Cms.tsx` rất nhiều (+385/−429) và đã đề nghị
tôi vào sau khi PR ấy merge. Họ xác nhận **không đụng** `MapRow` hay hàm dựng
`tree`, nên phần việc này còn nguyên. Tách ra vì hai PR cần merge **riêng thứ
tự**, không phải để cho gọn.

Việc còn lại là một PR nhỏ: đổi `MapRow.kids` sang `MapRow[]` và cho hàm dựng
hàng đi đệ quy.

## Đụng dữ liệu

- Không đổi schema, không đổi endpoint, không đổi hợp đồng API.
- Không ghi gì vào cơ sở dữ liệu thật.
- **Migration 0025 vẫn chưa được áp** lên DB hosted — xem `tree-01`. Cho tới
  khi nó chạy, mọi `parent_id` là `undefined`, `ancestorsOf` trả về rỗng, và
  mọi thứ trong PR này vẽ ra **y hệt trước**. Đó là lý do 14 test đường dẫn cũ
  xanh nguyên mà không sửa dòng nào.

## Đối chiếu bộ luật

- **Nhóm 05 · Điều hướng** — **mâu thuẫn, phải sửa luật.** Luật viết đường dẫn
  thành ba chặng cố định (`[[landing]] › [[home]] › module`) với ví dụ
  `Trang chủ › Mục lục › sensory › Sensory Lexicon`. Sau PR này trail dài bằng
  độ sâu của mục. Đề xuất câu thay thế ở mục cuối.
- **Nhóm 05** — *"Sidebar xếp module thường trước, module đặc biệt sau"*: xem
  mục quyết định ở trên. Luật cần thêm mệnh đề về quan hệ cha-con.
- **Nhóm 05** — *"Với mọi module đã tạo và công khai: luôn hiện, kể cả khi chưa
  có bài nào"*: vẫn đúng, và mạnh thêm — một module có con riêng tư vẫn hiện,
  và một hàng có cha không đọc được thì hiện ở tầng trên cùng chứ không mất.
- **Nhóm 01 · Màu** — chưa đụng. Màu chưa kế thừa theo nhánh; để PR sau.

## Kiểm chứng

- `npm test`: **130 file, 1308 test xanh**, 2 skip. Typecheck sạch cả ba
  tsconfig. `vite build` xanh.
- Test mới: 10 cho trail và mũi tên `←` theo cây (`crumbs.tree.test.ts`), 7 cho
  thứ tự và độ sâu hàng sidebar (`Sidebar.tree.test.ts`).
- 14 test đường dẫn có sẵn xanh **không sửa dòng nào** — đó là bằng chứng dữ
  liệu phẳng cho ra kết quả y hệt trước.
- Chưa mở trình duyệt xem: với dữ liệu hiện tại (mọi `parent_id` rỗng) màn hình
  không đổi gì. Khi migration đã chạy và có hàng cha thật thì phải xem mắt —
  nhất là chỗ thụt vào của sidebar ở tầng 3 và 4.

## Đề xuất luật (chưa ghi vào `logic.ts`)

- Đường dẫn quay lại dài bằng độ sâu của mục đang mở, không phải một số chặng
  cố định. Mỗi nhánh trên đường xuống là một mẩu bấm được.
- Mũi tên `←` lùi đúng **một** bậc: từ một mục nằm trong mục khác thì về mục
  chứa nó, không về thẳng Mục lục.
- Số bài cạnh một tên là số bài của cả nhánh, kể cả bài nằm ở các tầng dưới.
- Khi thứ tự xếp và quan hệ cha-con mâu thuẫn thì cha-con thắng.

## SPEC lỗi thời

- `docs/SPEC.html` — mục nói về điều hướng và breadcrumb: đường dẫn nay không
  còn cố định ba chặng.
