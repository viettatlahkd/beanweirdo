# Nút Publish im lặng và khung ghi chú rỗng trên trang

PR: #(điền khi mở) · nhánh `claude/project-thread-1onmw2`

## Đã đổi

1. **[SỬA LỖI] Nút Publish trong màn sửa không báo gì.**
   `frontend/src/admin/screens/Editor.tsx` → `EditorContent`, nút cuối màn.
   Tái hiện: mở một bài đã đăng, bấm Publish. `transitionStatus(postId, 'publish')`
   bị máy chủ từ chối (`backend/lib/posts.ts` → `computeStatusTransition`,
   `published` không nằm trong danh sách được phép), lỗi rơi vào promise không
   ai bắt, màn hình đứng yên.
   Nay: bài đã đăng thì nút ghi "Đã đăng" và bấm vào hiện toast nói thay đổi
   đã tự lưu; bài chưa đăng thì đăng xong hiện toast "Đã đăng bài", lỗi thì
   hiện toast lỗi qua `toast.fromError`.
   Nhãn nút đổi theo trạng thái nên cũng là một **[ĐỔI HÀNH VI]** nhỏ ở giao diện.

2. **[ĐỔI HÀNH VI] Khung ghi chú không có chữ thì không vẽ trên trang.**
   `packages/post-renderer/src/elements/longform.tsx` → `aside.View`, hàm mới
   `isEmptyAside`. Trước: ba khung chèn từ menu `+` mà chưa gõ gì hiện ra ba ô
   nền cát trống ở cuối bài AI Twin. Sau: khung mà mọi khối con là đoạn rỗng
   thì `View` trả `null`. Màn sửa Article và Long form vẽ khung qua
   `ReportBlockFields` → `AsideFields` chứ không qua `View`, nên vẫn thấy ô gõ.

## Bảng, cột, endpoint đã đụng

- `POST /api/posts/:id/status` (qua `transitionStatus`), chỉ đổi cách màn sửa
  xử lý câu trả lời. Không đổi máy chủ, không migration.
