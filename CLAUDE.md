# beanweirdo — luật chung cho mọi agent

Ba agent làm việc song song trên repo này. File này chỉ ghi những gì **cả ba**
cần biết. Kiến trúc, specs và nợ tài liệu nằm ở chỗ khác, có liên kết bên dưới.

## Chạy

```bash
npm test        # typecheck cả ba tsconfig, rồi vitest — chạy từ gốc repo
```

Dev server: `.claude/launch.json`, dùng `backend/scripts/dev-server.mjs` cho API
và vite cho web. Đừng chạy dev server bằng Bash.

`frontend/.env.local` và `backend/.env.local` chỉ có ở worktree gốc, không có ở
worktree mới — symlink sang, đừng kết luận là thiếu credentials. Cả hai trỏ tới
Supabase **hosted**: chạy ở máy vẫn đọc ghi nhật ký thật của chủ site.

## Ba lane, và ranh giới

| Lane | Worktree | Sở hữu |
|---|---|---|
| Kiến trúc | `.claude/worktrees/spine` | ghép FE/BE/DB, `packages/post-renderer`, migration, `docs/spine/` |
| Tài liệu | — | `docs/SPEC.html`, `frontend/src/content/logic.ts` (bộ luật đánh số), `docs/inbox/docs/` |
| QA hot-fix | `.claude/worktrees/hotfix` | sửa lỗi QA/QC báo, `docs/inbox/qa/` |

**Không sửa file của lane khác.** Nếu thay đổi của bạn làm file đó sai, ghi vào
ghi chú bàn giao của lane mình; người khác sẽ sửa.

## Nhánh và merge

- Một lỗi hoặc một việc → một nhánh, cắt từ `origin/main`, không stack lên nhau.
- **Không tự merge khi chưa hỏi chủ site.** Mở PR, báo, đợi xác nhận.
- `gh` có sẵn ở `/opt/homebrew/bin/gh`, đã đăng nhập — `PATH` của shell agent
  không chứa thư mục đó nên `which gh` trả về rỗng. Gọi bằng đường dẫn đầy đủ.
- Merge bằng `--rebase` để lịch sử thẳng, một commit một việc.
- Sau khi merge: chạy lại toàn bộ test trên `main`, và nhắc các worktree khác
  `git pull` — chúng không tự biết.

## Ghi chú bàn giao

Mỗi PR kèm một ghi chú trong `docs/inbox/<lane>/<ngày>-<tên>.md`. Một PR một
file, không sửa file đã nộp.

Mỗi mục phải gắn **[SỬA LỖI]** (specs không đổi) hoặc **[ĐỔI HÀNH VI]** (specs
phải đổi theo, kèm trước/sau). Gọi sai nhãn thì specs âm thầm sai — đó là lỗi
nặng nhất ở đây.

**Neo bằng tên hàm hoặc hằng, không bằng số dòng.** Số dòng tính theo nhánh của
bạn và trượt ngay sau vài PR; `handleRenameKind` thì không.

Nêu mọi bảng, cột và endpoint đã đụng, kể cả chỉ đọc thêm một cột.

## Database

Service key trong `backend/.env.local` gọi thẳng REST API được — **đừng cài
Supabase CLI** cho việc mà một lệnh `curl` làm xong:

```bash
curl -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
     "$SUPABASE_URL/rest/v1/hour_logs?select=name&kind=eq.kh%C3%A1c"
```

`PATCH` kèm filter là một câu `update`. Giá trị tiếng Việt cần percent-encode.

Chỗ REST không làm được: **DDL**. Thêm hoặc xoá cột thì cần SQL Editor trên
dashboard (không phải cài gì) hoặc CLI. Migration dữ liệu thì luôn dùng REST.

## Trước khi nói "xong"

Test xanh không chứng minh giao diện đúng — nó chứng minh cái bạn nghĩ để kiểm
thì đúng. Nếu thay đổi nhìn thấy được trên màn hình, **mở trình duyệt xem đã**.

`/practice` nằm sau cổng đăng nhập. **Không tự gõ mật khẩu** — nhờ chủ site
đăng nhập một lần rồi thao tác tiếp trên phiên đó.

Thao tác trên dữ liệu thật thì thống nhất phạm vi trước, tự dọn sau, và báo lại
chính xác đã tạo gì, xoá gì.

## Viết

Giao diện và tài liệu viết tiếng Việt. Chú thích trong code viết tiếng Anh, và
giải thích **vì sao** chứ không mô tả lại code.

## Đọc thêm

- `docs/spine/SO-BAN-GIAO.md` — nợ tài liệu, ai chịu trách nhiệm, đã xong chưa
- `docs/SPEC.html` — hệ thống hiện có gì
- `frontend/src/content/logic.ts` — bộ luật đánh số, trích dẫn theo `nhóm.số`
- `docs/inbox/qa/`, `docs/inbox/docs/` — bàn giao giữa các lane
