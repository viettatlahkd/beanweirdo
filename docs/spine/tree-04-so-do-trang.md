# spine/tree-04-so-do-trang · Sơ đồ trang trong CMS vẽ được mọi tầng

PR: #4   nhánh: claude/project-thread-vvnk0a   base: origin/main

Cùng PR với `tree-02` và `tree-03`. File riêng vì hai ghi chú kia đã đẩy lên,
và luật nói không sửa ghi chú đã nộp.

## Bối cảnh

`tree-02` và `tree-03` để lại đúng một chỗ: sơ đồ trang ở tab `map` của
`Cms.tsx`. Nó bị chặn **về mặt kiểu dữ liệu**, không phải vì thiếu logic —
`MapRow.kids` là `string[]`, tức một danh sách **dòng đã định dạng sẵn**, nên
không có chỗ nào đặt được một trang chứa trang khác. Dù site sâu bao nhiêu, sơ
đồ cũng chỉ vẽ được hai bậc.

Luồng button đã merge PR #3 (`dda06d1` trên main), nên chỗ này hết vướng.

## Đã đổi

- [ĐỔI HÀNH VI] `MapRow.kids` từ `string[]` sang `MapRow[]` —
  `frontend/src/lib/siteMapRows.ts:MapRow`. Đây là thay đổi duy nhất thực sự
  mở khoá độ sâu ở đây; phần còn lại là hệ quả.
- [ĐỔI HÀNH VI] Hàng module dựng đệ quy —
  `frontend/src/lib/siteMapRows.ts:moduleMapRow`. Module con trước, bài của
  chính nó sau, giống thứ tự trang module ở `tree-03`.
- [SỬA LỖI] Vòng lặp liệt kê module ở nhóm Public nay đi từ `rootsOf(modules)`
  chứ không phải toàn bộ danh sách — `frontend/src/screens/Cms.tsx`, khối
  `if (g.group === 'Public' && item.key === 'notes')`. Vòng phẳng cũ sẽ liệt kê
  một module con **cạnh chính cha nó** sau khi migration chạy.
- [ĐỔI HÀNH VI] JSX vẽ hàng con thành component đệ quy
  `frontend/src/screens/Cms.tsx:MapKids`, thụt vào 18px mỗi bậc. Mỗi bậc thụt
  bằng nhau, nên tầng thứ tư không cần viết thêm dòng nào.
- [ĐỔI HÀNH VI] `childrenOf(key)` trong `Cms.tsx` (hàm liệt kê tab của trang
  quản trị, **không phải** `contentTree:childrenOf`) trả `MapRow[]` thay vì
  `string[]`, theo kiểu mới.

## Vì sao tách ra `lib/siteMapRows.ts`

Phần dựng hàng nằm bên trong component `Cms`, nơi không test được — và đây đúng
là chỗ đã âm thầm khoá cả site ở hai tầng suốt thời gian qua. Tách ra thành hàm
thuần nhận `postsOf` làm tham số thì test được, và `Cms.tsx` chỉ còn một dòng
gọi nó. `displayNumber` đi theo, nên cách đánh số hàng bài không đổi.

## Đụng dữ liệu

- Không đổi schema, không đổi endpoint, không đổi hợp đồng API.
- Không thêm truy vấn nào: `moduleMapRow` nhận `liveOf`, chính hàm CMS đã dùng.
- Không ghi gì vào cơ sở dữ liệu thật.
- Chưa có `parent_id` nào nên sơ đồ hiện vẫn vẽ **y hệt trước**.

## Đối chiếu bộ luật

- Không mâu thuẫn luật nào. `logic.ts` không nói gì về sơ đồ trang ở CMS.
- Giữ nguyên luật cũ của chính màn này: một module có trang riêng (Ghi 01,
  Ghi 02) vẫn không bị liệt kê hai lần — `spokenFor` vẫn lọc như cũ, và nay
  module con của chúng chỉ hiện dưới đúng hàng ấy, không nổi lên tầng trên.

## Kiểm chứng

- `npm test` (nay gồm cả `eslint`): **123 file, 1263 test xanh**, 2 skip.
  `vite build` xanh. `npm run lint` 0 lỗi (còn đúng một cảnh báo có sẵn ở
  `components/ActivityRow.tsx`, không phải của PR này).
- Test mới: 6 cho `siteMapRows` — thứ tự module-trước-bài, độ sâu không giới
  hạn, đánh số bài theo danh sách đang hiện, module rỗng đọc y như trước.
- 4 test `Cms.siteMap.test.ts` có sẵn xanh không sửa dòng nào.
- **Chưa mở trình duyệt xem.** Chưa có `parent_id` nên không có gì để nhìn.
  Khi migration đã chạy thì phải xem tab Sơ đồ ở `/ad-sitemap` với một nhánh
  thật.

## Ghi chú về CI

PR này chạy trên pipeline mới của PR #5: 4 job (`lint`, `types`, `test 1/2`,
`test 2/2`), tất cả xanh trên head đã gộp main. Không thấy check nào của Vercel
trên PR #4 lẫn PR #3 — `get_status` trả về 0 status ở cả hai.
