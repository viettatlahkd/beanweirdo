# Trình soạn: chèn/thả theo dòng chữ, thoát khối bằng bàn phím, menu [+]

PR: #49    nhánh: claude/project-thread-mok7tv
Nguồn: chủ site báo 2026-09-24 (bullet hai dấu khi Tab, [+] bị cắt, chèn/thả vào khối thay vì dòng, Enter không thoát khối).

## Đã sửa

- [SỬA LỖI] Tab trong danh sách ra hai dấu chấm. Mục `<li>` bọc danh sách con của Lexical (`awc-live-li-nested`) tự vẽ dấu. Bằng chứng: `admin.css`, luật `.awc-live-li-nested`.
- [SỬA LỖI] Menu [+] bị cắt ở mép dưới vì khung sửa mang `overflow: hidden` (`EditorCanvas`). Menu nay vẽ qua portal, `position: fixed`, tự lật lên khi thiếu chỗ. Bằng chứng: `Editor.tsx:BlockMenu`.
- [SỬA LỖI] Kéo thả khối vào dải chữ cộng `run.at[0] + dòng Lexical` — lệch chỗ ở article/long-form. Nay đi qua `flow.ts:moveIntoRun` và cắt theo dòng. Bằng chứng: `flow.test.ts` mục `moveIntoRun`.
- [ĐỔI HÀNH VI] Chèn bằng [+] cắt dải theo **dòng có chữ**, không theo khối Lexical. Trước: `insertThing/insertSectionThing/insertLongformThing(…, blockIndex)`. Sau: `(…, lines)`, xem `mdBlocks.ts:linesThrough`, `splitAtLine`. `splitAfterBlock` đã xoá.
- [ĐỔI HÀNH VI] Long-form: `longformFlow.ts:runToMarkdown` nối các khối bằng dòng trống (trừ li–li, quote–quote). Trước: mọi đoạn liền nhau là một đoạn có ngắt dòng trên mặt soạn. Cách lưu không đổi.
- [ĐỔI HÀNH VI] Gõ `/` ở đầu một dòng trống trong dải chữ mở menu chèn; lọc bỏ dấu và dấu cách. Bằng chứng: `Editor.tsx:LiveRun`, `entriesFor`.
- [ĐỔI HÀNH VI] Luật bàn phím trong khối giữa các dải chữ (`flowFocus.ts:thingKeyDown`): Enter ở ô một dòng sang ô kế tiếp, ô trống/ô cuối thì thoát; Enter trên dòng trống cuối ô nhiều dòng hoặc Cmd/Ctrl+Enter thoát ra một dòng mới; mũi tên ở mép đi sang ô kế bên; Backspace trong khối trống trơn bỏ khối. Ở report và element, `blockKey` nay chỉ còn nhận phím cách cho khối đứng riêng.
- [ĐỔI HÀNH VI] Trong dải chữ (`liveKeys.ts`): mũi tên ở dòng đầu/cuối sang khối kề; Backspace trên dòng trống đầu dải quay về khối phía trên thay vì xoá nó; Enter trên dòng trống cuối hộp ghi chú long-form thoát hộp.
- [ĐỔI HÀNH VI] Khung ghi chú (`AsideFields`): mỗi dòng là một đoạn. Trước: phải cách một dòng trống.
- [ĐỔI HÀNH VI] Dời khối bằng mũi tên trên tay nắm: focus đi theo khối vừa dời (`RowShell.tsx:followGrip`).

## Bảng, cột, endpoint

Không đụng. Chỉ đổi cách bày và cách ghi `body` qua các hàm sẵn có.

## Đề xuất luật

- Mọi khối mới trong thân bài phải mang `data-flow="thing"` + `data-flow-at` (qua `RowShell onAddLine` hoặc tương đương), không thì bàn phím không đi qua được.
