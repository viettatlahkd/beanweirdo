# Danh sách bài ở tab Nội dung: kiểu Medium "Your stories"

PR: (số PR ghi ở mô tả PR) · nhánh `claude/project-thread-n3le4b`

Chủ site chê bảng cũ khó đọc, thiếu cột tác giả, badge nào cũng xám như nhau,
phải bấm đúng chữ mới mở bài. Tôi gửi hai lượt mock; chủ site chọn kiểu Medium
và xin thêm 1–2 dòng đầu bài, quá thì "…".

## Thay đổi

1. **[ĐỔI HÀNH VI]** Bảng nhiều cột trong `ContentWorkspace` thành danh sách:
   mỗi bài là tên đậm, 1–2 dòng đầu bài, rồi một dòng "tác giả · chủ đề · ngày ·
   N phút đọc · template #tag", ảnh bìa nhỏ bên phải (`story` trong
   `ContentWorkspace.tsx`). Trước: bảng với viên badge xám cho chủ đề, template,
   tag, trạng thái và nút Sửa. Sau: không còn badge; chủ đề có chấm màu của cây,
   tác giả có ảnh xếp chồng (`Avatar` nay export từ `components/Byline.tsx`).
2. **[ĐỔI HÀNH VI]** Bấm bất cứ đâu trên bài là mở bài. Ô tick, menu ⋮ và các
   chữ lọc trong dòng phụ (tác giả, chủ đề, template, tag) chặn sự kiện để không
   mở bài; bấm chúng thì thêm bộ lọc như viên cũ. Nút Sửa bị bỏ.
3. **[ĐỔI HÀNH VI]** Trạng thái thành tab trên danh sách: Tất cả · Nháp · Đã đăng
   · Lưu trữ · Thùng rác, mỗi tab có số bài theo bộ lọc đang bật (`TABS`,
   `tabCount`). Tab chính là bộ lọc `status` của thanh tìm (`pickTab`), nên hai
   bên luôn khớp. Mục "Trạng thái" ở cột trái bị bỏ. Bài không phải "Đã đăng"
   ghi chữ màu ở dòng phụ (`STATUS_NOTE`; "Có sửa chưa đăng" màu cam).
4. **[ĐỔI HÀNH VI]** `GET /api/posts` trả thêm `excerpt` (tối đa 180 ký tự, cắt
   ở ranh giới từ, thêm "…") và `read_minutes` (`bodyPreview` trong
   `backend/lib/posts.ts`). Hàm này đọc thêm cột `posts.body` ở máy chủ nhưng
   không gửi `body` ra trình duyệt. Bỏ qua tiêu đề, chú thích ảnh, tên người
   trích dẫn khi lấy đoạn xem trước. Test cũ "không hỏi body" đổi thành "không
   gửi body" (`backend/api/posts/index.test.ts`).
5. **[SỬA LỖI]** `readMinutes` (`frontend/src/lib/postText.ts`) đếm cả chữ kiểu
   chữ của long-form (`"s": "normal"`) và các khoá như `len`, `media`, `hue`, `n`
   như là chữ của bài, nên số phút đọc ở byline công khai hơi cao. Thêm các khoá
   đó vào `NOT_PROSE`, dùng cùng danh sách với `bodyPreview` để admin và byline
   ra cùng một số.

Đã xoá: `StatusBadge.tsx` và test của nó, `IconEdit` (không còn ai dùng).

## Bảng, cột, endpoint đã đụng

- `GET /api/posts`: đọc thêm `posts.body`; trả thêm `excerpt`, `read_minutes`.
- Không ghi gì vào database, không cần SQL.

## Đề xuất

- Nếu danh sách bài lên vài trăm, đọc `body` mỗi lần mở danh sách sẽ chậm; khi
  đó nên lưu `excerpt` thành cột tính lúc ghi, như `thumbnail_url`.
