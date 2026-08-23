# Sổ bàn giao — việc đang chờ đưa vào tài liệu

Sổ này là **một nơi duy nhất** để tra: có gì đang nợ tài liệu, ai chịu trách
nhiệm, đã xong chưa. Chủ site duyệt phần tài liệu vào cuối ngày, nên mọi thứ
phải nằm ở đây chứ không nằm rải rác trong các ghi chú theo PR.

Người giữ sổ: agent xương sống. Cập nhật **trong cùng PR** phát sinh ra việc,
không để sang PR sau.

**Quy ước trạng thái:** `CHỜ` chưa ai làm · `ĐANG` đang xử lý · `XONG` đã vào
tài liệu · `BỎ` đã quyết không làm.

---

## A. Luật đề xuất — chờ đưa vào `frontend/src/content/logic.ts`

Bộ quy tắc hiện có **3 phần · 14 nhóm · 75 luật**. Bảy luật dưới đây phát sinh
từ code đã merge, chưa luật nào được ghi vào.

| # | Luật | Từ PR | Nhóm phù hợp | Trạng thái |
|---|---|---|---|---|
| A1 | Mười bốn nhóm của bánh xe hương là từ vựng cố định, không phải dữ liệu bài. Mỗi nhóm một bộ ba màu dùng chung toàn hệ thống. | #2 | 12 (màu thẻ) | XONG |
| A2 | Thanh lọc nhóm hương xếp theo thứ tự bánh xe, không theo thứ tự bài viết nhắc tới. | #2 | 12 | XONG |
| A3 | Module phân loại theo hai trục độc lập: `kind` nói nó là gì, `visibility` nói nó có được liệt kê không. Không bao giờ lọc một bề mặt chỉ bằng `kind`. | #4 | 05 (điều hướng) | XONG |
| A4 | Trang chủ chỉ trưng module thường — vì nó là phòng trưng bày module đọc, không phải vì module đặc biệt bị ẩn. Mục lục và sidebar liệt kê mọi module công khai. | #4 | 05 | XONG |
| A5 | Sidebar xếp module thường trước, module đặc biệt sau; trong mỗi nhóm theo thứ tự đặt ở Content management. | #4 | 05 | XONG |
| A6 | Số hiện cạnh một bài là vị trí của nó trong danh sách người đọc đang nhìn, đếm từ 01. Không bao giờ in thẳng thứ tự lúc soạn. | #6 | 05 hoặc 08 | XONG |
| A7 | Khi chưa biết bài nằm ở đâu trong danh sách thì bỏ số đi, đừng đoán. | #6 | như A6 | XONG |

## B. `docs/SPEC.html` đã lỗi thời

| # | Mục | Sai ở đâu | Trạng thái |
|---|---|---|---|
| B1 | Bộ quy tắc | Con số luật: 67 (tôi ghi sai) → 64 (đúng lúc đó) → 68 → **75** hôm nay. Đã sửa trong SPEC cùng PR này. | XONG |
| B2 | Cơ sở dữ liệu | `modules` nay **21 cột** (thêm `visibility`), không phải 20. | XONG |
| B3 | Cơ sở dữ liệu | `posts` **22 → 21 cột** sau khi bỏ `n`. Migration đã chạy 2026-08-21. | XONG |
| B4 | Cột của hai bảng chính | Bỏ `n` khỏi dòng liệt kê `posts`. Migration đã chạy. | XONG |
| B5 | Mô hình nội dung | Đoạn nói module đặc biệt không nằm chung lưới trang chủ vẫn đúng, nhưng phải nói rõ chúng **có** ở Mục lục và sidebar. | XONG |
| B6 | Backend | Thêm `backend/scripts/dev-server.mjs` — cách chạy khu admin ở local. | XONG |
| B7 | Khoảng trống đã biết | Mục "bản xem trước giống hệt bản thật" **đang sai**: có hai hàm `toCardsData` khác nhau cho công khai và admin. | XONG |
| B8 | Thiếu hẳn | Chưa mục nào mô tả thanh lọc nhóm hương ở bài dạng thẻ. | XONG |

## C. Việc chờ chủ site quyết

| # | Việc | Trạng thái |
|---|---|---|
| C1 | ~~Nhánh `design/v4-cms-templates`~~ — đã gắn tag `archive/v4-cms-templates` và xoá nhánh, 2026-08-21. Xem mục E. | XONG |
| C2 | ~~Chạy migration `0016` (bỏ cột `n`)~~ — chạy xong 2026-08-21, đúng thứ tự: code lên trước. Đã kiểm: `posts` 21 cột, ghi vào `n` trả 400, `sort_order` vẫn ghi được. | XONG |
| C3 | Tiêu đề trang chủ đang là `beӕn weirdo#viettatlahkd` — nghi gõ nhầm trong CMS. | CHỜ |
| C4 | `content/modules.ts` còn 82 dòng mô tả 3 module, không ai import. | CHỜ |
| C5 | Nút "+ tag" ở bài dạng thẻ — cần chốt nhóm hương mới lưu ở đâu trước khi làm. | CHỜ |
| C6 | Trang Report — làm đủ cột ghi chú, hay sửa 4 luật nhóm 11 cho khớp thực tế. | CHỜ |
| C7 | Token GitHub cũ trong Keychain vẫn còn quyền quá rộng và không hết hạn. | CHỜ |

## D. Nợ kỹ thuật tôi phát hiện, chưa xử lý

