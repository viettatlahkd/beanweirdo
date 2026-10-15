# PR #69 · nhánh `claude/project-thread-rpmkb1` — kéo thả cây chủ đề hiện chỗ mới ngay khi thả

Chủ site (2026-10-08 10:01): kéo thả trong cây lâu quá, mất một lúc mới lưu, tưởng là lỗi.

## [SỬA LỖI] Cây đổi ngay khi thả, lưu chạy ngầm

Trước: `ConfigTree.tsx: dropTopic` gọi `updateTopic` (nếu đổi cha) rồi `reorderTopics`, rồi `run` đọc lại layout, từ vựng và trang; cây chỉ vẽ lại sau khi cả chuỗi xong. Mỗi lời gọi đi qua preflight CORS, Vercel (Mỹ) và Supabase (Tokyo), nên hàng đứng yên vài giây sau khi thả.
Sau: `placeLocally` đặt `parent_id` và `sort_order` của các topic vào state ngay khi thả, rồi mới lưu. Dòng "Đã chuyển … · đang lưu…" hiện tới khi lưu xong; nút "Hoàn tác" tắt trong lúc đang lưu để không chạy đè lên lần lưu chưa xong. Hoàn tác cũng đổi cây ngay rồi mới lưu. Lưu lỗi thì dòng lỗi hiện như cũ và lần đọc lại sau `run` trả cây về đúng cái máy chủ đang giữ.

Bảng/endpoint đã đụng: không đổi — vẫn `PATCH` và `PUT /api/tags?vocab=topics`.

Bộ luật: `frontend/src/content/logic.ts` không có trong repo, không đối chiếu được.

Kiểm: `admin/components/ConfigTree.test.tsx` — thêm "moves the row the moment it is dropped, before the server answers" (máy chủ không trả lời mà hàng vẫn thụt vào trong cha, có "đang lưu…"); bài kéo thả cũ đợi Hoàn tác bật lại rồi mới bấm.
