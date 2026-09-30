# Nút `+` chèn đúng chỗ con trỏ, và bộ icon của menu

- Nhánh: `claude/project-thread-ey2sz1`
- PR: #27
- Lane: template / mặt soạn

Chủ site báo hai việc trong một tin: *"cái [+] đang ấn thêm khối nó không thêm
vào vị trí con trỏ edit [|] mà lại thêm ở tít các vị trí nào bên dưới ấy"* và
*"đổi list icon của các cái options trong đó luôn"*.

---

## 1. [SỬA LỖI] Nút `+` chèn khối ra ngoài dải chữ, xuống tận cuối bài

**Cái đã làm.** Bỏ hẳn phép cộng chỉ số ở cả bốn chỗ gọi `onInsertAfterLine`
trong `Editor.tsx` (`ArticleEditor.wrapSection`, `LongformEditor.wrapBlock`,
`useElementBody.wrapElement`, và dải chữ của report trong `ReportEditor`).
Trước đây cả bốn tính vị trí chèn bằng `run.at[0] + lineIndex + 1`; nay chúng
gọi `insertThing` (`frontend/src/admin/lib/flow.ts`), `insertSectionThing`
(`articleFlow.ts`) và `insertLongformThing` (`longformFlow.ts`).

**Bằng chứng cho việc phép cộng ấy sai.** `lineIndex` là *khối thứ mấy trên
mặt soạn*, đếm theo con của `.awc-live-input`. `run.at[0]` là *khối thứ mấy
trong kho*. Hai con số ấy chỉ bằng nhau khi mỗi khối trong kho vẽ ra đúng một
khối trên mặt soạn, và có hai chỗ nó không bằng:

- `articleFlow.ts:sectionToMarkdown` viết một `section` thành `## tiêu đề` rồi
  một dòng trống rồi đoạn văn — tức **hai** khối trên mặt soạn cho **một**
  section. Đo trong Chrome: thân bài ba section vẽ ra sáu con
  `H2,P,H2,P,H2,P`; con trỏ ở con thứ 4 cho `lineIndex = 4`, cộng ra chỉ số 5
  trong một mảng chỉ có 3 phần tử — khối chèn vào rơi xuống cuối bài.
- `longformFlow.ts:runToMarkdown` nối cả dải bằng `join('\n')`, một dấu xuống
  dòng. Lexical đọc nhiều dòng liền không có dòng trống là **một** đoạn văn,
  nên năm khối kho vẽ ra một con. `lineIndex` vì thế luôn là 0 hoặc 1, và khối
  chèn vào luôn rơi ngay sau khối đầu dải bất kể con trỏ ở đâu.

**Cách chữa.** `frontend/src/admin/lib/mdBlocks.ts` (mới): `mdBlocks` cắt
chuỗi markdown của một dải ra đúng những khối mặt soạn vẽ, và
`splitAfterBlock(text, index)` trả về hai nửa quanh chỗ con trỏ. Ba hàm
`insert*Thing` lấy hai nửa ấy đem qua `markdownToBlocks` / `markdownToRun` của
từng màn rồi ghép lại. Không còn phép cộng chỉ số nào trong đường chèn.

**Ba luật của Lexical mà `mdBlocks` phải theo**, đo bằng
`frontend/src/admin/lib/mdBlocks.test.tsx` — bài kiểm ấy dựng một `LiveText`
thật cho mỗi trường hợp rồi đếm con của nó, chứ không kiểm theo ý mình đoán:

1. Danh sách **nuốt** dòng chữ thường ngay sau nó: `- a\n- b\np3` ra một khối,
   không phải hai. Trích dẫn cũng vậy.
2. Một dòng trống **không** cắt hai danh sách cùng kiểu — chúng vẫn gộp làm
   một. Nhưng dòng trống rồi đến chữ thường thì cắt.
3. Tiêu đề luôn đứng một mình.

**Đã đo trong Chrome thật** (Playwright, trang thử `frontend/harness.html`):
năm khuôn `article`, `longform`, `memo`, `bitesize`, `report`, mỗi khuôn đặt
con trỏ ở ba vị trí khác nhau trong dải. Cả mười lăm lần khối mới rơi ngay sau
khối con trỏ đang đứng.

