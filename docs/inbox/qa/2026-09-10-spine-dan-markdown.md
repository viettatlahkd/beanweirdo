# Dán gạch đầu dòng, và link đọc ra thành link

PR: chưa mở    nhánh: spine/dan-markdown    commit: điền sau khi merge
Cắt từ: origin/main @ 0eaedf9
Nguồn: chủ site báo — dán bullet points và link từ trang khác vào màn soạn thì
không ra bullet points, không ra link.

Ghi chú này chạm `packages/post-renderer`, vốn thuộc lane Kiến trúc, nhưng làm
ở worktree `hotfix` vì worktree `spine` đang giữ `spine/bitesize-portrait-column`.
Xem mục cuối — có một cái bẫy môi trường ở worktree `hotfix` cần lane Kiến trúc
biết.

## [SỬA LỖI] Dán sáu gạch đầu dòng, nhận về một dòng

Ba nguyên nhân rời nhau, không phải một:

1. Ô nhập dòng danh sách là `input` một dòng — `EditableField` trong
   `Editor.tsx`. Trình duyệt bỏ ký tự xuống dòng trước khi mã của mình nhìn
   thấy, nên sáu mục về thành một chuỗi chạy tràn khỏi khối.
2. Không chỗ nào đọc clipboard. `grep -rn "onPaste\|clipboardData"` trên
   `frontend/src` và `packages/` trước lượt này trả về **0 dòng**.
3. Link thì hệ thống chưa từng có — `Run` trong `runs.ts` chỉ khai `em` và `u`,
   không có `href`. Không phải vẽ sai; là chưa có khái niệm để vẽ.

Nay `EditableField` nhận thêm `onPasteText`. Nó đọc `text/plain` của clipboard
— không đọc `text/html`, vì mọi trình soạn đều đặt sẵn bản markdown vào ô chữ
thuần, còn bản HTML thì mỗi nơi một kiểu và kéo theo style của trang nguồn.
Trả `false` thì trình duyệt dán như thường.

`pastedToItems` ở `packages/post-renderer/src/elements/paste.ts` đọc cái dán
vào thành `ListItem[]`:

- Dấu đầu dòng: `-` `*` `+` `•` `‣` `▪` `·` `–` `—`; đánh số `1.` và `1)`.
- Tầng bậc đọc từ **các mức thụt lề có mặt trong chính cái dán vào**, không
  theo một bước cố định. Nguồn thụt 2 dấu cách, nguồn thụt 4, nguồn thụt tab —
  cả ba về cùng một hình dạng. Tab tính 4 cột.
- Quá ba tầng thì dồn về tầng ba: design chỉ vẽ ba, lồng thêm là dựng một tầng
  không có cách nào vẽ ra.
- Nhiều dòng không có dấu đầu dòng vẫn thành nhiều mục — có nguồn chỉ đưa chữ
  trần lên clipboard.
- Một dòng chữ trần trả `null`, để dán một cụm chữ vào giữa câu vẫn là dán như
  thường.

Chỗ nối ở `ListEditor.pasteInto` và `ListEditor.splice` trong `Editor.tsx`:
dán vào dòng trống thì thay chỗ nó; dòng đã có chữ thì chữ ở lại, cái dán vào
nằm dưới, cùng độ sâu.

## [ĐỔI HÀNH VI] Link là một định dạng trong dòng

`Run` thêm khoá `href`. Ký hiệu trong ô chữ là markdown: `[chữ](địa chỉ)`.

Một địa chỉ trần cũng thành link, và ghi ngược lại thành **chính nó** chứ không
phồng thành `[địa chỉ](địa chỉ)` — nếu không thì mỗi vòng sửa lại làm dòng dài
thêm. Dấu chấm câu cuối câu không bị nuốt vào địa chỉ.

Trước: `runsToText`/`textToRuns` chỉ biết `*nhấn*` và `_số đo_`.
Sau: biết thêm `[chữ](địa chỉ)`, địa chỉ trần, và `**đậm**` / `__đậm__` (hai
cái sau về chung một `em`, vì design chỉ có một mức nhấn — không để chúng rơi
ra trang thành dấu sao người đọc nhìn thấy).

Dấu nhấn nay chỉ bám ở ranh giới từ, như markdown vẫn làm. Không có luật đó thì
`file_ten_bien.ts` đọc thành `ten` gạch chân, và **mọi bài cũ đang chứa một
đường dẫn hay một mã định danh sẽ đổi hình dạng** ngay khi trình phân tích bắt
đầu chạy qua chúng. Có test giữ chỗ này.

## [ĐỔI HÀNH VI] Một chỗ vẽ dòng chữ, dùng chung

`packages/post-renderer/src/elements/inline.tsx` — `Runs` cho dòng đã lưu dạng
runs, `Inline` cho dòng lưu dạng chuỗi.

Trước: chỉ `list.tsx` biết vẽ `em` và `u`. Đoạn văn, trích dẫn, khối kết luận,
dòng phụ của danh sách vẽ chữ trần — nên một đoạn văn có nhấn hoặc có địa chỉ
thì **vẽ ra không có gì**, và không có gì trên màn hình nói là đã bỏ mất.

