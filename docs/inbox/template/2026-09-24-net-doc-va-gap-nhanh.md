# Nét dọc theo tầng, và gấp/mở một nhánh trong cây module

- Nhánh: `claude/project-thread-ey2sz1`
- PR: #34
- Lane: template / khu quản trị

Chủ site trích lại đúng hai mục *"chưa nhìn tận mắt"* của ghi chú PR #30
(`docs/inbox/template/2026-09-21-cay-module-nhieu-tang.md`) rồi nói *"làm đi"*:

> Cây sâu 4 tầng trở lên: cỡ chữ dừng giảm ở tầng 3 nên từ tầng 4 hai tầng liền
> nhau chỉ khác lề thụt.
>
> Chưa gấp/mở được một nhánh. Mũi tên hiện mở biểu mẫu sửa chứ không gấp cây,
> nên cây dài thì phải cuộn.

---

## 1. [ĐỔI HÀNH VI] Mỗi hàng vẽ một nét dọc cho mỗi tầng nằm trên nó

**Trước.** Độ sâu của một hàng nói bằng đúng hai thứ: lề thụt (`indent` trong
`Cms.tsx`, `depth * INDENT`) và cỡ chữ tên module
(`Math.max(24 - depth * 3.5, 17)`). Cỡ chữ chạm 17px ở tầng 3, nên tầng 3, 4, 5
có cùng một cỡ chữ.

**Sau.** Thẻ hàng nhận `position: 'relative'`, và bên trong nó có `depth` thẻ
đặt tuyệt đối, mỗi thẻ rộng 1px, màu `paper.rule`, `top: 0` `bottom: 0`. Thẻ
thứ `i` nằm ở `i * INDENT + GUIDE_X`.

**Hằng mới `GUIDE_X` = 8**, đặt cạnh `INDENT` trong `Cms.tsx`. 8px là giữa tay
nắm kéo — thứ rộng 16px và đứng đầu mỗi hàng. Hàng con bắt đầu ở đúng `INDENT`
(29px), nên giữa nét sâu nhất và chữ của hàng còn 21px trống: không nét nào cắt
qua một cái nút.

**Vì sao nét chạy suốt chiều cao hàng, kể cả phần đệm.** Thẻ hàng có
`padding: '13px 0'`. Nét đi hết cả phần đệm thì hai hàng kề nhau nối thành một
đường liền (chỉ còn 1px viền dưới cắt ngang), và đường ấy tự dứt ở hàng cuối
của nhánh — hàng sau đó nông hơn nên không vẽ nét ở tầng ấy nữa. Không cần biết
hàng nào là hàng cuối, không cần đọc gì ngoài `depth` của chính mình.

**Cỡ chữ giữ nguyên.** Bản này không đụng vào `Math.max(24 - depth * 3.5, 17)`.

## 2. [ĐỔI HÀNH VI] Mũi tên đầu hàng nay gấp/mở nhánh, không mở biểu mẫu sửa

**Trước.** `IconButton` mang `IconChevron` gọi `setOpenModule(open ? null : m.id)`
— mở biểu mẫu sửa. Nút tên module (`className="ab-disclose"`) ngay cạnh nó gọi
**cùng một** hàm.

**Sau.** Mũi tên gọi `toggleFold(m.id)`; nhãn là `Gấp nhánh <tên>` hoặc
`Mở nhánh <tên>`, `aria-expanded` nói nhánh đang mở hay gấp. Nút tên module
không đổi: vẫn `setOpenModule`, vẫn `aria-expanded` của biểu mẫu.

**Hàng không có con không có mũi tên** — nó thay bằng một thẻ trống rộng
`sizes.sm.height` (28px, đọc từ `design/controls.ts` chứ không gõ lại con số
của `.ab-icon-sm` trong `admin.css`). Giữ ô trống để chấm màu, số thứ tự và tên
của các hàng cùng tầng vẫn thẳng cột.

**Đây là chỗ tôi làm khác ghi chú PR #30.** Ghi chú ấy đề xuất *"nó cần một nút
riêng chứ không phải đổi nghĩa mũi tên đang có"*. Tôi đổi nghĩa mũi tên, vì
biểu mẫu sửa đã có đường vào thứ hai và rộng hơn nhiều (bấm tên module), còn
thêm nút thứ ba thì mỗi hàng dài thêm 41px (28px nút + 13px khe) cho một việc
đã có chỗ. Bài kiểm `bấm tên module vẫn mở biểu mẫu sửa` trong
`Cms.moduleFold.test.tsx` giữ đường vào ấy. Đây là một lựa chọn, không phải một
sự thật — chủ site đã được báo và đồng ý.

## 3. [ĐỔI HÀNH VI] Gấp một nhánh giấu cả cụm bên trong, sâu mấy tầng cũng vậy

**Cái đã làm.** `Cms.tsx` có thêm state `folded: ReadonlySet<string>` và
`toggleFold`. `moduleRows` nay duyệt `flattenTree(buildTree(shownModules))` và
bỏ qua mọi hàng nằm dưới một nhánh đang gấp, nhớ đúng một con số `hideBelow`:
gặp một hàng sâu hơn nó thì bỏ qua, gặp một hàng ngang hoặc nông hơn thì đã ra
khỏi cụm ấy nên con số hết hiệu lực. Mỗi hàng nay mang thêm `kids`
(`n.children.length > 0`) để biết có mũi tên hay không.

