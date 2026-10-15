# PR #68 · nhánh `claude/project-thread-rpmkb1` — thanh bên vẽ cả cây chủ đề, lồng đúng như cây

Chủ site (2026-10-08 09:35, kèm ảnh thanh bên): hỏi cái cây kéo thả lồng mục ngày xưa đâu. Ảnh cho thấy thanh bên là một danh sách phẳng: roasting 101, biochemistry 101, sensory nằm ngang hàng với subject.

## [SỬA LỖI] Trang của topic lồng theo cây chủ đề, không theo module nó mượn

Trước: `data/useModules.tsx: buildPages` dựng trang topic từ lớp "looks" của module mượn (`present`), nên `parent_id` của trang là `parent_id` của **module** cũ, không phải của topic. Thanh bên (`components/Sidebar.tsx`, `buildTree(indexModules(…))`) lồng theo `parent_id` ấy. Kéo một topic vào trong topic khác ở Cấu hình (PR #64) không làm thanh bên lồng theo.
Sau: trang topic mang `parent_id: t.parent_id`.

## [ĐỔI HÀNH VI] Thanh bên có mọi topic, theo thứ tự cây

Trước (PR #67): `arrange` chỉ đưa subject vào thanh bên theo thứ tự cây; topic con chỉ hiện nếu có trong danh sách `nav` (`presentation.items`).
Sau: `arrange` đi cả cây (`flattenTree(buildTree(…))`): mọi topic hiện ở thanh bên trừ khi bị tắt, tắt một mục thì nhánh dưới nó ẩn theo. Trang chủ blog mặc định vẫn chỉ có subject. Trang chọn tay và tag trong danh sách đi sau cây như PR #67.
`PageSettings.tsx: NavFlags` nhận `defaults: { sidebar, home }` thay cho `listed`, để ô hiện/ẩn khớp đúng mặc định của `arrange` (topic: thanh bên bật; trang chủ bật chỉ với subject).

Hệ quả trên site thật: topic con trước đây không có trong danh sách sẽ xuất hiện ở thanh bên, thụt vào dưới cha. Tiêu đề trang vẫn lấy như cũ (module mượn vẫn có thể đè tên topic; PR này không đổi chỗ đó).

Bảng/endpoint đã đụng: không đổi gì ngoài đọc như cũ. Không cần SQL.

Bộ luật: `frontend/src/content/logic.ts` không có trong repo, không đối chiếu được.

Kiểm: `data/useModules.pages.test.ts` (thêm: trang topic con mang `parent_id` của topic). `npm run lint`, typecheck, các test `data/`, `components/`, `ConfigTree.test.tsx` xanh.
