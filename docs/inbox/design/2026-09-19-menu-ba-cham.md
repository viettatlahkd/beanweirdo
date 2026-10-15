# Hành động của một dòng bài dồn vào menu ba chấm

Nhánh: `claude/project-thread-r3z436`. PR: chưa mở, đang đợi chủ site gật.
Tiếp sau PR #12 (`docs/inbox/design/2026-09-19-nut-lech-cot-va-icon-ghim.md`).

Chủ site yêu cầu ngày 2026-09-19: *"cho hết mấy button kia vào cái nút ba chấm
dọc ấy bấm vào thì hiện các buttons options ra và bỏ nút sửa đi. cho click vào
từng row là vào luôn màn edit"*.

Cả ba mục dưới đây là **[ĐỔI HÀNH VI]**. Không mất một hành động nào — chúng đổi
chỗ, trừ "Sửa" là bỏ hẳn vì cả dòng thay nó.

---

## [ĐỔI HÀNH VI] Mỗi dòng bài chỉ còn một nút hành động

`admin/components/PostCard.tsx`: thêm component `RowMenu` và kiểu `MenuItem`.

Trước: mỗi dòng bày ba đến năm nút — `Sửa`, `Nhân bản`, cộng các mục của
`ACTIONS_BY_STATUS` theo trạng thái bài.

Sau: một nút icon `IconMore` (ba chấm dọc, `aria-haspopup="menu"`,
`aria-expanded`), bấm ra một `<div role="menu">` chứa đúng những mục ấy dưới dạng
`<button role="menuitem">`. `Nhân bản` đứng đầu vì nó không phụ thuộc trạng thái;
các mục `danger` mang `ab-menuitem-danger`.

`MenuItem` là kiểu phân biệt (`{ kind: 'copy' } | { kind: 'status'; action }`),
không phải ép kiểu `'copy' as StatusAction` — `Nhân bản` gọi `onCopy`, còn lại
gọi `onAction`, và TypeScript giữ hai đường ấy tách nhau.

Menu đóng khi: chọn một mục, bấm Esc, hoặc bấm ra ngoài. Chỗ bấm ra ngoài nghe
`mousedown` **chứ không phải** `click` — nghe `click` thì cú bấm đóng menu sẽ rơi
tiếp xuống dòng bên dưới và mở luôn màn sửa.

## [ĐỔI HÀNH VI] Bỏ nút "Sửa"; bấm vào dòng là vào màn sửa

Thẻ `<div>` của dòng nay có `onClick={() => onEdit(post.id)}` và
`cursor: 'pointer'`.

Tiêu đề bài đổi từ `<div>` sang `<button className="ab-rowtitle">` cũng gọi
`onEdit`. **Đây không phải trang trí:** một `<div onClick>` thì bàn phím và trình
đọc màn hình không tới được. Cho cả dòng `role="button"` thì lại lồng nút ghim và
nút ba chấm vào trong một nút, còn tệ hơn. Nên: dòng là vùng bấm rộng cho chuột,
tiêu đề là nút thật có tên cho bàn phím.

Cột bên phải (nhãn template, huy hiệu, ghim, ba chấm) bọc trong một `div` có
`onClick={(e) => e.stopPropagation()}`, không thì bấm ghim cũng nhảy vào màn sửa.
Có phép thử khoá đúng điều này.

## [ĐỔI HÀNH VI] `ACTIONS_WIDTH` bỏ đi

Hằng `ACTIONS_WIDTH = 400` thêm ở PR #12 nay không còn — cột thứ ba quay về
`auto`. Lý do nó tồn tại là các dòng có số nút khác nhau nên cột co khác nhau;
giờ mọi dòng có đúng cùng một bộ điều khiển nên vấn đề ấy tự mất. Phần sửa
`IconPin` của PR #12 thì vẫn còn nguyên giá trị.

---

## CSS đã thêm

`admin/admin.css`, cuối file: `.ab-rowtitle` (kèm `:hover`, `:focus-visible`),
`.ab-menu`, `.ab-menuitem` (kèm `:hover`, `:focus-visible`),
`.ab-menuitem-danger`. Tất cả dùng `border-radius: 4px` như phần còn lại —
`design/Button.test.tsx` khoá điều đó.

`.ab-menu` neo vào nút bằng `position: absolute` trong một bọc `position:
relative`, **không** neo theo khung nhìn: danh sách bài cuộn được, mà menu đo
theo khung nhìn thì nó trôi khỏi dòng của nó khi cuộn.

`design/icons.tsx`: thêm `IconMore` — ba chấm đặc, cùng lý do với `IconPin`, ở
16px một vòng tròn nét 1.5px là một vệt còn chấm đặc là một chấm.

## Test đã sửa

`PostsPanel.test.tsx` — ba phép thử trước đây bấm thẳng vào nút hành động nay
phải mở menu trước, qua hàm `openRowMenu()`. **Đây là đổi hành vi, không phải
sửa test cho xanh.**

Một chỗ đơn giản đi: nhãn `Lưu trữ` của bộ lọc và `Lưu trữ` của hành động dòng
trước đây trùng chữ nên phải lọc bằng `aria-pressed`. Nay bộ lọc là `button` còn
hành động là `menuitem`, vai trò tự tách chúng ra.

`PostCard.pin.test.tsx` — bỏ phép thử `"Xoá" không trông giống "Sửa"` (không còn
nút "Sửa"), thêm năm phép thử: dòng không bày nút hành động nào; bấm dòng và bấm
tiêu đề đều vào màn sửa; bấm ghim hay ba chấm thì **không** vào màn sửa;
`Nhân bản` gọi `onCopy` chứ không phải một phép đổi trạng thái; chọn xong thì
menu đóng, Esc cũng đóng.

## Đối chiếu với bộ luật

Không mâu thuẫn luật nào. Nhóm 08 nói về xoá chữ khi soạn thảo, không nói về nút
xoá trong CMS — xem mục đính chính trong ghi chú PR #3.

## Bảng, cột, endpoint đã đụng

**Không cái nào.** `onAction`, `onCopy`, `onEdit`, `onPin` giữ nguyên chữ ký; chỉ
đổi chỗ bấm ra chúng.

## Kiểm

- `npm test` — 127 file, **1315 test xanh**, 2 skip. Lint và typecheck sạch.
- **Đã mở ra nhìn**, kể cả menu lúc mở: trang chụp tự bấm nút ba chấm của dòng
  thứ hai sau khi mount, nên ảnh là menu thật do chính component vẽ. Cách chụp
  ghi trong ghi chú của PR #12.
- Có soi ở mức phóng to 2x để chắc nút ghim lúc ghim và lúc chưa ghim vẽ khác
  nhau thật — ở ảnh thu nhỏ hai trạng thái trông giống nhau, phóng to thì rõ là
  nền đặc so với nền trắng.
- **Chưa kiểm được:** ba thanh dính của PR #3. Vẫn cần cuộn thật.

## Gộp với lane khác

Nhánh này cắt lại từ `main` sau khi `b74e77a` (lane kiến trúc) vào. Commit ấy
chuyển `TEMPLATE_LABEL` từ `PostCard.tsx` sang `content/templates.ts`; tôi lấy
bản của họ và bỏ bản sao trong `PostCard.tsx`.

## Đề xuất luật

Chưa làm, để chủ site quyết:

1. Trong danh sách, hàng là chỗ bấm để mở; các việc khác nằm sau một nút ba
   chấm. Nếu chốt thành luật thì màn Ghi chép và sơ đồ trang cũng nên theo, hiện
   chúng chưa.
