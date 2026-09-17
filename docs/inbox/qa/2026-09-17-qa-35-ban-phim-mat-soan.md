# QA-35: ba phím mặt soạn đánh rơi khi chuyển sang Lexical

PR: chưa mở    nhánh: `hotfix/trinh-soan-giu-dinh-dang`    commit: điền sau khi merge
Cắt từ: `origin/main` @ 084bbbc
Nối tiếp [QA-34](2026-09-17-qa-34-mat-soan-giu-dinh-dang.md), cùng nhánh.

Khi 084bbbc thay `TextRun` bằng `LiveText`, thân bài chuyển từ `textarea` sang
Lexical. `blockKeys`, `marks`, `editHistory` vẫn còn trong `Editor.tsx` nhưng
nay chỉ với tới mấy ô phụ — `LiveText` không nhận `onKeyDown`. Nên mấy phím đợt
1–6 làm cho thân bài đã rơi ra ngoài mà bảng đối chiếu trong
`docs/spine/TRINH-SOAN.md` vẫn ghi ✅.

Ghi chú này nối lại ba phím. Đo bằng cách bắn lệnh thẳng vào editor, không qua
DOM — xem mục cuối.

## Đã sửa

### [ĐỔI HÀNH VI] `Tab` thụt lề trong danh sách (mục B3, B4)

Trước: `LiveText` không đăng ký `ListPlugin`, nên `- ` gõ ra được danh sách
nhưng `Tab` không đổi tầng — lệnh `INDENT_CONTENT_COMMAND` bắn ra không ai nhận.

Sau: `<ListPlugin />` trong `LiveText.tsx`, và `onTab` trong
`frontend/src/admin/components/liveKeys.ts`.

`Tab` **chỉ** ăn khi con trỏ đứng ở đầu một mục danh sách và không bôi đen gì.
Giữa chữ thì trả phím lại cho trình duyệt. Đây là chỗ dễ làm sai nhất: nuốt
`Tab` ở mọi vị trí là dựng một bẫy focus — vào được ô chữ mà không ra được bằng
bàn phím. Test `giữa chữ thì trả phím lại, để còn Tab ra khỏi ô` giữ chỗ ấy.

### [ĐỔI HÀNH VI] `Cmd+K` để lại vỏ link (mục D3)

Trước: không có. `marks.applyMark` vẫn còn nhưng chỉ chạy trên `textarea`.

Sau: `insertLinkShell` trong `liveKeys.ts` — bọc chữ đang chọn thành `[chữ]()`
và đặt con trỏ vào giữa hai ngoặc đơn.

Giữ nguyên lối cũ của `marks.ts`: phím chèn hộ mấy dấu mà tay vẫn gõ được, nên
không sinh ra đường nhập liệu thứ hai và không có hộp thoại nào. `[chữ]()` chưa
có địa chỉ thì `textToRuns` không đọc thành link — link viết dở trông đúng ra dở.

### [ĐỔI HÀNH VI] `Cmd+\` bỏ định dạng (mục D4)

Trước: không có. Bảng ghi ❌ với ghi chú *"bấm lại chính phím ấy thì bỏ được rồi"*.

Sau: `clearFormats` trong `liveKeys.ts`.

Gỡ trên từng `TextNode` chứ không gọi `selection.formatText`: `formatText`
bật/tắt theo cờ của **vùng chọn**, thứ có thể chưa đọc cờ của chữ nó đang trùm
lên — bôi đen chữ đậm rồi bấm thì hoá ra bôi đậm thêm một lần nữa. Chọn nửa
chừng một khối chữ thì cắt khối ấy ra trước, để phần ngoài vùng chọn giữ nguyên.

## Đụng dữ liệu

Không đụng bảng, cột hay endpoint nào. Không có migration.

Cả ba phím chỉ đổi trạng thái trong mặt soạn; chữ vẫn ra `posts.body` qua đúng
một cửa là `CommitOnBlur`.

## Đụng luật

Nhóm **08 Ghi — sửa và lưu**: không đổi luật nào. `Cmd+Z` / `Cmd+Shift+Z`
(luật 08.6) vẫn do `HistoryPlugin` lo trong phạm vi một khối — **không** mở
rộng ở đợt này, xem mục "Còn nợ".

Không luật nào trong `logic.ts` nói về phím tắt trong mặt soạn.

`docs/spine/TRINH-SOAN.md` mục **B3, B4, D3, D4** cần đổi từ ❌/✅-cũ sang ✅,
nhưng **cả bảng ấy đang cần đo lại** vì lý do nói ở QA-34. Lane Tài liệu và
lane Kiến trúc quyết.

## Còn nợ, chưa xử lý ở đợt này

- **Phím giữa các khối** (A1–A5): `Enter` ở cuối khối, `Backspace` ở đầu khối.
  `LiveText` không biết nó là khối thứ mấy và không có đường gọi ngược ra
  `Editor.tsx`. Cần thêm một lối ra; không phải việc vá trong một file.
- **`/` mở menu chèn** (A10): nay chỉ còn ở nút `+` bên máng.
- **Undo cấu trúc** (F4, F5): `HistoryPlugin` nằm trong từng khối, `editHistory`
  ở mức màn không còn thấy thân bài. Xoá nhầm một khối thì `Cmd+Z` không trả lại.
- **`Cmd+D`** (A8), **dán ảnh** (E4), **chặn rời trang** (G3), **hai tab cùng
  mở** (G4): chưa làm, như cũ.

## Kiểm chứng

- `frontend/src/admin/components/liveKeys.test.ts` — 8 test.
- `npm test` trên nhánh này: **124 file, 1259 test xanh**.
- `npm run build --prefix frontend`: xanh.
- **Chưa mở trình duyệt xem.**

## Chỗ test không chứng minh được

1. **Phím thật có tới được không.** Test dựng `KeyboardEvent` rồi gọi
   `editor.dispatchCommand`, tức bắt đầu từ *sau* chỗ Lexical đọc bàn phím.
   Nếu `KEY_TAB_COMMAND` không bắn ra trong trình duyệt thật thì test vẫn xanh.
2. **`Tab` có thật sự rời được ô không.** Test chỉ chứng minh mình không gọi
   `preventDefault`; việc focus đi đâu là của trình duyệt và của thứ tự DOM.
3. **Con trỏ có nhìn thấy được ở giữa `[chữ](|)` không.** jsdom không vẽ.

## Đề xuất luật

24. Thay lớp nền bên dưới một màn thì phải đo lại **toàn bộ** bảng đối chiếu
    của màn ấy, không chỉ những mục vừa động tới. Mấy mục đang ✅ là thứ không
    ai nghĩ tới việc kiểm lại, nên chúng là chỗ rơi mất mà không ai thấy.
