# Cấu hình: tên theo ngôn ngữ CMS; port #1/#2; practice thành site riêng

- Nhánh: `feature/cau-hinh-ten` (cắt từ `main` 8539265) · PR: chưa mở · Không migration.
- Chủ site, 2026-10-15: đổi "Khung chung" sang tên chuẩn CMS và rà các tiêu đề; "Hình trang" → "Dàn trang"; biz → "port #1: biz",
  bean → "port #2: bean", có cơ chế cho port tiếp theo; Ghi 02 kéo ra khỏi beanweirdo, dưới journal, tên "practice".

## Đã sửa

- **[ĐỔI HÀNH VI]** Tên trong Cấu hình (`ConfigTree.tsx`, `PageSettings.tsx`):
  | Trước | Sau | Ở đâu |
  |---|---|---|
  | Khung chung | Đầu & chân trang | thẻ beanweirdo, tiêu đề chi tiết |
  | Thanh trên | Đầu trang | phần trong Đầu & chân trang |
  | Mục lục (beanweirdo) | Menu chính | thẻ, tiêu đề, breadcrumb; phần "Thanh trên" trong đó → "Các mục" |
  | Mục lục (biz, bean) | Danh mục con | thẻ, tiêu đề, breadcrumb (chủ site chọn tên) |
  | Mục lục (journal) | giữ | tên của trang công khai `/journal` |
  | Hình trang | Dàn trang | thẻ journal, tiêu đề, breadcrumb |
  | Chữ cố định | Nội dung tĩnh | mọi phần cùng tên |
  | Quy chế | Quy tắc liệt kê | `PageSettings.tsx` |
  Ba chuỗi "thanh trên" trong nút/ghi chú → "menu chính".
- **[ĐỔI HÀNH VI]** Thanh bên: biz → "port #1: biz", bean → "port #2: bean" (`AdminShell.tsx:PORT_SITES`, `CONFIG_SITE_LABELS`
  tính từ thứ tự trong `PORT_SITES`). Tên này cũng hiện ở breadcrumb.
- **[ĐỔI HÀNH VI]** practice là site thứ năm của Cấu hình, dưới journal (`CONFIG_SITES`). practice chính là Ghi 02 (chủ site):
  không có thẻ con, bấm là mở thẳng cấu hình Ghi 02 cũ (tên trên thanh bên, màu; xem trước `/practice`), tiêu đề "practice".
  Thẻ Ghi 02 rời khỏi beanweirdo. Dòng cuối thanh bên "Mở nhật ký Ghi 02 ↗" → "Mở practice ↗".

- **[ĐỔI HÀNH VI]** beanweirdo sắp lại (chủ site, 2026-10-15) — thẻ: Trang chủ · Thông tin chung · Template/Archive.
  - "Đầu & chân trang" → **Thông tin chung**; gồm Đầu trang, Chân trang, và **About + Signature** (trước mở từ Menu chính).
  - **Menu chính bỏ**, gộp vào **Trang chủ**: ba phần — Nội dung trang (tiêu đề, giới thiệu), Port trên trang chủ (các khối port,
    kéo đổi thứ tự, thêm port có sẵn), Thanh menu (thứ tự các mục; bấm About mở Thông tin chung). ContentTab tách `home` (chữ)
    và `blocks` (khối) (`PortEditors.tsx:PortPart`).
  - **Một thứ tự cho port, hai nơi**: đổi khối ở trang chủ → port trên menu xếp lại theo, các mục khác (About, journal) giữ chỗ
    (`content.ts:menuFollowingFeatures`, gọi trong `ContentTab:saveFeatures`); kéo port trên menu → khối trang chủ đổi theo
    (`content.ts:featuresFollowingMenu`, trong `ConfigTree:movePortLink`, lưu chung một lần, hoàn tác cả hai). Menu chưa sắp tay
    thì port theo thứ tự khối trang chủ rồi About (`content.ts:navLinks`).
  - "Danh mục con" của port #1 (trang port không thuộc trang chủ site nào: bibi, bibe) chuyển lên beanweirdo tên
    **Template/Archive**, thẻ cuối. port #1: biz chỉ còn Trang chủ biz. Trang trong đó có breadcrumb "beanweirdo › Template/Archive".
    port #2: bean giữ "Danh mục con".

