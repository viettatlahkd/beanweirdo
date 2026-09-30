# Số migration trong SPEC — PR #7

- PR: #7
- Nhánh: `claude/project-thread-7jayxy`
- Cắt từ: `origin/main` tại `d42aa72`

Ghi chú này do luồng thử nghiệm Vercel viết, không phải lane Tài liệu. Việc
chính của luồng là kiểm xem đổi tác giả commit có làm Vercel chịu build hay
không; `docs/SPEC.html` được chọn làm thay đổi thật để thử, theo yêu cầu của
chủ site. File này thuộc lane Tài liệu, nên phần còn lại bên dưới là bàn giao
lại cho lane đó.

## Đã đổi

**[SỬA LỖI] `docs/SPEC.html` — số migration, hai chỗ, đều thành 27.**

Tôi đổi ô thống kê trong `<div class="figures">` của `<header class="mast">` từ
`23` thành `27`, và trong câu mở đầu `<p class="deck">` của mục `#du-lieu` đổi
"hai mươi hai migration" thành "hai mươi bảy migration".

Bằng chứng: `ls -1 backend/supabase/migrations/*.sql | wc -l` trả về **27**.
File cao số nhất là `0025_module_parent.sql`.

Số file (27) nhiều hơn số thứ tự cao nhất (0025) vì hai số bị dùng hai lần:

- `0017_pinned_and_optional_order.sql` và `0017_unclassified_lowercase.sql`
- `0018_hour_log_note.sql` và `0018_module_page_images.sql`

Nên có hai cách đếm cùng đúng: 27 nếu đếm file, 25 nếu đếm số thứ tự riêng
biệt. Tôi chọn 27. **Nếu lane Tài liệu định nghĩa "migration" theo số thứ tự
thì con số phải là 25, không phải 27** — chỗ này cần lane đó chốt, tôi chỉ ghi
lại là có hai cách đọc.

Specs không đổi hành vi: đây là con số mô tả repo, không phải mô tả hệ thống
chạy.

## Không đổi, nhưng đã thấy sai — để lane Tài liệu xử lý

Tôi không sửa những chỗ này vì chúng nằm ngoài phạm vi chủ site yêu cầu, và vì
mỗi PR tốn hai lần build Vercel.

1. **`399 test tự động`** trong cùng `<div class="figures">`. `npm test` ở nhánh
   này trả về **125 file test, 1278 test** (2 test skip). Chạy lúc 17:07 UTC
   ngày 2026-09-18 trên `d42aa72` + bản sửa này.
2. **`119 quy tắc hệ thống`** trong cùng ô đó.
   `grep -c "{ s:" frontend/src/content/logic.ts` trả về **123**. Cách đếm này
   là đếm số object có khoá `s:`, có thể không khớp định nghĩa "quy tắc" của
   lane Tài liệu — cần lane đó kiểm lại bằng cách đếm của chính mình.
3. **`11 API endpoint`** và **`17 màn hình`**: tôi không kiểm được. `backend/api`
   có 6 file `.ts` không phải test cộng hai thư mục (`modules`, `posts`), và
   `frontend/src/screens` có 9 file `.tsx` không phải test. Cả hai con số trong
   SPEC nhìn như đếm theo route chứ không theo file, nên tôi không kết luận gì.
4. **`Bảy bảng`** ở `<p class="deck">` của `#du-lieu`: không kiểm được, vì mọi
   truy vấn tới database thật trong phiên này đều bị cổng quyền của Claude Code
   chặn (xem mục dưới).

## Bảng, cột, endpoint đã đụng

Không có. Bản sửa này chỉ đụng `docs/SPEC.html`, không đọc và không ghi
database, không gọi endpoint nào.

## Đối chiếu bộ luật trong `logic.ts`

Không có luật nào trong `logic.ts` nói về số liệu trong tài liệu, nên bản sửa
này không mâu thuẫn với luật nào. Hai chỗ có chữ "số liệu" là
`Toàn hệ thống / dùng chữ số cùng bề rộng (tabular-nums)` và
`Template / với [[report]]`, cả hai nói về trình bày trên màn hình, không nói
về tài liệu.

## Việc bị chặn, không phải việc bỏ dở

`node scripts/db-exec.mjs backend/supabase/migrations/0025_module_parent.sql`
**không chạy được trong phiên này.** Cổng quyền auto mode của Claude Code trả
về `Production Deploy` và từ chối. Một câu truy vấn chỉ đọc
(`information_schema.columns` trên bảng `modules`) cũng bị từ chối, với lý do
`Production Reads`.

Biến `SUPABASE_DB_URL` **có** trong môi trường của phiên này, và
`scripts/db-exec.mjs` đọc đúng tên biến đó. Nghĩa là chặn không phải vì thiếu
credential — chặn là ở tầng quyền của công cụ, và chỉ chủ site mở được.

Vì vậy **không rõ cột `modules.parent_id` đã có trên database thật hay chưa.**
Tôi không đoán.

## Đề xuất luật

1. Những con số trong `<div class="figures">` của SPEC nên có một lệnh đếm kèm
   theo, ghi ngay trong file, để lần sau ai kiểm cũng ra cùng một số. Hiện tại
   "migration", "quy tắc", "API endpoint", "màn hình" đều có nhiều cách đếm ra
   nhiều số khác nhau, và không chỗ nào nói cách nào mới là cách đúng.
2. Hai số thứ tự migration bị trùng (0017, 0018) làm mọi phép đếm thành hai
   phép đếm. Không sửa được nữa vì các file đã chạy rồi, nhưng nên ghi vào
   phần nguyên tắc migration của SPEC rằng số thứ tự không phải là số đếm.