## 2. [SỬA LỖI] Mặt soạn không đọc lại chữ đã đổi từ bên ngoài

**Cái đã làm.** Thêm `SyncOutside` vào
`frontend/src/admin/components/LiveText.tsx`.

**Vì sao.** Lỗi này lòi ra *sau khi* sửa mục 1, và không sửa nó thì mục 1 vô
nghĩa. `LiveText` đưa `text` cho Lexical qua `initialConfig.editorState`, thứ
Lexical đọc đúng một lần lúc dựng. Chừng nào chữ chỉ đổi do người viết gõ thì
thế là đủ. Nhưng nút `+` nay **cắt dải làm đôi**, nên dải trên chỉ còn một
nửa — mà React giữ nguyên component (cùng `key`), Lexical không đọc lại, và
trên màn hình hiện ra **hai bản của cùng đoạn văn**, một ở trên khối mới một ở
dưới. Chụp lại được trong Chrome: dải đầu vẫn bày đủ sáu con `H2,P,H2,P,H2,P`
trong khi kho chỉ còn một section.

`SyncOutside` so bằng chính chuỗi markdown chứ không bằng một cờ: dựng lại một
mặt soạn đang có con trỏ là làm mất chỗ đang gõ, nên nó chỉ dựng lại khi chữ
thật sự khác.

## 3. [ĐỔI HÀNH VI] Menu `+` đổi từ ký tự Unicode sang icon SVG

**Cái đã làm.** Bỏ bảng `GLYPH` trong `Editor.tsx`; thêm
`frontend/src/admin/components/BlockIcon.tsx` với mười ba hình SVG, một hình
cho mỗi loại khối. `InsertMenu` gọi `<BlockIcon name={e.name} />`. Ô chứa icon
(`.awc-insert-glyph`) to lên 24→26px, bo 4→6px, và đổi viền khi rê chuột.

**Trước/sau.** Trước: `H`, `•`, `❝`, `—`, `▊`, `⊞`, `⋮`, `▃`, `▣`, `¶`, và
`1.` cho danh sách đánh số. Sau: SVG nét 1.5px, khung 16×16, ăn màu chữ quanh
nó.

**Sự thật đứng sau.** Ký tự Unicode là **chữ**, nên nó theo font của hệ điều
hành: đậm nhạt và cao thấp mỗi máy một khác, và ký tự hiếm thì có máy vẽ ra ô
vuông rỗng. Tôi không đo được trên Windows từ đây.

**Đối chiếu bộ luật.** Không mâu thuẫn với nhóm nào. Nhóm `08` (*Ghi — sửa và
lưu*) nói về lưu và hoàn tác, không nói về chèn khối; cả ba mục trên không
đụng tới luật nào trong đó.

## Bảng, cột, endpoint đã đụng

Không có. Cả ba mục nằm trong mặt soạn phía trình duyệt; cách lưu thân bài
không đổi một chữ, không thêm hay bớt cột nào, không gọi endpoint mới.

## Chưa nhìn tận mắt

- `/practice` nằm sau cổng đăng nhập nên mọi phép đo ở trên chạy trên trang thử
  `frontend/harness.html`, không phải trên bài thật của chủ site.
- Trang thử không dựng khuôn `cards` có dải chữ, nên khuôn ấy chỉ có `npm test`
  đứng sau, không có phép đo trong trình duyệt.
- Icon mới chưa được nhìn trên Windows.

## Đề xuất luật (ý kiến, chưa làm)

- `longformFlow.ts:runToMarkdown` nối bằng một dấu xuống dòng, nên nhiều đoạn
  văn liền nhau của longform vẫn là **một** khối trên mặt soạn. Sau bản sửa
  này khối chèn vào rơi sau cả cụm ấy, đúng với cái người viết nhìn thấy, chứ
  chưa rơi giữa hai đoạn. Muốn chính xác tới từng đoạn thì phải đổi `join('\n')`
  thành `join('\n\n')`, và đó là đổi cách lưu của longform — việc riêng, không
  gộp vào đây.
- `frontend/harness.html` và `frontend/src/harness.tsx` nay dựng cả sáu khuôn
  chứ không còn ba. Chính vì thiếu `article` và `longform` mà lỗi ở mục 1 sống
  được lâu: trang thử không bao giờ chạm tới chúng.