- **[ĐỔI HÀNH VI]** Quản trị port (chủ site, 2026-10-15): dòng mới trong Cấu hình, giữa beanweirdo và journal, với ba dòng con
  **Template · port #1: biz · port #2: bean** (`AdminShell.tsx:PORT_GROUP`; `CONFIG_SITES` thêm `template`). Bấm Quản trị port mở
  Template. Template = Template/Archive cũ (rời khỏi beanweirdo, nay beanweirdo = Trang chủ · Thông tin chung). Mỗi port là trang
  chủ của nó: bấm dòng là mở thẳng, không còn thẻ con; port #2 bỏ "Danh mục con". Breadcrumb "Cấu hình › Quản trị port › …".
  Port mở trước khi trang chủ của nó tải xong thì tự chuyển sang trang chủ khi tải xong (`ConfigTree`, effect theo `bizHome`/`beanHome`).

- **[ĐỔI HÀNH VI]** "Quản trị port" đổi tên **port archives**.
- **[ĐỔI HÀNH VI]** port archives › Template liệt kê **mọi** trang port: bibi, bibe và trang chủ của từng port, mỗi dòng ghi trạng thái
  ("lưu trữ" / "đã đăng" / "nháp") và "trang chủ port #n" nếu có; trang chủ không có nút xoá ở đây.
- **[ĐỔI HÀNH VI]** "Thêm trang": trước đây chọn "mẫu bibi / mẫu bibe / trang trống" — hai mẫu đầu là bộ khối viết sẵn trong code
  (`blocks.ts:preset`), không phải trang bibi, bibe thật. Nay: "trang trống" hoặc "bản sao <trang>" cho mọi trang trong Template,
  lưu trữ hay đã đăng (`PortEditors.tsx:createFromPage`): chép khối, giao diện (look), lời dẫn, màu, ảnh; luôn là nháp, không thuộc
  trang chủ site nào (tức là một template mới). "+ Thêm khối" ở trang chủ beanweirdo vẫn dùng bộ khối viết sẵn — chưa đổi.
- **[SỬA LỖI]** Bấm lại dòng của site đang mở trong thanh bên không đưa về trang đầu của site (vì site không đổi). Nay mỗi lần bấm dòng
  site là về trang đầu (`AdminShell.tsx:clickSite`, `Frame.round`; effect trong `ConfigTree`). Lệnh mở site từ bên trong
  ConfigTree (vd. từ menu sang journal) không bị ảnh hưởng.

## Giới hạn

"Cơ chế cho port tiếp theo" mới ở mức tên: thêm một id vào `PORT_SITES` là nó thành "port #3: …". **Tạo một site port mới thì
chưa có**: `nodes.home_of` bị ràng buộc `in ('biz','bean')` (migration 0035), và địa chỉ công khai, cây Cấu hình của biz/bean
viết riêng từng site. Muốn tạo site port bất kỳ từ CMS cần: migration bỏ ràng buộc, địa chỉ công khai theo `home_of`, cây Cấu hình
dựng từ danh sách site port lấy từ dữ liệu.

## Kiểm

- `content.test.ts` thêm 3 test cho thứ tự port (menu theo khối, khối theo menu, mặc định). Kéo thả trên trình duyệt chưa thử (chủ
  site đang thao tác cùng khung).
- Trình duyệt sau khi sắp lại: beanweirdo = Trang chủ · Thông tin chung · Template/Archive; Trang chủ có Nội dung trang · Port trên
  trang chủ · Thanh menu (bizops, beæn weirdo, About, journal); Thông tin chung có Đầu trang · Chân trang · About · Signature;
  Template/Archive = bibi, bibe; port #1: biz = Trang chủ biz. Không lệnh ghi nào.
- Trình duyệt (dữ liệu hosted, chặn mọi lệnh ghi, không lệnh nào phát ra): thanh bên "beanweirdo · port #1: biz · port #2: bean ·
journal · practice"; thẻ: beanweirdo = Trang chủ · Menu chính · Đầu & chân trang; biz/bean = Trang chủ … · Danh mục con; journal =
Trang chủ · Mục lục · Dàn trang; practice không có thẻ con, mở thẳng cấu hình (breadcrumb "… › practice", xem trước `/practice`).
- Quản trị port trên trình duyệt: Template mở bibi, bibe; port #1 mở trang chủ biz, port #2 mở "art & culture"; chỉ dòng đang mở
  sáng; beanweirdo = Trang chủ · Thông tin chung. Không lệnh ghi nào.
- Thêm trang trên trình duyệt (chặn lệnh ghi): lựa chọn hiện "trang trống, bản sao bibi · lưu trữ, bản sao bibe · lưu trữ, bản sao
  strat & ops · đã đăng, bản sao art & culture · đã đăng"; tên "thử" + bản sao bibe → đúng một `POST /api/tags?vocab=nodes`
  {site: port, slug: thu, parent_id: null, blocks: <của bibe>, status: draft}; màn mở trang mới. Không tạo gì thật.
