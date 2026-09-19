# spine/tree-05-muc-luc-long-cap · Màn Mục lục lồng cấp theo cây

PR: (chưa mở — chờ chủ site đồng ý)   nhánh: claude/project-thread-vvnk0a
base: origin/main @ `d42aa72`

## Bối cảnh

Sau PR #4 (`d42aa72`), bốn bề mặt đã đọc cây: đường dẫn, sidebar, trang module,
sơ đồ CMS. Còn đúng một chỗ phẳng, và là chỗ mang tên *Mục lục*:
`IndexScreen`. `indexModules` trả về mọi module công khai không phân cấp, nên
sau khi migration chạy, màn ấy sẽ liệt kê "bean weirdo", "Roasting", "Biochem"
ngang hàng nhau — một danh sách module, không phải một mục lục.

Không hỏng: mọi mục vẫn tới được. Nhưng nó mâu thuẫn trực tiếp với hình chủ site
gửi.

## Đã đổi

- [ĐỔI HÀNH VI] Dạng A (`Ledger`) đi `flattenTree(buildTree(modules))` thay cho
  `modules.map` — `frontend/src/screens/IndexScreen.tsx:Ledger`. Thứ tự là
  chiều sâu trước, và mỗi bậc thụt vào 28px (14px ở màn hẹp).
- [ĐỔI HÀNH VI] Cỡ chữ tiêu đề module ở dạng A nhỏ dần theo bậc, 8px mỗi bậc,
  có sàn 26px (22px ở màn hẹp). Chỉ thụt vào thôi thì khi tiêu đề xuống dòng,
  quan hệ cha-con không còn đọc được.
- [ĐỔI HÀNH VI] Dạng B (`Columns`) cũng đi chiều sâu trước, nhưng **không thụt
  vào**: ba ô bằng nhau là bản sắc của biến thể này. Thay vào đó dòng nhỏ phía
  trên tên đọc thành `trong <tên module cha> · <concept>` —
  `frontend/src/screens/IndexScreen.tsx:Columns`, biến `holder`.

## Không đổi `indexModules`

Đáng nói vì đây là chỗ dễ sửa nhầm. `sidebarModules` **là chính** `indexModules`
(`export const sidebarModules = indexModules`), và sidebar **cần** danh sách
đầy đủ, phẳng, để tự dựng cây. Cho `indexModules` trả về mỗi module gốc thì
sidebar mất sạch hàng con. Nên việc lồng cấp nằm ở màn hình, không nằm ở hàm lọc.

## Đụng dữ liệu

- Không đổi schema, không đổi endpoint, không đổi hợp đồng API.
- Không thêm truy vấn nào.
- Không ghi gì vào cơ sở dữ liệu thật.
- Chưa có `parent_id` nào nên màn Mục lục hiện vẫn vẽ **y hệt trước**.

## Đối chiếu bộ luật

- **Nhóm 01 · Màu** — không đụng. Mỗi module vẫn giữ accent của chính nó ở cả
  hai dạng; ở dạng B ô màu của module con không đổi theo cha.
- **Nhóm 05 · Điều hướng** — không mâu thuẫn thêm ngoài chỗ `tree-02` đã nêu.
- Chưa có luật nào nói về thứ tự hay cỡ chữ của màn Mục lục. Đề xuất ở mục cuối.

## Kiểm chứng

- `npm test`: **125 file, 1280 test xanh**, 2 skip. `npm run lint` 0 lỗi (còn
  một cảnh báo có sẵn ở `components/ActivityRow.tsx`). `vite build` xanh.
- Test mới: 2 trong `IndexScreen.test.tsx` — dạng A đặt module con **sau** cha
  và thụt vào đúng 84px (56 + 28); dạng B hiện dòng `trong bean weirdo · flavor`.
- 2 test `IndexScreen` có sẵn xanh không sửa dòng nào.
- **Chưa mở trình duyệt xem.** Chưa có `parent_id` nên không có gì để nhìn.
  Đây là thay đổi **thuần thị giác**, nên nó là thứ cần xem mắt nhất trong cả
  loạt: cỡ chữ ở bậc 3 và bậc 4, và dòng `trong ...` khi tên module cha dài.

## Đề xuất luật (chưa ghi vào `logic.ts`)

- Màn Mục lục xếp module theo chiều sâu trước: một module con nằm ngay sau
  module chứa nó.
- Dạng danh sách nói quan hệ cha-con bằng chỗ thụt vào và cỡ chữ; dạng cột nói
  bằng một dòng chữ, vì ô của nó bằng nhau.
