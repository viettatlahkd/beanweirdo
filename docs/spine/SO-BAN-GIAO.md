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

Bộ quy tắc hiện có **3 phần · 14 nhóm · 75 luật**. Ba mươi bảy luật dưới đây phát
sinh từ code đã merge; A1–A7 đã ghi vào, A8–A37 thì chưa.

| # | Luật | Từ PR | Nhóm phù hợp | Trạng thái |
|---|---|---|---|---|
| A1 | Mười bốn nhóm của bánh xe hương là từ vựng cố định, không phải dữ liệu bài. Mỗi nhóm một bộ ba màu dùng chung toàn hệ thống. | #2 | 12 (màu thẻ) | XONG |
| A2 | Thanh lọc nhóm hương xếp theo thứ tự bánh xe, không theo thứ tự bài viết nhắc tới. | #2 | 12 | XONG |
| A3 | Module phân loại theo hai trục độc lập: `kind` nói nó là gì, `visibility` nói nó có được liệt kê không. Không bao giờ lọc một bề mặt chỉ bằng `kind`. | #4 | 05 (điều hướng) | XONG |
| A4 | Trang chủ chỉ trưng module thường — vì nó là phòng trưng bày module đọc, không phải vì module đặc biệt bị ẩn. Mục lục và sidebar liệt kê mọi module công khai. | #4 | 05 | XONG |
| A5 | Sidebar xếp module thường trước, module đặc biệt sau; trong mỗi nhóm theo thứ tự đặt ở Content management. | #4 | 05 | XONG |
| A6 | Số hiện cạnh một bài là vị trí của nó trong danh sách người đọc đang nhìn, đếm từ 01. Không bao giờ in thẳng thứ tự lúc soạn. | #6 | 05 hoặc 08 | XONG |
| A7 | Khi chưa biết bài nằm ở đâu trong danh sách thì bỏ số đi, đừng đoán. | #6 | như A6 | XONG |
| A8 | Ghi chú cạnh bài là một element của nội dung, không phải thuộc tính của template: nó nằm trong `body` cạnh các khối, nên đi theo bài khi nhân bản và không cần cột riêng trong cơ sở dữ liệu. | #65 | 16 (template) | CHỜ |
| A9 | Element ghi chú có hai nửa. **Explorations** là bullet liền nhau, đọc từ trên xuống, nói về cả bài. **Field notes** là comment, mỗi cái neo vào một khối. Cả hai tồn tại từ lúc tạo; nửa nào không có chữ thì không vẽ — không có bước bật/tắt nào để đi tìm. | #65 | 16 | CHỜ |
| A10 | Field notes neo vào `id` của khối, không vào vị trí. Đổi chỗ khối thì ghi chú đi theo; nhân bản khối thì ghi chú được nhân bản cùng. | #65 | 16 | CHỜ |
| A11 | Tên cột ghi chú đi theo template (Field notes · Memo notes · Article notes · Card notes · Longform notes), màu đi theo module. "Explorations" là một chữ chung cho mọi template. Cột được gọi tên **một lần** ở đầu, không lặp trên từng ghi chú. | #65 | 16, và 12 (màu) | CHỜ |
| A12 | Xoá một khối đang có ghi chú thì hỏi ghi chú đi đâu: lên đoạn trên, xuống đoạn dưới, sang Explorations, hoặc xoá cùng khối. Một danh sách mở sẵn, tick là quyết định — không có bước xác nhận, chỉ có hai giây để quay lại. Không có ghi chú thì không hỏi. | #65 | 16 | CHỜ |
| A13 | Xoá hết chữ trong một **đoạn văn** thì khối biến mất và con trỏ dồn lên khối chữ phía trên. Khối **có cấp bậc** — tiêu đề, meta, bảng, ảnh, số liệu — giữ nguyên chỗ và hiện tên mình bằng chữ chìm; muốn bỏ hẳn thì xoá thêm một lần hoặc dùng nút. | #65 | 16 | CHỜ |
| A14 | Tỉ lệ chia hai cột lúc soạn **không lưu**. Kéo vạch là việc người soạn làm để nhìn cho rõ ngay lúc đó, không phải thuộc tính của bài. | #65 | 16 | CHỜ |
| A15 | Bề rộng cột trong **bảng** thì ngược lại: **có lưu**, theo bài. Một cột ngày và một cột văn xuôi cần chỗ khác nhau, và người đọc phải thấy đúng tỉ lệ người viết chốt. Bảng viết trước khi có bề rộng thì chia đều; danh sách bề rộng không còn khớp số cột thì bỏ qua, không co giãn cho vừa. | #67 | 16 | CHỜ |
| A17 | Cột ghi chú xếp giống nhau ở màn soạn và trên trang: Explorations ở **đầu** cột, field notes bên dưới, ngang hàng khối chúng neo vào. Cột cắt theo đoạn — một đoạn mở ra ở khối có ghi chú và chạy tiếp qua các khối không có — nên ghi chú vẫn ngang hàng khối của nó mà Explorations không phải nhường chỗ. Nút thêm ghi chú nằm trên chính khối, không nằm trong lề. | #67 | 16 | CHỜ |
| A18 | **Mọi thứ một template tô màu đều sinh ra từ đúng một màu: màu của module.** Dải đầu trang, chữ tiêu đề cột, cột biểu đồ, nền ảnh, gờ ghi chú, khối nhấn, dấu trích dẫn. Không màu nào được viết cứng trong template. Các sắc phái sinh giữ nguyên tông, chỉ đổi độ sáng, để màu module vẫn nhận ra được ở mọi độ đậm nhạt. | #67 | 12 (màu) | CHỜ |
| A19 | Tiêu đề có ba cấp. Cấp 3 mang màu module, để phân biệt cấp bằng màu chứ không chỉ bằng vài điểm cỡ chữ. Tiêu đề viết trước khi có cấp thì là cấp 1. | #67 | 02 (chữ) | CHỜ |
| A20 | Khối trích dẫn tự in dấu ngoặc kép — dấu ấy là của template, người viết không gõ. | #67 | 16 | CHỜ |
| A21 | `posts.theme_color` rỗng nghĩa là **theo module**, không phải "chưa đặt màu". Chọn lại đúng màu module thì không ghi gì — nhờ vậy đổi màu một module vẫn lan tới mọi bài chưa ai đặt riêng, thay vì để chúng giữ bản sao màu cũ và trôi dần ra khỏi module. | #68 | 12 (màu) | CHỜ |
| A22 | Cả năm template lấy dải màu đầu trang qua cùng một chỗ: màu riêng của bài đè màu module. `on_color` chỉ đi cùng màu module — nó là câu trả lời của module cho "chữ gì đọc được trên tôi", và là câu trả lời sai cho một màu khác; với màu khác thì hệ thống tự tính. | #68 | 12 | CHỜ |
| A23 | Mọi ô màu được gọi tên cùng một kiểu, ở mọi chỗ: `[tên module] — [mã màu]`. Màu không thuộc module nào là `customize`. Chỗ nào cho chọn màu thì cũng phải có ô nhập mã màu — màu thường được chốt ở nơi khác rồi mới mang tới đây dưới dạng sáu ký tự để dán. | #68 | 12 (màu) | CHỜ |
| A24 | Luật màu áp cho **mọi** template, không riêng report: dải đầu trang, chữ tiêu đề mục, mốc giai đoạn, dấu đầu dòng, nền khối nhấn, gờ chú thích — tất cả sinh từ màu bài. Không template nào được viết cứng màu của một module. | #69 | 12 (màu) | CHỜ |
| A25 | Mọi danh sách trong bài đều thêm / xoá / đổi chỗ / nhân bản được, bằng cùng một bộ tay nắm: phần của article, mục của memo, thẻ của cards, khối của report. Danh sách luôn còn ít nhất một mục — bài rỗng vẽ ra là trang trắng, người viết không phân biệt được với trang lỗi. | #69 | 16 (template) | CHỜ |
| A26 | Bản sao của một mục không được dùng chung mảng con với bản gốc. Sao chép nông thì sửa bản này đổi luôn bản kia, và không có gì trên màn hình cho biết điều đó. | #69 | 16 | CHỜ |
| A27 | **Template chỉ là một cách dàn các element, không phải một hình dạng dữ liệu riêng.** Element khai một lần trong kho (`elements/registry.ts`); thêm element là thêm một mục vào kho, mọi template thấy ngay. Không template nào được tự đẻ hình dạng cho thứ kho đã có. | #70 | 16 (template) | CHỜ |
| A28 | Element nào có tên trong từ vựng chuẩn của WordPress thì **giữ nguyên tên ấy** — paragraph, heading, list, quote, table, image. Element của riêng dự án (metrics, chart, callout, meta, notes) khai cùng khuôn. Khuôn là của WordPress; **cách vẽ thì không mượn** — mỗi template ở đây là một cách dàn trang có chủ ý. | #70 | 16 | CHỜ |
| A29 | Template được phép vẽ một element theo cách của mình khi bố cục đòi hỏi — kho giữ **format**, template giữ **layout**. Memo vẽ khối kết luận và bảng nếm khác report, cùng một dữ liệu. | #70 | 16 | CHỜ |
| A30 | Một dòng chữ là các **run**, không phải chuỗi phẳng, vì nó mang được chữ nhấn và số đo gạch chân. Ô chữ thường hiện chúng thành `chữ *được nhấn* chữ` và `_số đo_`, đi một vòng không mất gì — ép thành chuỗi phẳng để sửa là nuốt định dạng một cách lặng lẽ. | #70 | 02 (chữ) | CHỜ |
| A31 | **Màn soạn vẽ đúng thứ trang sẽ vẽ**, rồi biến từng chỗ chữ thành ô nhập — không dựng một chồng ô của riêng nó. Một ô soạn tự vẽ sẽ giấu mất số thứ tự, dấu đầu dòng, thụt lề; nội dung chỉ có nghĩa khi đứng cạnh những thứ ấy sẽ đọc thành vô nghĩa trong lúc viết. | #70 | 16 (template) | CHỜ |
| A32 | **Thân bài là một chuỗi phẳng các element; tiêu đề là element ngang hàng, không phải nắp của một cái bọc.** Mỗi element một tay nắm, một luật kéo thả cho cả bài. Muốn kéo cả cụm thì đó là việc người viết nói ra bằng element bọc, không phải cái bọc vô hình hệ thống áp sẵn. | #70 | 16 (template) | CHỜ |
| A33 | Menu chèn khối **đọc từ kho**, không phải danh sách viết cứng trong màn soạn. Viết cứng là cách một element có trong kho mà thiếu ngoài menu, và là cách một khối giữ cái tên code gọi nó thay vì tên đặt cho người đọc. | #70 | 16 | CHỜ |
| A34 | **Chiều cao dải ảnh là một con số duy nhất**, trang công khai và ô xem trước trong CMS cùng đọc. Ô xem trước tồn tại để hứa cho thấy trang sẽ ra sao; chép số sang là cách nó bắt đầu nói dối mà không ai biết. Dải trang chủ 420, ảnh đầu trang module 280 — đủ cao để một khung hình cắt được mà còn ra hình. | #71 | 03 (khoảng cách & lưới) | CHỜ |
| A35 | **Mọi màn đặt ảnh có đủ bốn thao tác giống nhau**: đổi ảnh · dán link · đặt vào khung · xoá. Thiếu một cái ở một màn là chỗ chủ site phải làm vòng khác cho cùng một việc. | #71 | 16 (template) | CHỜ |
| A36 | **Đổi thứ tự ảnh là kéo một ảnh sang khung khác**, hai bên đổi chỗ, chú thích đi theo ảnh của nó. Khung trên trang là cố định nên "chèn vào giữa" không có nghĩa; thứ cần chọn là ảnh nào nằm ở khung nào. Trước đó phải xoá rồi tải lại từng cái, và mỗi lần mất luôn chú thích cùng điểm căn khung. | #71 | 16 | CHỜ |
| A37 | **"Chưa đặt" khác "đặt là rỗng".** Chỉ giá trị vắng mặt mới rơi về bản mặc định; chuỗi rỗng là một lựa chọn và phải giữ nguyên. Coi rỗng là chưa đặt nghĩa là không xoá trắng được ô nào — gõ xoá hết rồi ô nhảy về như cũ. | #71 | 16 (template) | CHỜ |
| A16 | Bảng luôn còn ít nhất một cột và một hàng. Bảng không cột vẽ ra là một khoảng trắng — người viết không phân biệt được bảng rỗng với bảng đã bị xoá. | #67 | 16 | CHỜ |

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
| D23 | Bốn file migration dùng hai số hiệu: `0017_pinned_and_optional_order` + `0017_unclassified_lowercase`, và `0018_hour_log_note` + `0018_module_page_images`. Thứ tự chạy giữa mỗi cặp không suy ra được từ tên. **Không đổi tên** — file đã chạy, đổi tên là sửa lịch sử mà cơ sở dữ liệu đã hành động theo. `tools/spec-numbers.mjs --check` nay chặn cặp trùng **mới**, hai cặp cũ được cho qua có chủ ý. | XONG |
| D22 | **Có một dự án Supabase thứ hai đang tồn tại song song**, bảng `modules` dừng ở khoảng migration 0006. Chủ site chốt **giữ một dự án duy nhất là `kjzxzvuyngeimxxpftxo`** — dự án kia cần xoá trong Supabase, việc này chỉ chủ site làm được. SPEC nay ghi rõ tên dự án. | CHỜ CHỦ SITE XOÁ |

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

- **Agent xương sống** — mỗi PR phát sinh luật mới hoặc làm SPEC lỗi thời thì
  thêm dòng vào đây ngay trong PR đó.
- **Agent tài liệu** — đọc mục A và B, xử lý, rồi báo lại trong
  `docs/inbox/docs/`. Không tự sửa sổ này.
- **Agent tài liệu, đọc thêm `docs/inbox/qa/`** — agent hot-fix nộp ghi chú bàn
  giao ở đó sau mỗi PR merge. Mục đáng chú ý nhất là những dòng gắn nhãn
  `[ĐỔI HÀNH VI]`: đó là chỗ tài liệu phải đổi theo, khác với `[SỬA LỖI]` thì
  không.
- **Agent hot-fix (QA)** — có nợ tài liệu thì thêm dòng vào mục A hoặc D ở đây,
  không chỉ nộp vào `docs/inbox/qa/`. Sổ này tự nhận là nơi duy nhất để tra nợ,
  nên bất cứ thứ gì chỉ nằm trong hộp thư đến là thứ sổ không thấy — lane tài
  liệu đã báo chỗ này ba lượt liền (05, 06, 08).
- **Chủ site** — mục C là việc cần bạn quyết.
