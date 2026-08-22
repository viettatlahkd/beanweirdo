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

Bộ quy tắc hiện có **3 phần · 14 nhóm · 68 luật** (64 + 4 thêm ở PR template contract). Bảy luật dưới đây phát sinh
từ code đã merge, chưa luật nào được ghi vào.

| # | Luật | Từ PR | Nhóm phù hợp | Trạng thái |
|---|---|---|---|---|
| A1 | Mười bốn nhóm của bánh xe hương là từ vựng cố định, không phải dữ liệu bài. Mỗi nhóm một bộ ba màu dùng chung toàn hệ thống. | #2 | 12 (màu thẻ) | CHỜ |
| A2 | Thanh lọc nhóm hương xếp theo thứ tự bánh xe, không theo thứ tự bài viết nhắc tới. | #2 | 12 | CHỜ |
| A3 | Module phân loại theo hai trục độc lập: `kind` nói nó là gì, `visibility` nói nó có được liệt kê không. Không bao giờ lọc một bề mặt chỉ bằng `kind`. | #4 | 05 (điều hướng) | CHỜ |
| A4 | Trang chủ chỉ trưng module thường — vì nó là phòng trưng bày module đọc, không phải vì module đặc biệt bị ẩn. Mục lục và sidebar liệt kê mọi module công khai. | #4 | 05 | CHỜ |
| A5 | Sidebar xếp module thường trước, module đặc biệt sau; trong mỗi nhóm theo thứ tự đặt ở Content management. | #4 | 05 | CHỜ |
| A6 | Số hiện cạnh một bài là vị trí của nó trong danh sách người đọc đang nhìn, đếm từ 01. Không bao giờ in thẳng thứ tự lúc soạn. | #6 | 05 hoặc 08 | CHỜ |
| A7 | Khi chưa biết bài nằm ở đâu trong danh sách thì bỏ số đi, đừng đoán. | #6 | như A6 | CHỜ |

## B. `docs/SPEC.html` đã lỗi thời

| # | Mục | Sai ở đâu | Trạng thái |
|---|---|---|---|
| B1 | Bộ quy tắc | Con số luật: 67 (tôi ghi sai) → 64 (đúng lúc đó) → **68** hôm nay. Đã sửa trong SPEC. | XONG |
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
| D1 | Hai hàm `toCardsData` khác nhau — admin xem trước không giống bản thật (thiếu màu nhóm, thiếu dải màu đầu bài). | CHỜ |
| D2 | Ghi 01 / Ghi 02 định nghĩa hai lần: bảng `modules` và `content/navItems.ts` chép tay tên + màu. | CHỜ |
| D3 | 15/19 bài có `body` rỗng — vỏ bài không nội dung. | CHỜ |
| D4 | Trình soạn thảo mới phủ `cards` và `report`; `longform` và `memo` chưa sửa được trong Editor. | CHỜ |
| D5 | Module chưa có cách ẩn ngoài xoá — nay đã có `visibility`, nên D5 coi như đã gỡ. | XONG |

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
| D6 | Hai tài liệu đối soát design của tôi — `DOI-SOAT-DESIGN-V4.html` và `SO-TUNG-ELEMENT.html` — **chưa commit** và **có lỗi**: số dòng lệch 5, số liệu tự mâu thuẫn, và bảng so sánh **không tái lập được** vì script đọc file design từ một thư mục tạm nay đã mất. Agent tài liệu bắt được ở lượt 03–04. Cần dựng lại từ file design trong repo, hoặc bỏ hẳn. | CHỜ |
| D7 | Agent QA báo `main` đỏ 9 lỗi typecheck; tôi đo 6 commit gần nhất đều xanh. Chưa rõ nó chạy lệnh gì ở thư mục nào. | CHỜ |

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
