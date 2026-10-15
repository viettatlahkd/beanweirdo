# Sổ bàn giao — việc chờ quyết và nợ kỹ thuật

Sổ này là **một nơi duy nhất** để tra: việc gì đang chờ chủ site quyết, nợ kỹ
thuật nào chưa xử lý, đã xong chưa.

Người giữ sổ: agent xương sống. Cập nhật **trong cùng PR** phát sinh ra việc,
không để sang PR sau.

**Quy ước trạng thái:** `CHỜ` chưa ai làm · `ĐANG` đang xử lý · `XONG` đã xử lý ·
`BỎ` đã quyết không làm.

---

## C. Việc chờ chủ site quyết

| # | Việc | Trạng thái |
|---|---|---|
| C1 | ~~Nhánh `design/v4-cms-templates`~~ — đã gắn tag `archive/v4-cms-templates` và xoá nhánh, 2026-08-21. Xem mục E. | XONG |
| C2 | ~~Chạy migration `0016` (bỏ cột `n`)~~ — chạy xong 2026-08-21, đúng thứ tự: code lên trước. Đã kiểm: `posts` 21 cột, ghi vào `n` trả 400, `sort_order` vẫn ghi được. | XONG |
| C3 | Tiêu đề trang chủ đang là `beӕn weirdo#viettatlahkd` — nghi gõ nhầm trong CMS. | CHỜ |
| C4 | ~~`content/modules.ts` còn 82 dòng mô tả 3 module, không ai import.~~ — đã xoá 2026-09-19 cùng kho đăng ký dàn trang. Kiểm trước khi xoá: không file `.ts`/`.tsx` nào import, chỉ còn nhắc trong `docs/`. | XONG |
| C5 | Nút "+ tag" ở bài dạng thẻ — cần chốt nhóm hương mới lưu ở đâu trước khi làm. | CHỜ |
| C6 | Trang Report — làm đủ cột ghi chú, hay sửa 4 luật nhóm 11 cho khớp thực tế. | CHỜ |
| C7 | Token GitHub cũ trong Keychain vẫn còn quyền quá rộng và không hết hạn. | CHỜ |

## D. Nợ kỹ thuật tôi phát hiện, chưa xử lý

