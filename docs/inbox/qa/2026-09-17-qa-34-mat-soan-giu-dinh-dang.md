# QA-34: mặt soạn ăn mất "số đo"

PR: chưa mở    nhánh: `hotfix/trinh-soan-giu-dinh-dang`    commit: điền sau khi merge
Cắt từ: `origin/main` @ 084bbbc

Không phải lỗi ai báo. Tìm ra khi rà lại `LiveText` sau khi nó thay `TextRun` ở
cả ba màn (084bbbc), để xem bảng 50 mục trong `docs/spine/TRINH-SOAN.md` còn
đúng không.

## Đã sửa

### [SỬA LỖI] `_số đo_` thành chữ nhấn sau mỗi lần mở bài ra sửa

`LiveText` dựng mặt soạn bằng `TRANSFORMERS` mặc định của Lexical, nơi `_x_`
nghĩa là *italic*. `textToRuns` trong `packages/post-renderer/src/elements/runs.ts`
đọc `_x_` là `u` — gạch chân mảnh, "số đo", cố ý **không** cùng tín hiệu với
chữ nhấn. Hai cách đọc gặp nhau ở chỗ ghi ra:

    `chữ _số đo_ chữ`  →  Lexical dựng thành italic
                       →  `$convertToMarkdownString` ghi ra `*số đo*`
                       →  `textToRuns` đọc lại thành `em`.

Người viết không làm gì cả. Mở bài, click vào một khối, rời ô — số đo thành
chữ nhấn, trên trang đã đăng, không có gì nói rằng vừa mất.

Tái hiện: bài nào có `_x_` trong thân `report`, `memo` hay `bitesize`; mở
`/practice` → sửa bài → bấm vào khối chữ ấy → bấm ra ngoài → xem lại.

Sửa: `frontend/src/admin/lib/liveMarkdown.ts`, hằng `SITE_TRANSFORMERS` — viết
lại bộ transformer theo đúng phương ngữ site đọc được:

| Viết | `runs.ts` đọc là | Transformer mới |
|---|---|---|
| `*x*` · `**x**` · `__x__` | `em` (nhấn) | `format: ['bold']` |
| `_x_` | `u` (số đo) | `format: ['underline']` |
| `[chữ](địa chỉ)` · địa chỉ trần | `href` | `LINK` |

Bỏ hẳn `ITALIC_STAR`, `ITALIC_UNDERSCORE`, `STRIKETHROUGH`, `HIGHLIGHT`,
`BOLD_ITALIC_*`: site không có gì để vẽ chúng. Bỏ đi an toàn hơn giữ lại — một
ký hiệu không có transformer thì nằm nguyên làm chữ thường, còn một transformer
không có chỗ ghi ra thì ăn mất chữ.

### [SỬA LỖI] Dấu `\` mọc thêm sau mỗi lần sửa, và nhân đôi