**Chỉ sống trong phiên này, không ghi xuống đâu cả.** Không cột mới, không
endpoint mới. Gấp một nhánh là để nhìn cho đỡ dài lúc đang sắp xếp, không phải
một thiết lập của site.

**Thả vào trong một nhánh đang gấp thì nhánh mở ra.** `dropModule` bỏ
`targetId` khỏi `folded` khi `where === 'inside'`, trước hai lượt ghi. Không
làm thế thì thẻ vừa kéo rơi vào chỗ đang bị giấu, biến mất khỏi màn, và người
ta tưởng lệnh hỏng.

**Kéo thả không đọc danh sách đang bày.** `planModuleMove` vẫn nhận
`shownModules` — cả cây, không phải phần đang hiện. Nên thả xuống mép dưới một
nhánh đang gấp vẫn nhảy qua hết cụm con đang bị giấu (`descendantIds` trong
`planModuleMove`), chứ không cắm vào giữa ruột nó.

## 4. Trang thử nay dựng cây năm tầng

`frontend/src/cmsHarness.tsx` thêm `melanoidin` (trong `maillard`) và
`mau-nau` (trong `melanoidin`). Cây ba tầng cũ không chạm tới chỗ chủ site nói:
cỡ chữ mới dừng giảm ở tầng 3, nên tầng 4 và 5 là chỗ duy nhất đo được nét dọc
có làm nổi việc của nó hay không.

## 5. Hai thứ jsdom không có, và vì sao bài kiểm phải tự dựng

`Cms.moduleFold.test.tsx` dựng giả `IntersectionObserver` và `ResizeObserver`.
Biểu mẫu sửa dựng `Rise` (`frontend/src/lib/Rise.tsx:observer`) và `Preview`,
cả hai gọi thẳng hai API ấy mà không hỏi trước. Thiếu chúng thì React gỡ cả cây
chứ không chỉ một ô, nên bài kiểm mở biểu mẫu thấy một màn trắng và báo "không
tìm thấy chữ Tên module" — một lời báo lỗi chỉ sai chỗ chứ không chỉ nguyên
nhân.

Đây là sự thật về jsdom, không phải đề xuất sửa `Rise.tsx`.

## Bảng, cột, endpoint đã đụng

Không có. Bản này không đọc thêm cột nào, không gọi thêm endpoint nào, không
migration, không DDL. `PATCH /api/modules/:id` và `PUT /api/modules` vẫn được
gọi đúng như PR #30 để lại — xem
`docs/inbox/template/2026-09-21-cay-module-nhieu-tang.md` mục 4 về thứ tự hai
lượt ghi.

## Đối chiếu bộ luật

Không đối chiếu được: bộ luật là `frontend/src/content/logic.ts`, đã xoá ở
PR #30. Ghi lại để người sau biết vì sao mục này trống.

## Đã nhìn tận mắt

Đo trong Chrome (Playwright) trên `frontend/cms-harness.html`, cây năm tầng:

- Nét dọc: `tư duy tư duy` 0 nét · `roasting 101` 1 nét ở 8px · `phản ứng
  Maillard` 2 nét ở 8/37px · `melanoidin` 3 nét ở 8/37/66px · `màu nâu từ đâu
  ra` 4 nét ở 8/37/66/95px. Lề thụt 0/29/58/87/116px, cỡ chữ
  24/20.5/17/17/17px.
- Gấp `biochemistry 101`: ba hàng dưới nó biến mất, `roasting 101` ở lại. Gấp
  `bean weirdo`: cả năm hàng trong nó biến mất. Mở lại thì hiện đủ, đúng thứ tự
  cũ.
- Hàng không có con (`tư duy tư duy`, `roasting 101`, `màu nâu từ đâu ra`,
  `sensory`) không có nút gấp nào.
- Bấm tên module vẫn mở biểu mẫu sửa.
- Kéo thật bằng chuột: thả `sensory` vào giữa thẻ `bean weirdo` **đang gấp** thì
  nhánh mở ra, ghi `PATCH sensory {"parent_id":"bean"}` rồi mới
  `PUT /api/modules` với `sensory` cắm sau cả cụm con.

`npm test` 1440 xanh (8 bài mới), `vite build` xanh.

## Chưa nhìn tận mắt

- **Chưa chạm dữ liệu thật của chủ site.** Mọi phép đo chạy trên trang thử với
  `window.fetch` bị chặn. Khu quản trị thật nằm sau cổng đăng nhập.
- Chưa thử trên màn hẹp. Ở 1100px và năm tầng thì lề thụt 116px vẫn còn rộng
  chán; điện thoại chưa đo.
- Chưa thử bàn phím đi qua cây: mũi tên gấp/mở là một `<button>` nên tab tới
  được, nhưng chưa có phím mũi tên đi trong cây như một `tree` thật.

## Đề xuất luật (ý kiến, chưa làm)

- `folded` không được nhớ lại sau khi tải trang. Nếu chủ site dùng cây sâu
  thường xuyên thì nên ghi nó vào `localStorage` — đây là thứ của trình duyệt,
  không phải của site, nên nó không thuộc về bảng `modules`.
- Cây nay có ba thao tác (gấp, kéo, sửa) mà không có thao tác bàn phím nào
  ngoài tab. Nếu sau này làm, thì `role="tree"` với phím mũi tên là đường đúng,
  và lúc ấy ô chọn **"Nằm trong"** trong biểu mẫu sửa — thứ PR #30 giữ lại vì
  bàn phím dùng được nó còn kéo thả thì không — mới thành thừa.
