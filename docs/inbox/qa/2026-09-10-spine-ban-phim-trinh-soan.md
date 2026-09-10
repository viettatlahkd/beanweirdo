# Bàn phím cho trình soạn: sáu đợt

PR: chưa mở    nhánh: docs/spec-trinh-soan    commit: điền sau khi merge
Cắt từ: origin/main @ 30a80aa
Nguồn: chủ site — *"tôi thêm bullet con thì tôi thêm được mà tôi không xoá
bằng keyboard là sao? docs ấy thì centric của nó là người dùng tương tác qua
bàn phím"*, kèm yêu cầu viết spec nghiệp vụ và bảng đối chiếu.

Nối tiếp #98, #99, #100.

## [TÀI LIỆU] `docs/spine/TRINH-SOAN.md`

Viết một trình soạn **phải** làm được gì, từ đầu, không mô tả lại bản đang có;
rồi mới đối chiếu 50 mục. Có ba mức tham vọng (markdown editor · block editor
· document editor) và chỗ dự án này đứng.

Chẩn đoán ở Phần 0: **bản hiện tại là một cái biểu mẫu, không phải một trình
soạn.** Cấu trúc do nút bấm quyết định thay vì do chữ đang gõ quyết định. Mọi
triệu chứng chủ site gặp rơi ra từ chỗ ấy.

Đo lúc viết: 7 mục có · 11 một nửa · 32 không. Sau sáu đợt: **33 · 9 · 8**.

## [ĐỔI HÀNH VI] Đợt 1 — bàn phím cho danh sách

`admin/lib/listKeys.ts`. Enter mở mục mới hoặc tách mục; mục rỗng lùi ra một
tầng, ngoài cùng thì rời hẳn danh sách và mở một đoạn văn (`onLeaveList`).
Backspace ở đầu mục nhập nó lên trên. Tab / Shift+Tab đổi tầng. Shift+Enter
mở dòng chìm.

Mục lồng thì Backspace **lùi ra một tầng trước**, dù có chữ hay không: mất một
tầng nhẹ hơn mất cả mục, và nhập thẳng con vào cha là câu hỏi không có câu trả
lời gọn — cha đang giữ chính nó trong danh sách con của mình.

## [ĐỔI HÀNH VI] Đợt 3 — hoàn tác nhiều bậc

`admin/lib/editHistory.ts`. Làm **trước** đợt 2 có chủ ý: mỗi thao tác cấu
trúc thêm vào là một thứ nữa lịch sử phải biết hoàn tác.

Ghi phần đảo ngược chứ không ghi ảnh chụp cả bài. Mọi thay đổi nội dung đã đi
qua đúng một cửa (`applyPatch`) nên lịch sử chỉ ngồi ở cửa ấy. Thay đổi hệ tự
làm — đo clip rồi đổi dàn trang — đi đường khác và không vào lịch sử.

Cmd+Z bắt ở mức cả màn, vì xoá nhầm một khối thì không còn ô nào để lùi trong
đó. Nhưng ô đang có chữ chưa ghi thì trả phím lại cho trình duyệt (`data-dirty`).

## [ĐỔI HÀNH VI] Đợt 2 — Enter và Backspace giữa các khối

`admin/lib/blockKeys.ts`. Enter ở cuối mở đoạn văn, ở giữa thì tách và hai nửa
giữ nguyên loại. Backspace ở đầu nhập lên; khối có cấp bậc thì **hạ cấp trước**.
Khối trên không có ô chữ thì không nhập vào đâu cả — nuốt mất đoạn ấy là kiểu
mất chữ tệ nhất.

## [ĐỔI HÀNH VI] Đợt 4 — `Cmd+B` · `Cmd+U` · `Cmd+K`

`admin/lib/marks.ts`. Vẫn là markdown: phím chỉ chèn hộ mấy dấu mà tay vẫn gõ
được, nên không sinh ra đường nhập liệu thứ hai. Bấm lại là bỏ, hiểu cả hai
kiểu bôi đen. Cmd+K để lại `[chữ]()` — vỏ chưa có địa chỉ thì `textToRuns`
không đọc thành link, nên link viết dở trông đúng ra dở.

## [ĐỔI HÀNH VI] Đợt 5 — gõ ký hiệu đổi loại, và `/` mở menu

`spaceBlock` + `InsertMenu`. `# `, `- `, `1. `, `> ` ở **đầu** khối đổi loại
ngay, giữ nguyên id. `/` mở menu lọc theo tên và từ khoá, đọc thẳng từ kho;
chọn thì **thay** khối đang gõ. Nút "+ thêm khối" và đường `/` dùng chung một
`InsertMenu`, không sinh bản thứ hai để trôi ra khỏi kho.

## [ĐỔI HÀNH VI] Đợt 6 — con trỏ đi xuyên khối

`neighbour`. Mũi tên chạm mép thì sang khối có ô chữ gần nhất; bảng và ảnh bị
bỏ qua. Giữa chữ thì mũi tên vẫn của trình duyệt.

## [SỬA LỖI] Ngắt dòng trong đoạn văn bị nuốt

