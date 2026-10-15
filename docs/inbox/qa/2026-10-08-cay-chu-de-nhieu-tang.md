# PR #64 · nhánh `claude/project-thread-rpmkb1` — cây chủ đề nhiều tầng, kéo vào trong/ra ngoài

## [ĐỔI HÀNH VI] Chủ đề lồng sâu bao nhiêu tầng cũng được

Chủ site chọn "Chủ đề, nhiều tầng" (2026-10-08) khi hỏi lại cây kéo thả của cây module cũ (PR #30, #34).

- Database: `backend/supabase/migrations/0031_topics_any_depth.sql` bỏ trigger `topics_two_levels` (0027), thêm trigger `topics_no_cycle` (chặn vòng), viết lại `topic_is_public` đi hết đường lên gốc. **Chưa chạy** — chủ site dán vào SQL Editor. Trước khi chạy, mọi lần thả xuống tầng ba bị máy chủ từ chối (P0001 → 400).
- Phép tính thả: `lib/treeMove.ts: planMove`, lấy lại `lib/moduleMove.ts: planModuleMove` từ `backup/norway-main-2026-10-04`, cùng bài kiểm.
- Tab Cấu hình (`admin/components/ConfigTree.tsx: ConfigTree`): cây chủ đề vẽ đệ quy, mỗi hàng kéo được với ba vùng thả (`whereIn`: ¼ trên = trước, ½ giữa = vào trong, ¼ dưới = sau), "+ subject mới" cuối cây, "+ mục trong …" dưới mục đang sửa.
- Tab Nội dung (`ContentWorkspace.tsx`): cột trái vẽ mọi tầng, "+" trên mọi hàng; lọc theo một nút lấy bài của mọi tầng dưới nó (`inTopic`); kéo thả trong cột trái dùng `planMove` — thả lên anh em là đứng trước, thả lên mục khác là vào trong. `TopicSettings`: ô "Thuộc subject" thành "Nằm trong" (mọi nút ngoài nhánh của chính nó, hoặc tầng trên cùng); bỏ prop `subjects`.
- Quy chế (`lib/listingRule.ts`): `treeOrder` duỗi cây mọi tầng; `include_children` lấy mọi con cháu; nhóm theo subject lấy gốc của nhánh.
- Màu (`data/useModules.tsx: buildPages`): topic không màu lấy màu của tổ tiên gần nhất có màu, thay vì chỉ cha.
- Ô chọn chủ đề (`PostPlacement.tsx: topicOptions`, `MetadataStep.tsx`, thanh sửa nhiều bài, `PagesManager.tsx: nodeOptions` và cây Chủ đề): liệt kê mọi tầng, tên theo cả nhánh `a › b › c`.

Không đổi: trang công khai vẫn không vẽ cây chủ đề trong Mục lục hay đường dẫn (trang dựng từ topic không mang `parent_id`, như sau #61). Mẫu trang: gốc dùng `template_subject`, mọi tầng sâu hơn dùng `template_topic`.

Bảng/endpoint đã đụng: `topics` (trigger, hàm `topic_is_public`), `PATCH/PUT/POST /api/tags?vocab=topics` (chỉ gọi). Không thêm serverless function.

Kiểm: `lib/treeMove.test.ts`, `lib/listingRule.test.ts` (cây ba tầng), `admin/components/ConfigTree.test.tsx` (thả vào trong, kéo ra ngoài, thêm mục). `npm test` xanh. Đã xem bằng `cms-harness.html` trên Chromium.

## Đề xuất

Nếu muốn Mục lục và đường dẫn công khai hiện cây chủ đề nhiều tầng, cần cho trang dựng từ topic mang `parent_id` — đổi bố cục trang công khai, nên tách việc riêng.
