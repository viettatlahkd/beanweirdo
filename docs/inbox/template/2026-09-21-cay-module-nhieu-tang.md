# Cây module nhiều tầng, kéo thả lồng vào nhau

- Nhánh: `claude/project-thread-ey2sz1`
- PR: #30
- Lane: template / khu quản trị

Chủ site, hai việc trong một tin: *"xoá đi"* (nói về
`frontend/src/content/logic.ts`, câu hỏi treo từ 2026-09-19) và *"trong trang
này chỗ tree module ấy, các module đang là 1 lv thôi. tôi muốn làm thành nhiều
lv các module có thể kéo thả nằm bên trong nhau thì sao?"*.

---

## 1. [ĐỔI HÀNH VI] Bảng module trong `Cấu hình` nay là một cây

**Trước.** `Cms.tsx` vẽ `shownModules.map(...)` — một danh sách phẳng. Kéo thả
chỉ hoán vị hai phần tử của mảng ấy. Đặt một module vào trong module khác phải
mở biểu mẫu sửa của nó rồi tìm ô chọn **"Nằm trong"**.

**Sau.** Hằng `moduleRows` dựng từ `flattenTree(buildTree(shownModules))`, nên
mỗi hàng mang theo độ sâu của nó. Hàng con thụt vào `INDENT` (29px) mỗi tầng,
cỡ chữ tên giảm 3.5px mỗi tầng và dừng ở 17px, và số thứ tự đếm lại từ `01`
trong mỗi cấp (`siblingIndex`).

**Cột đã có sẵn.** `modules.parent_id` có từ migration 0025 và mọi mặt của site
đã đọc nó qua `frontend/src/lib/contentTree.ts`. Bản này **không** thêm cột,
không migration, không DDL — nó chỉ làm cho bảng quản trị bày ra thứ dữ liệu đã
nói được từ lâu.

## 2. [ĐỔI HÀNH VI] Mỗi thẻ có ba vùng thả, không phải một

**Cái đã làm.** `whereIn` trong `Cms.tsx` chia thẻ theo chiều dọc: một phần tư
trên là `before`, một phần tư dưới là `after`, nửa giữa là `inside`.
`dropModule(targetId, where)` nhận thêm tham số ấy, và `overModule` (một id)
đổi thành `dropAt` (`{ id, where }`).

**Vì sao chia tư chứ không chia đôi.** `inside` là việc mới và là việc chủ site
vừa xin, nên nó chiếm vùng rộng nhất và dễ trúng nhất.

**Một nước phòng.** Đo hỏng — `getBoundingClientRect()` trả chiều cao 0, đúng
cái jsdom luôn làm — thì `whereIn` trả `before`, tức đúng cái nút này vẫn làm
trước khi có cây. `inside` đổi cả cha của module lẫn đường dẫn của mọi bài
trong nó, nên nó không bao giờ được là câu trả lời mặc định của một phép đo
hỏng.

**Dấu hiệu trên màn.** `before`/`after` là một vạch 2px thụt vào đúng tầng thẻ
sẽ hạ xuống; `inside` viền cả thẻ đích lại (`boxShadow: inset 0 0 0 1px`, bo
theo hằng `radius`). Khác nhau vì thứ sắp đổi khác nhau: một bên là khe giữa
hai thẻ, một bên là chính thẻ kia.

**Không vẽ dấu hiệu cho nước đi sẽ bị từ chối.** `canDropHere` gọi đúng hàm mà
lúc thả sẽ gọi, nên hai câu trả lời không lệch nhau được.

## 3. `planModuleMove` — phép tính, tách khỏi giao diện

**Tệp mới.** `frontend/src/lib/moduleMove.ts`, hàm `planModuleMove(rows,
dragId, targetId, where)` trả về `{ parentId, order }` hoặc `{ error }`.

**Vì sao tách.** Kéo thả là thứ jsdom không dựng nổi. Phép tính nằm lẫn trong
`Cms.tsx` thì nó không có bài kiểm nào cả. Tách ra thì kiểm được bằng mảng.

**Hai chỗ dễ sai, cả hai đều có bài kiểm.**

- *Kéo một module là kéo cả những gì nằm trong nó.* `descendantIds` cắt nguyên
  cụm ra rồi cắm lại nguyên cụm. Nhấc mỗi cái cha ra thì lũ con ở lại chỗ cũ,
  và `sort_order` ghi xong dựng ra một cây khác hẳn cái vừa nhìn thấy.
- *`after` và `inside` phải nhảy qua hết cụm con của thẻ đích.* Cắm ngay sau
  một dòng thì thẻ vừa thả rơi vào giữa ruột nhà người ta.

**Luật chống vòng dùng chung, không chép lại.** `canReparent` trong
`contentTree.ts` là luật máy chủ cũng giữ (`backend/api/modules/[id]/index.ts`
kiểm cùng một thứ trước khi ghi). `planModuleMove` gọi thẳng nó.

**Luật hai nhóm vẫn nguyên.** `sameBand` giữ nguyên nghĩa cũ và nay chặn cả
việc lồng một cuốn nhật ký vào một module đọc — site xếp mọi `special` xuống
dưới mọi `normal`, nên một cây trộn hai nhóm sẽ bày ra khác cái vừa kéo.

## 4. Hai lượt ghi, và thứ tự của chúng