`Enter` từng chèn một ký tự xuống dòng mà `text.tsx` không đặt `whiteSpace`,
nên trang nuốt mất: chữ có ngắt dòng lúc soạn và mất khi đăng. Nay đoạn văn
giữ `pre-wrap` cho bài cũ và chữ dán vào.

## Ba lỗi do test bắt được, không phải suy ra

1. **Tab bị nuốt ở mọi vị trí con trỏ**, nên không Tab ra khỏi ô được — đúng
   cái bẫy focus mà spec vừa viết cấm ở N4. Nay Tab chỉ thụt lề ở đầu dòng.
2. **Nhập mục con vào cha thì cha giữ lại bản sao của nó** trong danh sách con,
   vì mục trên được đọc trước khi mục dưới bị bỏ đi.
3. **`rawIndexFor` đo bằng bản dựng lại từ runs** nên sai với chữ viết bằng
   `**`: cùng một chữ nhấn viết được bằng `*x*` hoặc `**x**`, mà bản dựng lại
   luôn ra `*x*`.

Ngoài ra, `EditorCanvas` nhận `post` từ ngoài nên một `vi.fn()` trơ giữ nguyên
bài sau mỗi phím — mọi bài kiểm hai phím liên tiếp trước đó đo phím sau trên
trạng thái trước phím trước. Bài kiểm nay tự nuôi lại bài.

## Bảng, cột, endpoint

Không đụng cái nào. Không migration. Cách lưu không đổi.

## Đối chiếu bộ luật

`node tools/spec-numbers.mjs --check`: 3 phần · 18 nhóm · 119 luật.

Sáu đợt này **thực thi** một luật đã có trong nhóm 16 (màn soạn vẽ đúng thứ
trang sẽ vẽ) và không mâu thuẫn luật nào. Năm nguyên tắc ở Phần 1 của
`TRINH-SOAN.md` là **đề xuất**, chưa vào `logic.ts` — lane Tài liệu quyết.

## Kiểm chứng

- `npm test`: **121 file, 1275 test xanh**, gồm typecheck cả ba tsconfig.
- `npm run build --prefix frontend`: xanh.
- Test mới: `listKeys.test.ts` (21), `editHistory.test.ts` (17),
  `blockKeys.test.ts` (27), `marks.test.ts` (14), `Editor.listkeys.test.tsx`
  (10), `Editor.undo.test.tsx` (5), `Editor.blockkeys.test.tsx` (16).
- **Chưa mở trình duyệt xem.**

## Chỗ test không chứng minh được

1. **Ô có giật khi lật giữa mặt vẽ và mặt gõ không.** Hai mặt phải cao bằng
   nhau; jsdom không dựng bố cục nên không đo được.
2. **Con trỏ rơi đúng chỗ bấm chuột.** jsdom không có `caretPositionFromPoint`.
3. **Cảm giác của mấy phím.** Enter/Backspace đúng dữ liệu không có nghĩa là
   gõ liền tay.

## Hai mục cố ý chưa làm

**C5 — chọn qua nhiều khối.** Không phải tính năng thiếu mà là kiến trúc khác:
trình duyệt không cho một vùng chọn trải qua hai ô nhập, nên làm nó nghĩa là
bỏ hết các `textarea` và dựng cả thân bài thành **một** mặt `contenteditable`,
rồi tự viết ánh xạ giữa cây khối và vị trí DOM. Việc nhiều ngày, và phá đúng
thứ đang chạy tốt. **Cần chủ site quyết trước khi bắt đầu.** C6, C7 nằm sau nó.

**C2 — nhớ cột khi lên xuống.** Cần đo hình chữ nhật con trỏ trong `textarea`,
thứ trình duyệt không cho; phải dựng một khối vô hình chép lại kiểu chữ.

## Nợ khác, chưa xử lý

- **CI `main` đỏ sẵn** — `SPEC.html` ghi 23 migration, thật là 26. Lane Tài liệu.
- `InlineField` (Tiêu đề, Thân bài của bitesize) chưa đọc bản HTML khi dán.
- cards, article, longform chưa nối bàn phím — khuôn soạn riêng.
- A8 `Cmd+D`, E4 dán ảnh, G3 chặn rời trang, D6 sửa link tại chỗ.

## Đề xuất luật

17. Bàn phím là đường chính, chuột là đường phụ. Nút bấm tồn tại để **chỉ ra**
    rằng một thao tác có tồn tại, không phải để làm cách duy nhất thực hiện nó.
18. Thêm được bằng phím thì xoá được bằng phím. Thêm bằng phím mà xoá bằng
    chuột là cái bẫy: người viết học được nửa đường rồi đứng lại.
19. Không đặt nghĩa mới cho Enter, Backspace, Tab, mũi tên, Cmd+Z. Người viết
    mang sẵn thói quen tới; bắt họ học lại thì họ sẽ không học.
20. Không có trạng thái không thoát được bằng bàn phím. Vào một danh sách phải
    ra được; nuốt `Tab` ở mọi chỗ là dựng một cái bẫy focus.
21. Undo phục hồi **cấu trúc**, không chỉ chữ. Và đường về phải có trước khi
    thêm thao tác cấu trúc mới, không phải sau.
