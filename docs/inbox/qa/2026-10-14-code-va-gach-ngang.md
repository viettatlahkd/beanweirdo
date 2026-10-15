# `code` và gạch ngang trong thân bài

PR: (số PR ở mô tả) · nhánh `claude/restore-editor-nuxwou`

## Thay đổi

1. **[ĐỔI HÀNH VI]** `` `x` `` và `~~x~~` nay là chữ máy và gạch ngang, cả ở mặt soạn lẫn
   trang đọc. Trước: cả hai nằm nguyên là chữ thường (`SITE_TRANSFORMERS` cố ý bỏ, vì
   renderer không vẽ được). Sau:
   - Mặt soạn: thêm `INLINE_CODE`, `STRIKETHROUGH` vào `SITE_TRANSFORMERS`
     (`frontend/src/admin/lib/liveMarkdown.ts`), lớp `awc-live-code`, `awc-live-del`
     trong `THEME` của `LiveText.tsx` và `admin.css`.
   - Dữ liệu: `Run` (`elements/runs.ts`) và `LongformRun` (`types.ts`) có thêm hai cờ
     `code`, `del`. Bài cũ không có cờ nào, nên không đổi gì.
   - Đọc/viết: `elements/codeStrike.ts` (`protect`, `restore`, `markText`) dùng chung
     cho `runs.ts:textToRuns/runsToText` và `longformText.ts:textToRuns/runsToText`.
     Chữ trong backtick không bị đọc dấu sao.
   - Vẽ: `inline.tsx:mark` và `Longform.tsx:runStyle` dùng `markStyle`.
2. Kiểm: `liveMarkdown.test.ts` — một dòng đi qua Lexical thật rồi qua `textToRuns`.
   Trong Chromium (harness, report và longform): gõ `` `mã` `` và `~~bỏ~~` thì mặt soạn
   vẽ ngay, và thân bài lưu ra đúng cờ.

## Ghi chú cho lane kiến trúc

PR này sửa `packages/post-renderer` (runs.ts, longformText.ts, types.ts, inline.tsx,
Longform.tsx) theo yêu cầu trực tiếp của chủ site. `NoteBody` trong `Longform.tsx` đặt
`background` riêng nên chữ máy trong ghi chú long-form không có nền xám.

Không đụng bảng, cột hay endpoint nào.