`dropModule` ghi `parent_id` **trước** rồi mới `sort_order`. `PUT /api/modules`
đọc lại cả bảng để trả về, nên ghi ngược thứ tự thì câu trả lời mang cha cũ và
màn hình dựng lại cây cũ đè lên cây vừa kéo. Ghi hỏng thì `setModules(before)`
trả màn hình về đúng cây cũ, chứ không để nó bày một cây chỉ có trên trình
duyệt này.

## 5. [ĐỔI HÀNH VI] Xoá `frontend/src/content/logic.ts`

**Cái đã làm.** Xoá tệp (218 dòng, 119 luật, 18 nhóm, 3 phần).

**Sự thật đứng sau.** Không tệp `.ts`/`.tsx` nào import nó — kiểm bằng `grep`
trước khi xoá, kết quả duy nhất là một chuỗi chữ *"logic"* nằm trong chính nội
dung tệp. Nó đã ở trạng thái ấy từ PR #16/#18 ngày 2026-09-19; câu hỏi "xoá hay
giữ" treo từ hôm đó và nay chủ site trả lời.

**Chỗ duy nhất còn đọc nó là `tools/spec-numbers.mjs`**, thứ đếm số luật để đối
chiếu với `docs/SPEC.html`. Xoá tệp mà không đụng tới nó thì lệnh ấy ném lỗi
`ENOENT`. Nay nó kiểm tệp có tồn tại không, và **bỏ ba con số luật/nhóm/phần
khỏi bản đếm** thay vì báo 0 — báo 0 thì `--check` sẽ bảo SPEC.html sai ở ba
dòng mà thật ra SPEC mới là chỗ duy nhất còn giữ con số.

**Việc này để lại cho lane tài liệu.** Các ghi chú bàn giao trong `docs/inbox/`
trích dẫn bộ luật theo `nhóm.số`, và `docs/SPEC.html` ghi con số 119. Hai chỗ
ấy thuộc lane tài liệu, tôi không sửa. Con số thật trước khi xoá ghi ở trên để
ai cần còn đối chiếu được.

## Bảng, cột, endpoint đã đụng

- Bảng `modules`, cột `parent_id`: nay **ghi** được bằng kéo thả, qua
  `PATCH /api/modules/:id` — trước chỉ ghi được từ ô chọn "Nằm trong".
- Bảng `modules`, cột `sort_order`: `PUT /api/modules` vẫn như cũ, chỉ khác là
  mảng gửi lên nay là cả cây đã duỗi thẳng.
- Không endpoint mới, không migration, không DDL.

## Đối chiếu bộ luật

Không đối chiếu được nữa: bộ luật là chính tệp vừa xoá ở mục 5. Ghi lại để
người sau biết vì sao mục này trống, chứ không phải vì quên.

## Chưa nhìn tận mắt

- Không mở được `/ad-config` thật: khu quản trị sau cổng đăng nhập. Mọi phép đo
  chạy trên trang thử mới `frontend/cms-harness.html` +
  `frontend/src/cmsHarness.tsx`, thứ dựng `Cms` **thật** với `window.fetch` bị
  chặn và một cây module dựng sẵn. Trang ấy nạp đúng hai tệp css mà `main.tsx`
  nạp — thiếu chúng thì nút vẽ ra viền mặc định của trình duyệt và trang thử
  bày một màn khác màn thật.
- Đo trong Chrome (Playwright), cây ba tầng: lề thụt 0 / 29 / 58px, cỡ chữ
  24 / 20.5 / 17px, số thứ tự `01,01,02,01,03,04,05` đúng theo từng cấp. Sáu
  phép thả: ba vùng cho ra đúng ba dấu hiệu, vạch thụt đúng tầng, và hai nước
  đi cấm (vào trong con của mình; lồng nhật ký vào module đọc) không vẽ dấu
  hiệu nào.
- Kéo thật bằng chuột trong Chrome cũng chạy: thả mép trên ghi `PUT` đúng thứ
  tự và không gọi `PATCH`; thả giữa ghi `PATCH sensory {"parent_id":"bean"}`
  rồi mới `PUT`.
- **Chưa chạm dữ liệu thật của chủ site.** Chưa lồng thử một module thật, vì
  ghi vào dữ liệu thật phải hỏi trước.
- Chưa biết cây sâu bao nhiêu tầng thì lề thụt hết chỗ. Ở 1000px và ba tầng thì
  còn rộng; bốn năm tầng chưa thử.

## Đề xuất luật (ý kiến, chưa làm)

- Cỡ chữ dừng ở 17px, nên từ tầng 4 trở đi hai tầng liền nhau chỉ khác lề thụt.
  Nếu chủ site dùng tới tầng 4 thì nên có một nét dọc chạy theo mỗi tầng.
- Chưa gấp/mở được một nhánh. Mũi tên hiện mở biểu mẫu sửa, không phải gấp cây.
  Cây dài thì đó là thứ thiếu tiếp theo, và nó cần một nút riêng chứ không phải
  đổi nghĩa mũi tên đang có.
- Ô chọn **"Nằm trong"** trong biểu mẫu sửa nay là đường thứ hai làm cùng một
  việc. Giữ lại vì bàn phím dùng được nó còn kéo thả thì không — nhưng nếu sau
  này cây có thao tác bàn phím riêng thì ô ấy thành thừa.