| # | Việc | Trạng thái |
|---|---|---|
| D1 | ~~Hai hàm `toCardsData` khác nhau~~ — gộp còn một ở `lib/postToRenderer.ts` (#19), bỏ nốt bộ nối (#21). Có test bắt buộc hai đường cho kết quả giống hệt. | XONG |
| D2 | Ghi 01 / Ghi 02 định nghĩa hai lần: bảng `modules` và `content/navItems.ts` chép tay tên + màu. | CHỜ |
| D3 | 15/19 bài có `body` rỗng — vỏ bài không nội dung. | CHỜ |
| D4 | Trình soạn thảo mới phủ `cards` và `report`; `longform` và `memo` chưa sửa được trong Editor. | CHỜ |
| D5 | ~~Module chưa có cách ẩn ngoài xoá~~ — đã có cột `visibility` (migration 0015). | XONG |

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
| D6 | ~~Hai tài liệu đối soát design có lỗi và không tái lập được~~ — đã thay bằng `docs/spine/DOI-SOAT-DESIGN.md` + `tools/design-audit.mjs`, chạy lại được. Lộ thêm: file design tôi dùng là bản **cũ hơn** bản trong repo (14 vs 16 màn hình). | XONG |
| D11 | **Ảnh Trang chủ và ảnh đầu trang module đang dùng chung một bộ `shot1/2/3`.** Đó là hai khái niệm khác nhau: ảnh giới thiệu module ở Trang chủ chưa chắc là ảnh mở đầu trang module chi tiết. Cần tách thành hai bộ, và cho phép ở Sửa nội dung Trang chủ chọn **lấy theo trang module** hay **đặt riêng**, kèm sắp thứ tự ảnh. Chủ site chốt: **để sau**, xử lý chung khi xong các dàn trang module hiện tại. | CHỜ |
| D12 | ~~Ảnh module tải lên không trang nào vẽ ra~~ — `img1/2/3` chỉ có trong kiểu dữ liệu, Trang chủ vẫn vẽ ô màu phẳng. Đã nối ở PR hình dạng form. | XONG |
| D13 | `Hours.tsx` (Ghi 02) **không đọc dòng nào** từ cơ sở dữ liệu — toàn bộ là chữ cứng. Vì thế ô Sửa nội dung của Ghi 02 nay chỉ còn Tên · Màu · danh sách bài, đúng phần chạy thật. Muốn sửa được cả trang thì phải nối trang vào DB — việc riêng, chủ site chốt tạm chưa làm. | CHỜ |
| D14 | ~~Tạo bài đăng hỏng hoàn toàn~~ — migration 0016 bỏ cột `posts.n` nhưng `POST /api/posts` vẫn ghi vào nó, nên mọi lối tạo bài (trình tạo bài và nút "+ bài") đều trả 500. Chính migration đó đã dặn "ship the code that stops writing this column first"; endpoint sắp xếp được sửa, endpoint tạo bài bị bỏ sót. | XONG |
| D15 | ~~Test backend chưa từng chạy tự động~~ — repo **không có CI**, mỗi PR chỉ được hai lần build Vercel kiểm; và `vitest.config.ts` ở gốc loại trừ `backend/`, nên 139 test backend nằm ngoài `npm test`. Nay đã gộp vào. Vẫn **chưa có CI** — build Vercel xanh không có nghĩa là test xanh. | ĐANG |
| D16 | Trang **Archive** không còn lối vào: `hiddenFromSidebar: true` và không gì gọi `goArchive`. Hai ô sửa nội dung của nó đã bỏ. Còn lại `Archive.tsx`, `Archive.test.tsx`, route trong `App.tsx`, mục trong `navItems.ts` và nhánh trong `crumbs.ts` — mã chết, cần chủ site quyết có xoá hẳn không. | CHỜ |
| D8 | Chưa đối soát hai màn hình `isLongform` và `isTaste` — trước tưởng không có design. | CHỜ |
| D9 | 60 giá trị CSS trong design chưa thấy trong code, cần soi tay phân loại. | CHỜ |
| D7 | Agent QA báo `main` đỏ 9 lỗi typecheck; tôi đo 6 commit gần nhất đều xanh. Chưa rõ nó chạy lệnh gì ở thư mục nào. | CHỜ |
| D10 | Ở Ghi 01, bài xếp trong module mở sang **trang riêng**, trong khi nhóm 07 luật 1 nói phải **xổ ra tại chỗ**. Chủ site xác nhận luật đúng, code sai. Cần quyết cách xổ một bài đầy đủ trong lưới ghi chú. | CHỜ |

---

## Cách dùng sổ này

- **Agent xương sống** — mỗi PR phát sinh luật mới hoặc làm SPEC lỗi thời thì
  thêm dòng vào đây ngay trong PR đó.
- **Agent tài liệu** — đọc mục A và B, xử lý, rồi báo lại trong
  `docs/inbox/docs/`. Không tự sửa sổ này.
- **Agent tài liệu, đọc thêm `docs/inbox/qa/`** — agent hot-fix nộp ghi chú bàn
  giao ở đó sau mỗi PR merge. Mục đáng chú ý nhất là những dòng gắn nhãn
  `[ĐỔI HÀNH VI]`: đó là chỗ tài liệu phải đổi theo, khác với `[SỬA LỖI]` thì
  không.
- **Chủ site** — mục C là việc cần bạn quyết.
