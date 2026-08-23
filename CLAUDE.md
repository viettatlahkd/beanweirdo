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
- **Nhưng gộp việc nhỏ lại.** Mỗi PR kích hoạt **hai** lần build Vercel
  (frontend + backend), và gói đang dùng có trần build mỗi ngày. Ngày
  2026-08-22 ba agent đẩy 30 lần và chạm trần: từ đó mọi PR đều báo FAILURE với
  lý do `build-rate-limit`, **kể cả `main`** — nghĩa là những gì đã merge không
  lên được production, dù trang vẫn chạy bằng bản build cũ.

  Nên "một việc một nhánh" nói về **phạm vi**, không phải kích cỡ. Ba sửa nhỏ
  cùng một vùng thì đi chung một PR. Tách PR khi chúng cần merge **riêng thứ
  tự**, hoặc khi một cái rủi ro hơn hẳn cái kia — không tách vì cho gọn.

  Dấu hiệu chạm trần: check Vercel đỏ mà `npm test` ở máy xanh, và đường dẫn
  lỗi có `upgradeToPro=build-rate-limit`. Đó **không phải lỗi code** — đừng đi
  tìm bug. Chờ hạn mức reset, hoặc báo chủ site.
- **Tự chạy mọi lệnh terminal.** Không hỏi, không đưa lệnh cho chủ site chạy
  hộ — `cd`, `git`, `gh`, `curl`, `npm`, cài gói, dựng server, truy vấn API.
  Đưa một khối lệnh kèm câu "m chạy giúp" là đang đẩy việc của mình sang người
  khác.
- **Đúng ba việc phải hỏi trước:** đẩy PR · merge PR · ghi vào dữ liệu thật của
  chủ site. Ngoài ba việc đó thì cứ làm.
- **Không tự merge khi chưa hỏi.** Mở PR, báo, đợi xác nhận. Một câu "merge đi"
  giữa chừng không phải là xác nhận cho lần sau — hỏi lại từng lần.
- `gh` có sẵn ở `/opt/homebrew/bin/gh`, đã đăng nhập — `PATH` của shell agent
  không chứa thư mục đó nên `which gh` trả về rỗng. Gọi bằng đường dẫn đầy đủ.
- Merge bằng `--rebase` để lịch sử thẳng, một commit một việc.
- Sau khi merge: chạy lại toàn bộ test trên `main`, và nhắc các worktree khác
  `git pull` — chúng không tự biết.

## Ghi chú bàn giao

Mỗi PR kèm một ghi chú trong `docs/inbox/<lane>/<ngày>-<tên>.md`.

1. **Neo vào PR cụ thể** — số PR và tên nhánh ở đầu file.
2. **Xuất theo PR, không theo thời gian.** Đừng gom một tuần vào một file.
3. **Gắn nhãn [SỬA LỖI] hay [ĐỔI HÀNH VI]** cho từng mục. Sửa lỗi thì specs
   không đổi; đổi hành vi thì specs phải đổi theo, ghi rõ trước/sau. Gọi sai
   nhãn thì specs âm thầm sai — lỗi nặng nhất ở đây.
4. **Tách sự thật khỏi ý kiến.** Viết "tôi đổi X thành Y", không viết "hệ thống
   phải luôn Y". Đề xuất luật để riêng ở mục cuối.
5. **Mọi khẳng định phải chỉ được bằng chứng** — `file:tên hàm`, hoặc các bước
   tái hiện. Câu không chỉ được vào đâu sẽ bị bỏ qua.
6. **Đối chiếu ngược với bộ luật** trong `logic.ts`. Gọi đúng `nhóm.số`. Nếu bản
   sửa **mâu thuẫn** với một luật, nói thẳng.
7. **Nêu mọi bảng, cột và endpoint đã đụng**, kể cả chỉ đọc thêm một cột.
8. **Không viết bằng giọng tài liệu, không tự sửa specs.** Đây là báo cáo bàn
   giao, không phải bản nháp tài liệu.

Một PR một file, **không sửa file đã nộp** — có gì mới thì file mới.

**Neo bằng tên hàm hoặc hằng, không bằng số dòng.** Số dòng tính theo nhánh của
bạn và trượt ngay sau vài PR; `handleRenameKind` thì không.

**Bản tóm tắt gộp nhiều ghi chú là chỗ dễ sai nhất.** Từng ghi chú thì đúng,
bản gộp lại chép từ ghi chú cũ mà quên ghi chú sau đã đổi. Trước khi gửi, đọc
lại ghi chú **cuối cùng** chạm tới mỗi sự kiện.

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

## Nhịp làm việc

Ba lỗi tốn thời gian nhất ở repo này, và luật để không lặp lại.

**1. Gom rồi hẵng kiểm.** Sửa một dòng cũng chạy cả bộ test là lãng phí.

| Đang làm gì | Chạy gì |
|---|---|
| Sửa trong một file, chưa xong | không chạy gì |
| Xong một việc trọn vẹn | `npx vitest run <đúng file test đó>` |
| Xong cả nhóm việc, sắp commit | `npm test` một lần |
| Sắp mở PR | `npm test` + `vite build` |

Một luồng lớn thì kiểm nhiều; một chỉnh sửa bé thì kiểm bé. Đừng đảo ngược.

**2. Kiểm cái rẻ nhất trước khi chọn đường đắt.** Trước khi đề nghị cài bất cứ
thứ gì, hỏi ba câu: credential đã có trong `.env.local` chưa · công cụ đã nằm
sẵn ngoài `PATH` chưa (`/opt/homebrew/bin` — `which` không thấy không có nghĩa
là chưa cài) · có REST/MCP làm được không.

Đã xảy ra: đề nghị chủ site cài Supabase CLI, link project và nhập mật khẩu
database — cho một việc mà service key sẵn trong repo làm xong bằng một lệnh
`curl`. Cài đặt là phương án cuối, không phải phương án đầu.

**3. Chọn thẳng, đừng bày ra để chọn.** Có hai đường mà một đường rõ ràng rẻ
hơn thì đi luôn và nói một câu vì sao. Chỉ hỏi khi chọn sai thì phải làm lại từ
đầu, hoặc khi nó đụng dữ liệu thật.

**4. Việc nào xong việc đấy.** Đừng mở ba mặt trận rồi để cả ba dở dang. Cần
chạy song song thì spawn subagent, đừng kéo dài một việc.

**5. Mỗi lần báo cáo kèm ETA** cho việc đang làm và việc sắp tới.

**Báo cáo:** phần *cần chủ site quyết* lên đầu, tối đa ba gạch đầu dòng. Chi
tiết để dưới. Không nhắc lại thứ đã nói ở lượt trước.

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