Lexical thoát ký tự có nghĩa lúc ghi, nên `tên_file_dài` ra thành
`tên\_file\_dài`. Site không có luật nào đọc dấu `\`, nên người đọc trang nhìn
thấy đúng mấy dấu gạch chéo ấy. Lần sửa sau thoát nốt chính dấu `\` vừa thêm,
nên mỗi lần mở bài ra là số gạch chéo nhân đôi.

Site giải cùng bài toán ấy bằng cách khác — hằng `MARKED` trong `runs.ts` chỉ
bắt dấu ở ranh giới chữ — nên `tên_file_dài` vốn đã an toàn khi không thoát.

Sửa: `liveMarkdown.ts`, hàm `unescapeSite`, gọi ở `CommitOnBlur` trong
`LiveText.tsx`.

### [SỬA LỖI] `Cmd+U` gõ xong là mất

CommonMark không có ký hiệu cho gạch chân, nên bộ mặc định không có chỗ ghi
format `underline`: bấm `Cmd+U` thì chữ gạch chân hiện lên, rời ô là rơi mất.
Nay `underline` ghi ra `_x_` nên nó ở lại. **Chưa mở trình duyệt xem** — jsdom
không dựng `contenteditable`, xem mục "Chỗ test không chứng minh được".

### [ĐỔI HÀNH VI] Chữ nghiêng nhập vào chữ nhấn

Trước: `Cmd+I`, và `<em>` trong HTML dán vào, đặt format `italic`. `THEME`
trong `LiveText.tsx` vốn đã vẽ `italic` và `bold` bằng chung một lớp
(`awc-live-bold`) vì design chỉ có **một** mức nhấn — nên trên màn hình chúng
giống hệt nhau, nhưng `italic` không có chỗ ghi ra và biến mất lúc rời ô.

Sau: `OneEmphasis` trong `LiveText.tsx` đổi `italic` thành `bold` ngay tại gốc
bằng `registerNodeTransform`. Cả phím lẫn đường dán cùng về một chỗ.

Specs phải đổi theo: `TRINH-SOAN.md` mục **D1** ghi *"`Cmd+I` về cùng một mức
nếu design chỉ có một"* — nay đúng là thế, trước thì không.

### [ĐỔI HÀNH VI] Chữ nhấn ghi ra bằng `**x**`

`runsToText` trong `runs.ts` viết `em` thành `*x*`; bộ transformer mới ghi ra
`**x**`. `textToRuns` đọc cả hai thành `em` nên **nghĩa không đổi**, nhưng chữ
đã lưu sẽ đổi hình dạng ở lần sửa đầu tiên sau khi merge.

Không đảo được thứ tự để ghi ra `*x*`: `@lexical/markdown` đòi tag dài đứng
trước tag ngắn khi đọc, nếu không `**x**` đọc thành một dấu sao, `*x*`, rồi một
dấu sao nữa — và cùng thứ tự ấy quyết định luôn tag nào được dùng lúc ghi.

### [SỬA LỖI] `.claude/settings.local.json` lọt vào `git status`

Thêm một dòng vào `.gitignore`. File cấu hình của từng máy, không phải của repo.

## Đụng dữ liệu

Không đụng bảng, cột hay endpoint nào. Không có migration.

Thay đổi nằm trọn ở đường ghi `posts.body` — cùng một cột, cùng một định dạng
markdown, chỉ khác ở chỗ ký hiệu nào đọc ra nghĩa gì. Không có bản vá dữ liệu
kèm theo: bài nào đã bị đổi `_x_` thành `*x*` trước bản sửa này thì đã mất dấu
số đo, và không có cách nào biết `*x*` nào vốn là số đo.

**Chưa đo có bao nhiêu bài đã dính.** Cần chủ site quyết có rà không — rà được
bằng một câu `curl` lên `posts`, đếm bài có `_` ở thân.

## Đụng luật

Nhóm **08 Ghi — sửa và lưu**, luật 08.2 (*"Ở mọi ô đang sửa: Enter để lưu, Esc
để bỏ, rời con trỏ cũng lưu"*): bản sửa không đổi luật này. `CommitOnBlur` vẫn
ghi khi rời ô, chỉ ghi ra đúng chữ hơn.

Không luật nào trong `logic.ts` nói về ký hiệu định dạng trong dòng. Bản sửa
không mâu thuẫn luật nào.

**Một chỗ lệch, báo chứ không sửa:** ghi chú
`2026-09-10-spine-ban-phim-trinh-soan.md` viết *"thực thi một luật đã có trong
nhóm 16 (màn soạn vẽ đúng thứ trang sẽ vẽ)"*. Nhóm 16 trong `logic.ts` hiện là
*"[[hours]] — một hoạt động"*, và không nhóm nào mang câu ấy. Lane Tài liệu
xem lại giúp — hoặc ghi chú kia trích sai, hoặc `logic.ts` đã đánh số lại.

**Bảng 50 mục trong `docs/spine/TRINH-SOAN.md` nay lệch với code.** Bảng ấy
viết trước 084bbbc, tức trước khi thân bài chuyển sang Lexical, nên cột "sau
sáu đợt" đang mô tả một trình soạn không còn tồn tại. Cụ thể, `blockKeys`,
`marks`, `editHistory` giờ chỉ còn với tới mấy ô `textarea` phụ; `LiveText`
không nhận `onKeyDown`, không nối vào `editHistory`, và không có đường `/`.
Mục A1–A5, A9, A10, B1–B9, D1–D3, F1–F5 cần đo lại hết. Đây là lane Tài liệu
và lane Kiến trúc — tôi không sửa bảng ấy.

## Kiểm chứng

- `frontend/src/admin/lib/liveMarkdown.test.ts` — 9 test mới, mỗi ký hiệu site
  có một dòng, kèm một test chạy ba vòng sửa liên tiếp để bắt dấu `\` nhân lên.
- `npm test` trên nhánh này: **123 file, 1251 test xanh**, không có test đỏ và
  không có test bỏ qua.
- `npm run build --prefix frontend`: xanh.
- **Chưa mở trình duyệt xem.**

## Chỗ test không chứng minh được

1. **`Cmd+U` có thật sự gõ được gạch chân không.** Lexical bắt phím ấy qua
   `beforeinput`, thứ jsdom không phát. Test chỉ chứng minh: *nếu* format
   `underline` có mặt thì nó ghi ra `_x_`.
2. **Chữ nghiêng dán từ Word/Notion vào có đi qua `OneEmphasis` không.** Test
   chứng minh phép biến đổi đúng, không chứng minh đường dán chạm tới nó.
3. **Số đo có hiện ra đúng hình gạch chân mảnh trong mặt soạn không.** `THEME`
   nối `underline` với lớp `awc-live-u`; lớp ấy trông thế nào là việc của
   `admin.css` và của mắt người xem.

## Đề xuất luật

22. Một ký hiệu định dạng chỉ có một nghĩa trong toàn hệ thống. Mặt soạn và
    mặt đọc phải cùng đọc `_x_` ra một thứ; hai bộ luật đọc cùng một chuỗi là
    một chỗ mất chữ đang chờ xảy ra.
23. Thư viện ngoài mang phương ngữ của nó theo. Nối một thư viện soạn thảo vào
    thì việc đầu tiên là chạy một vòng chữ của mình qua nó và so từng ký tự —
    không phải mở lên gõ thử vài dòng.