Sau: cả năm chỗ đi qua cùng một hàm. Cách lưu không đổi — ký hiệu **chính là**
cách lưu, đúng như memo vẫn thế từ trước.

Ba dấu, ba tín hiệu, cố ý khác nhau: nhấn đổi nghiêng và màu; số đo giữ nguyên
màu, gạch chân xám `#CFCFC4`; link mang màu bài và gạch chân màu bài. Hai cái
sau đều là gạch chân, chỉ an toàn vì màu khác nhau.

Link mở tab mới (`target="_blank"`, `rel="noreferrer noopener"`): bài dẫn ra
nhà rang và bài báo, chúng mở bên cạnh chứ không chiếm chỗ người đọc đang đứng.

## Bảng, cột, endpoint

Không đụng cái nào. Thay đổi nằm trong `body` (jsonb) — `Run` thêm khoá `href`,
đọc được cả bài chưa có nó. Không migration.

## Đối chiếu bộ luật

- **A30** (đề xuất, `SO-BAN-GIAO.md` mục A) nói một dòng chữ là các run, ô chữ
  thường hiện chúng thành `chữ *được nhấn* chữ` và `_số đo_`, đi một vòng không
  mất gì. Lượt này **mở rộng** A30 chứ không mâu thuẫn: thêm `[chữ](địa chỉ)`
  vào cùng danh sách ký hiệu, vẫn round-trip không mất chữ.
- **A28** nói element nào có tên trong từ vựng WordPress thì giữ nguyên tên.
  Không đụng: không thêm element nào, chỉ thêm một khoá vào `Run`.
- Không thấy luật đánh số nào trong `logic.ts` nói về dán hay về link trong
  dòng. Nếu lane Tài liệu thấy có, xin gọi tên `nhóm.số` giúp.

## Kiểm chứng

- `npm test`: 112 file, 1111 test, xanh. Gồm typecheck cả ba tsconfig.
- Test mới: `packages/post-renderer/src/elements/markdown.test.tsx` (19) và
  `frontend/src/admin/screens/Editor.paste.test.tsx` (8).
- **Chưa mở trình duyệt xem.** `/practice` nằm sau cổng đăng nhập và phiên này
  không có công cụ điều khiển trình duyệt. Test xanh không chứng minh giao diện
  đúng — chỗ cần soi mắt: dòng dán vào có xuống dòng thật trong khối không, và
  gạch chân của link có lẫn với gạch chân của số đo không.

## Nợ tôi phát hiện, chưa xử lý

**Worktree `hotfix` không build được thay đổi trong `packages/`.**

`.claude/worktrees/hotfix/node_modules` là symlink trỏ về `beanweirdo/node_modules`
của checkout gốc, nên `post-renderer` phân giải sang `beanweirdo/packages/post-renderer`
— **không phải** bản trong worktree. Worktree `spine` và `design` thì có
`node_modules` thật, bên trong đúng một symlink `post-renderer -> ../packages/post-renderer`.

Hệ quả đo được: `npx tsc -p frontend/tsconfig.json` chạy trong `hotfix` trước
khi sửa báo **4 lỗi** ở `Bitesize`/`postToRenderer` — những lỗi ấy đến từ **thay
đổi chưa commit trên working tree của checkout gốc**, không từ nhánh đang mở.
Sau khi dựng `node_modules` shim giống `spine`, typecheck sạch.

Đây có thể là lời giải cho **D7** trong `SO-BAN-GIAO.md` ("Agent QA báo `main`
đỏ 9 lỗi typecheck; tôi đo 6 commit gần nhất đều xanh. Chưa rõ nó chạy lệnh gì
ở thư mục nào."). Cùng một cơ chế: agent QA chạy trong `hotfix`, và cái nó
typecheck là working tree của người khác. Tôi chưa xác nhận con số 9 khớp — chỉ
nêu cơ chế.

Tôi đã sửa `node_modules` của worktree `hotfix` tại chỗ (không nằm trong git).
Nếu lane Kiến trúc muốn để nguyên như cũ thì nói, tôi trả lại.

## Đề xuất luật

1. Ký hiệu định dạng trong một dòng là markdown, và **một bộ duy nhất** cho cả
   lúc gõ lẫn lúc dán: `*nhấn*`, `_số đo_`, `[chữ](địa chỉ)`. Hai bộ ký hiệu
   nghĩa là hai đường nhập liệu, và đường thứ hai sẽ âm thầm sai.
2. Dấu định dạng chỉ bám ở ranh giới từ. Không có luật này thì mỗi lần mở rộng
   trình phân tích là một lần đổi hình dạng các bài cũ mà không ai đụng tới.
3. Một địa chỉ trần ghi lại thành chính nó. Ký hiệu nào làm dòng dài thêm sau
   mỗi vòng sửa thì không phải round-trip.
4. Cái dán vào được đọc thành cấu trúc, không thành một dòng. Tầng bậc đọc từ
   các mức thụt lề có mặt trong chính nó, và dồn về mức sâu nhất mà design vẽ
   được thay vì dựng tầng không vẽ ra.
5. Mọi chỗ vẽ một dòng chữ đi qua cùng một hàm. Chỗ nào tự vẽ lấy là chỗ một
   định dạng sẽ biến mất mà không báo.