| # | Việc | Trạng thái |
|---|---|---|
| D1 | ~~Hai hàm `toCardsData` khác nhau~~ — gộp còn một ở `lib/postToRenderer.ts` (#19), bỏ nốt bộ nối (#21). Có test bắt buộc hai đường cho kết quả giống hệt. | XONG |
| D2 | Ghi 01 / Ghi 02 định nghĩa hai lần: bảng `modules` và `content/navItems.ts` chép tay tên + màu. Nay nav khai `moduleId`: **sơ đồ trang** và **sidebar** đều lấy tên · màu · danh sách bài từ CSDL. Không còn chỗ nào chép tay hai module này. | XONG |
| D3 | 15/19 bài có `body` rỗng — vỏ bài không nội dung. | CHỜ |
| D4 | ~~Trình soạn chỉ phủ `cards` và `report`~~ — `longform` và `memo` rơi vào nhánh cuối và bị soạn **như Article**: nhãn Template trống, dàn trang sai, và sửa một bài longform là ghi cấu trúc article đè lên nội dung đã dựng. Nay `memo` sửa được tại chỗ (tiêu đề · phụ đề · tiêu đề đoạn), `longform` hiện đúng renderer của nó và chỉ đọc — tiêu đề nó nằm trong chính khối nội dung nên không có ô nào để nối. Có test phủ cả 5 template. | XONG |
| D5 | ~~Module chưa có cách ẩn ngoài xoá~~ — đã có cột `visibility` (migration 0015). | XONG |
| D6 | ~~Hai tài liệu đối soát design có lỗi và không tái lập được~~ — đã thay bằng `docs/spine/DOI-SOAT-DESIGN.md` + `tools/design-audit.mjs`, chạy lại được. Lộ thêm: file design tôi dùng là bản **cũ hơn** bản trong repo (14 vs 16 màn hình). | XONG |
| D7 | Agent QA báo `main` đỏ 9 lỗi typecheck; tôi đo 6 commit gần nhất đều xanh. Chưa rõ nó chạy lệnh gì ở thư mục nào. | CHỜ |
| D8 | Chưa đối soát hai màn hình `isLongform` và `isTaste` — trước tưởng không có design. | CHỜ |
| D9 | 60 giá trị CSS trong design chưa thấy trong code, cần soi tay phân loại. | CHỜ |
| D10 | Ở Ghi 01, bài xếp trong module mở sang **trang riêng**, trong khi nhóm 07 luật 1 nói phải **xổ ra tại chỗ**. Chủ site xác nhận luật đúng, code sai. Cần quyết cách xổ một bài đầy đủ trong lưới ghi chú. | CHỜ |
| D11 | ~~Ảnh Trang chủ và ảnh trang module dùng chung một bộ~~ — migration 0018 thêm `page_img1..4` / `page_shot1..4`. Số ô theo dàn trang: band 1, specimen 3, sequence 4. Ô trống thì mượn ảnh Trang chủ và **nói rõ là đang mượn**. Dải rang roasting từ màu cứng thành 4 ô ảnh thật. | XONG |
| D12 | ~~Ảnh module tải lên không trang nào vẽ ra~~ — `img1/2/3` chỉ có trong kiểu dữ liệu, Trang chủ vẫn vẽ ô màu phẳng. Đã nối ở PR hình dạng form. | XONG |
| D13 | `Hours.tsx` (Ghi 02) **không đọc dòng nào** từ cơ sở dữ liệu — toàn bộ là chữ cứng. Vì thế ô Sửa nội dung của Ghi 02 nay chỉ còn Tên · Màu · danh sách bài, đúng phần chạy thật. Muốn sửa được cả trang thì phải nối trang vào DB — việc riêng, chủ site chốt tạm chưa làm. | CHỜ |
| D14 | ~~Tạo bài đăng hỏng hoàn toàn~~ — migration 0016 bỏ cột `posts.n` nhưng `POST /api/posts` vẫn ghi vào nó, nên mọi lối tạo bài (trình tạo bài và nút "+ bài") đều trả 500. Chính migration đó đã dặn "ship the code that stops writing this column first"; endpoint sắp xếp được sửa, endpoint tạo bài bị bỏ sót. | XONG |
| D15 | ~~Test backend chưa từng chạy tự động~~ — repo không có CI, mỗi PR chỉ được hai lần build Vercel kiểm; và `vitest.config.ts` ở gốc loại trừ `backend/`, nên 139 test backend nằm ngoài `npm test`. Nay `npm test` gồm cả backend, và `.github/workflows/test.yml` chạy nó trên mỗi PR và mỗi lần đẩy lên `main`. | XONG |
| D16 | Trang **Archive** không còn lối vào: `hiddenFromSidebar: true` và không gì gọi `goArchive`. Hai ô sửa nội dung của nó đã bỏ. Còn lại `Archive.tsx`, `Archive.test.tsx`, route trong `App.tsx`, mục trong `navItems.ts` và nhánh trong `crumbs.ts` — mã chết, cần chủ site quyết có xoá hẳn không. | CHỜ |
| D17 | ~~Sơ đồ trang và Sửa nội dung xếp bài sai thứ tự~~ — `postsOf` chỉ sắp theo `sort_order`, mà cột này rỗng với mọi bài, nên danh sách giữ nguyên thứ tự API trả (`updated_at`). Số 01…06 gọi tên một thứ tự trang web không dùng, và tay kéo sắp lại một danh sách không khớp trang nó đang sắp. Nay dùng chung `lib/postOrder.ts`. | XONG |
| D18 | ~~Hoà `published_at` không có mốc gỡ~~ — 19 bài seed chung một dấu thời gian tới từng giây, nên "mới nhất trước" không phân biệt được gì; ngày hiện trên mặt bài (`date_label`) thì khác nhau. Thêm tầng thứ tư cho cả CSDL lẫn CMS. | XONG |
| D19 | ~~Admin liệt kê mọi bài như thể đều đang trên trang~~ — sensory có 1 bài đăng và 5 lưu trữ, roasting có **0** bài đăng, nhưng cả sơ đồ lẫn Sửa nội dung đánh số 01…06 cho tất cả, và tay kéo sắp lại bài lưu trữ xen giữa bài sống. Nay khối này chỉ liệt kê bài đã đăng — nháp và lưu trữ quản ở tab Tạo bài đăng. | XONG |
| D20 | ~~Đăng/lưu trữ ở một tab không cập nhật các tab khác~~ — `PostsPanel` và `Cms` giữ hai bản sao riêng của danh sách bài, nạp độc lập, không ai báo ai. Đăng một bài xong thì sơ đồ và Sửa nội dung vẫn hiện trang như trước đó. Nay `PostsPanel` báo ra ngoài sau mỗi thay đổi. | XONG |
| D21 | ~~Khung xem trước trang module sai tỉ lệ~~ — vẽ lại bằng tay nên hiện 1.06:1 và 5.30:1 chỗ trang vẽ 0.73:1 và 1.66:1, hero 6:1 chỗ trang vẽ 5:1. Nay dùng chung `ModulePlates`. Kèm theo: chiều cao lưới specimen vốn do **độ dài đoạn dẫn** quyết định, nên sửa chữ là ảnh đổi tỉ lệ — đã ghim 373. | XONG |
| D23 | Bốn file migration dùng hai số hiệu: `0017_pinned_and_optional_order` + `0017_unclassified_lowercase`, và `0018_hour_log_note` + `0018_module_page_images`. Thứ tự chạy giữa mỗi cặp không suy ra được từ tên. **Không đổi tên** — file đã chạy, đổi tên là sửa lịch sử mà cơ sở dữ liệu đã hành động theo. Bộ kiểm số hiệu trùng nằm trong `tools/spec-numbers.mjs`, đã xoá cùng SPEC ngày 2026-10-14; nay không còn gì chặn cặp trùng mới. | XONG |
| D22 | **Có một dự án Supabase thứ hai đang tồn tại song song**, bảng `modules` dừng ở khoảng migration 0006. Chủ site chốt **giữ một dự án duy nhất là `kjzxzvuyngeimxxpftxo`** — dự án kia cần xoá trong Supabase, việc này chỉ chủ site làm được. | CHỜ CHỦ SITE XOÁ |

## E. Bản lưu trữ — nhớ soi lại khi rà Content management

Nhánh `design/v4-cms-templates` đã xoá, nhưng **giữ nguyên vĩnh viễn** ở tag
`archive/v4-cms-templates` (commit `422838e`, 151 file).

**Chủ site đã dặn:** khi rà tới **trang Content management**, phải soi lại bản
dựng CMS trong archive này — nó là bản thiết kế CMS đầu tiên và có thể chứa ý
đồ mà bản hiện tại đã đánh rơi. Ba màn hình template trong đó cũng vậy.

```bash
# xem toàn bộ ảnh chụp
git show archive/v4-cms-templates --stat

# mở ra xem như một nhánh
git checkout archive/v4-cms-templates

# so một file cụ thể với bản hiện tại
git diff main archive/v4-cms-templates -- frontend/src/screens/Cms.tsx
```

Các file đáng soi khi rà Content management:
`frontend/src/screens/Cms.tsx` · `frontend/src/screens/Cards.tsx` ·
`frontend/src/screens/Report.tsx` · `frontend/src/admin/screens/Dashboard.tsx` ·
`frontend/src/admin/lib/nav.tsx`

**Đừng merge tag này vào đâu cả** — nó là ảnh chụp trước khi rẽ nhánh, đi từ
`main` sang nó là 3.176 dòng thêm / 7.598 dòng xoá, 19 file conflict.

---

## Cách dùng sổ này

- **Agent xương sống** — mỗi PR phát sinh nợ kỹ thuật hay việc chờ quyết thì
  thêm dòng vào đây ngay trong PR đó.
- **Agent hot-fix (QA)** — có nợ thì thêm dòng vào mục D ở đây, không chỉ nộp
  vào `docs/inbox/qa/`.
- **Chủ site** — mục C là việc cần bạn quyết.

Hai mục cũ A (luật chờ vào `logic.ts`) và B (`docs/SPEC.html` lỗi thời) đã bỏ
ngày 2026-10-14: cả hai tài liệu đích đều đã xoá.
