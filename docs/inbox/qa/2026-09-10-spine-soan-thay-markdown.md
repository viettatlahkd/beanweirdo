# Màn soạn vẽ markdown, và dán từ Notion giữ được định dạng

PR: chưa mở    nhánh: spine/soan-thay-markdown    commit: điền sau khi merge
Cắt từ: origin/main @ 5077fad
Nguồn: chủ site — "preview thì nó có nhận rồi nhưng trong editor thì lại không
thấy được", kèm ảnh một đoạn hiện nguyên `**...**`. Và: "nó paste lấy cả notion
html style à cái đó thì vẫn giữ nhé nhưng mà phải kết hợp cả base là markdown
render nữa".

Nối tiếp `2026-09-10-spine-dan-markdown.md` (#98) và `-ba-man.md` (#99).

## [SỬA LỖI] Ô soạn hiện ký hiệu thay vì vẽ bài

Trang công khai đi qua `Inline` nên `**chữ**` ra chữ nhấn. Ô soạn thì là một
`textarea` chữ thô, nên cùng một đoạn hiện nguyên dấu sao. Chủ site phải sang
ô Xem trước mới biết đoạn mình vừa viết trông ra sao.

Đây là lỗi chứ không phải lựa chọn: nhóm 16 nói **màn soạn vẽ đúng thứ trang
sẽ vẽ**, rồi biến từng chỗ chữ thành ô nhập.

Nay `EditableField` nhận `markdown` và có **hai mặt**. Con trỏ ở ngoài thì nó
vẽ — `Inline`, cùng hàm trang dùng. Bấm vào thì hiện chữ thô để sửa. Rời ô là
vẽ lại, kể cả khi chữ không đổi.

Bật ở sáu chỗ: `paragraph`, `heading`, `quote`, `callout`, dòng danh sách và
dòng phụ của danh sách. Không bật ở nhãn, nguồn trích, ô thông số — chúng
không mang định dạng.

### Con trỏ phải rơi đúng chỗ vừa bấm

`rawIndexFor(text, drawnIndex)` trong `runs.ts` quy đổi vị trí trong chữ **đã
vẽ** về vị trí trong chữ **thô**. Không có nó thì bấm vào giữa một đoạn dài sẽ
nhảy về cuối dòng — thao tác thường nhất trong một ô nhập thành thao tác hỏng.

Bản đầu của hàm này **sai**, và test bắt được: nó đo bằng cách dựng lại chữ từ
runs (`runsToText`), mà cùng một chữ nhấn viết được bằng `*x*` hoặc `**x**`.
Bản dựng lại luôn ra `*x*`, nên với chữ thô viết bằng `**` thì mọi vị trí sau
dấu đầu tiên đều lệch. Nay đo trên chính chữ đang có.

## [ĐỔI HÀNH VI] Dán từ Notion đọc bản HTML, dịch về markdown

Trước lượt này tôi đọc `text/plain`. Chủ site nói đúng: bản chữ thuần mà
Notion, Lark và Docs đặt lên clipboard **đã bỏ đậm và bỏ link**, nên đọc bản
ấy là chấp nhận mất định dạng ở mọi lần dán.

`htmlToMarkdown` ở `packages/post-renderer/src/elements/html.ts` đọc bản HTML
và dịch về markdown — đúng ký hiệu mọi chỗ khác đã dùng. Định dạng sống sót,
style của trang nguồn thì không.

Đọc được: `strong`/`b`/`em`/`i` → `**` (design chỉ có **một** mức nhấn, nên
đậm và nghiêng về chung một dấu — vẽ hai mức là hứa thứ template không có);
`u` → `_`; `a` → `[chữ](địa chỉ)`; `img` → `![]()`; `h1`–`h6` → `#`;
`ul`/`ol`/`li` lồng nhau → gạch đầu dòng có thụt lề; `blockquote` → `>`;
`table` → bảng markdown; `pre` → khối mã. `code` trong dòng mất dấu nhưng
**giữ chữ** — không có element nào cho nó.

`div` lồng `div` của Notion không bị nối thành một dòng: một `div` chỉ chứa
các khối khác thì không phải đoạn văn.

**Không thoát dấu markdown nằm sẵn trong chữ nguồn.** Thoát bằng `\*` chỉ đúng
nếu bên đọc hiểu gạch chéo, mà `textToRuns` thì không — nó sẽ vẽ đúng cái gạch
chéo ấy ra cho người đọc thấy. Đổi lại, dấu nhấn chỉ bám ở ranh giới từ và
phải có đôi, nên `2 * 3` và `snake_case` đi qua nguyên vẹn.

### Phải thấy một cái thẻ thật mới coi là HTML

Test bắt được lỗi thứ hai: **có nguồn trả về chính chữ thuần cho ô
`text/html`** (jsdom là một, và không chỉ jsdom). Đem chữ thuần đi phân tích
như HTML là nuốt sạch ký tự xuống dòng — sáu gạch đầu dòng về một dòng, đúng
cái lỗi ba PR này đang sửa. Nay `clipboardMarkdown` kiểm `/<[a-z!/]/i` trước.

## Test cũ phải sửa theo, và vì sao

20 test hỏng sau thay đổi này. **Không cái nào bị bẻ cho qua** — tất cả là
cùng một chuyện: chúng tìm ô bằng `placeholder` hoặc `getByDisplayValue`, mà
một ô chưa bấm vào nay không phải `input` nữa.

Đáng chú ý một cái: `Editor.structure.test.tsx` có test tên *"chữ nhấn hiện
dạng sửa được"*, khẳng định `getByDisplayValue('Ngọt mía, *hậu vị ngắn*')` —
tức là nó **ghi nhận đúng hành vi cũ mà chủ site vừa báo là sai**. Tôi viết
lại nó thành hai vế: mặt vẽ ra `<em>`, bấm vào mới ra chữ thô đủ dấu. Không
xoá coverage.

## Bảng, cột, endpoint

Không đụng cái nào. Không migration. Cách lưu không đổi một chữ — ký hiệu
markdown **chính là** cách lưu, như memo vẫn thế từ trước.

## Đối chiếu bộ luật

- Lượt này **thực thi** một luật đã có trong nhóm 16 (màn soạn vẽ đúng thứ
  trang sẽ vẽ) chứ không thêm luật mới. Trước đây các ô chữ vi phạm nó.
- **A30** (đề xuất) vẫn đúng và nay đúng ở cả hai mặt của ô.
- `node tools/spec-numbers.mjs --check`: 3 phần · 18 nhóm · 119 luật.

## Kiểm chứng

- `npm test`: **114 file, 1156 test xanh**, gồm typecheck cả ba tsconfig.
- `npm run build --prefix frontend`: xanh.
- Test mới: `elements/html.test.ts` (12), `Editor.markdown.test.tsx` (13).
- **Chưa mở trình duyệt xem.** Ba chỗ cần soi mắt, xem mục dưới.

## Chỗ test không chứng minh được

1. **Con trỏ rơi đúng chỗ bấm.** jsdom không có `caretPositionFromPoint` nên
   trong bài kiểm nó luôn lùi về cuối dòng. Phép quy đổi `rawIndexFor` có test
   riêng, nhưng **đoạn nối từ toạ độ chuột tới chỉ số chữ thì chưa**.
2. **Dán thật từ Notion.** Test dựng clipboard bằng tay; HTML thật của Notion
   nhiều tầng `div` và thuộc tính hơn.
3. **Ô nhảy khi lật mặt.** Mặt vẽ và mặt gõ phải cao bằng nhau, nếu không thì
   mỗi lần bấm vào ô là cả trang giật một cái.

## Nợ, chưa xử lý

- **CI `main` đỏ sẵn** — `SPEC.html` ghi 23 migration, thật là 26. Từ trước
  #98. Lane Tài liệu.
- **cards, article, longform** chưa nối chỗ dán và chưa bật mặt vẽ. Ba cái này
  có khuôn soạn riêng thật, không dùng `ReportBlockFields`.
- **`InlineField`** (ô Tiêu đề, Thân bài của bitesize) nay ép chữ thuần nhưng
  **chưa đọc bản HTML** như `EditableField`. Dán từ Notion vào ô Tiêu đề vẫn
  mất đậm. Nó là `contentEditable` nên đường xử lý khác, để riêng một lượt.

## Đề xuất luật

12. Ô soạn vẽ đúng thứ trang vẽ, và chỉ hiện ký hiệu khi con trỏ nằm trong nó.
    Một ô luôn hiện `**chữ**` là bắt người viết đọc ký hiệu thay vì đọc bài.
13. Lật giữa hai mặt phải giữ được chỗ con trỏ. Nhảy về cuối dòng là làm hỏng
    thao tác thường nhất trong một ô nhập để đổi lấy một cái đẹp mắt.
14. Đo vị trí trong chữ thì đo trên **chữ đang có**, không trên bản dựng lại
    từ cấu trúc. Cùng một định dạng viết được bằng nhiều ký hiệu, nên bản dựng
    lại có độ dài khác cái người viết đang nhìn.
15. Clipboard đọc bản HTML trước, vì bản chữ thuần của Notion và Lark đã đánh
    mất đậm và link. Nhưng phải thấy một cái thẻ thật mới coi là HTML.
16. Ký hiệu nguồn mà kho element không có thì bỏ ký hiệu, **giữ chữ**.
