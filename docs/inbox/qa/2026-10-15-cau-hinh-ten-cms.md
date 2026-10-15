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

## Thanh menu: gỡ không xoá, Thêm mục chỉ gọi trang có sẵn

- **[SỬA LỖI]** ⋯ trên dòng trang port ở Thanh menu (beanweirdo › Trang chủ) trước đây là "Xoá trang…", tức **xoá hẳn trang
  port** (`ConfigTree.tsx:tocList` rơi về `deleteOf` vì dòng không có `actions`). Giờ mọi dòng có đúng một lệnh "Gỡ khỏi thanh
  menu": trang port và about → `hideLink` (đặt `hidden: true` trong `site_settings.data.portfolio.header.links`); trang journal →
  `dropLink` (bỏ khỏi danh sách như cũ). Xoá trang chỉ còn ở port archives › Template.
- **[ĐỔI HÀNH VI]** Dòng đã ẩn không còn hiện trong Thanh menu (trước: hiện kèm "ẩn"). Gọi lại bằng Thêm mục.
  `movePortLink` giữ các link ẩn ở cuối danh sách khi kéo thả, để chúng không hiện lại.
- **[ĐỔI HÀNH VI]** Thêm mục: mặc định "Trang có sẵn" (mục journal chưa có trên menu + trang đang ẩn). "Trang mới" không còn ô
  nhập tên mà là nút "Tạo trang ở Template": mở port archives › Template với form Thêm trang mở sẵn (`AddSpec.newAt`,
  `AddSpec.startOpen` trong `Detail.tsx`).
- **[ĐỔI HÀNH VI]** Nhãn "About" → "about" ở Thanh menu, tiêu đề màn about, ghi chú thẻ Thông tin chung.
- Trình duyệt (chặn lệnh ghi): ⋯ bizops chỉ có "Gỡ khỏi thanh menu" → đúng một `PATCH /api/site` với bizops `hidden: true`, không
  lệnh xoá nào; bizops biến khỏi danh sách; Thêm mục liệt kê "mục lục journal · /journal/muc-luc", "bizops · /biz · đang ẩn"; chọn
  bizops → `PATCH /api/site` `hidden: false`, bizops về vị trí 01. "Tạo trang ở Template" → Template, form Thêm trang mở. Không
  ghi gì thật.

## Trang chủ: bỏ "Port trên trang chủ", khối port mở từ Thanh menu

- **[ĐỔI HÀNH VI]** Trang chủ (beanweirdo) còn hai phần: Nội dung trang · Thanh menu. Phần "Port trên trang chủ" bỏ hẳn, cùng nút
  "+ Thêm khối" và kéo thả khối (`PortEditors.tsx`: bỏ `AddFeature`, nhánh `only === 'blocks'`, `PRESET_CHOICES`; `PortPart` bỏ
  `blocks`, thêm `feature`).
- **[ĐỔI HÀNH VI]** Mỗi dòng trang port ở Thanh menu có hai nút:
  - "Cập nhật nội dung": mở ngay dưới dòng công tắc "Hiện ở trang chủ" và các ô Nhãn · Mô tả ngắn · Ảnh của khối port đó
    (`ContentTab only="feature" pageId=…`). Vẫn ghi vào `site_settings.data.portfolio.home.features` như trước.
  - "Xem dàn trang": mở trang đó trong port archives (port #1/#2 theo `portSiteOf`, trang lưu trữ thì Template).
  - Dòng about và journal không có hai nút này. (`ListItem.buttons`, `ListItem.below` trong `Detail.tsx`.)
  - Hai nút vẽ như ô thông tin bài ở Nội dung (`.cw-fact`): chữ + icon nhỏ, không viền; rê chuột hoặc đang mở thì nền trắng
    viền mảnh (`.cfg-fact` trong `Detail.tsx`).
- **[ĐỔI HÀNH VI]** Ghi chú cách dùng của Thanh menu chuyển vào ô ⓘ cạnh tiêu đề (`Section` prop `tip`, `.cfg-tip` trong
  `Detail.tsx`), viết lại: "Thứ tự mặc định: các trang port, sau đó là about và journal. Kéo biểu tượng ⠿ ở đầu dòng để sắp xếp lại."
- **[SỬA LỖI]** Công tắc "Hiện ở trang chủ" trong panel "Cập nhật nội dung": tắt rồi bật lại từng ra khối trống (tắt = bỏ hẳn khối
  khỏi `home.features`). Giờ khối tắt được giữ trong phiên (`offFeatures` trong `PortEditors.tsx`), bật lại thì nhãn, mô tả, ảnh
  quay về. Đã xảy ra trên dữ liệu thật lúc 2026-10-15 16:20 UTC: khối beæn weirdo mất nhãn "beæn weirdo" và ảnh
  `post-images/7026093d-7936-4936-9b16-e1391f7eeb42.jpeg`. Đã khôi phục sau khi chủ site duyệt (xem mục [SỬA DỮ LIỆU]).
- **[ĐỔI HÀNH VI]** Dòng about ở Thanh menu có "Cập nhật nội dung"; phần Signature bỏ khỏi Thông tin chung (xem mục chữ kí dưới).
- **[ĐỔI HÀNH VI]** Công tắc "Hiện ở trang chủ" lên thẳng dòng port ở Thanh menu (`ListItem.control`), không còn trong panel.
  Tắt thì "Cập nhật nội dung" mờ đi và panel đóng. Công tắc này và công tắc cùng tên trong trang port dùng chung
  `ConfigTree.tsx:setOnHome`: khối tắt được nhớ trong phiên (`offFeatures`), bật lại thì về đúng vị trí theo thứ tự menu
  (`featuresFollowingMenu`) với nhãn, mô tả, ảnh cũ. Trình duyệt (chặn lệnh ghi): tắt bizops → features chỉ còn beæn weirdo; bật
  lại → "beæn bizops"+ảnh ở vị trí 01.
- **[ĐỔI HÀNH VI] Chữ kí thành đối tượng riêng.** `portfolio/content.ts`: `about.signs` (tên) + `about.signUse` (chỉ số) +
  `about.reach` (một danh sách liên hệ) → `about.signatures: Signature[]` ({id, name, image, reach}) + `about.signId`.
  `aboutOf` (trong `resolveContent`) đọc dữ liệu cũ thành chữ kí 1 = tên đang dùng + liên hệ cũ; dữ liệu thật **chưa ghi lại** —
  lần lưu đầu tiên từ CMS sẽ ghi `signatures`/`signId`, các trường cũ để nguyên trong `site_settings.data.portfolio.about`.
  `aboutSign` trả về cả chữ kí; `PortAbout` (`PortfolioView.tsx`) lấy tên và liên hệ từ chữ kí đang chọn.
- **[ĐỔI HÀNH VI]** Thông tin chung: mục "about" đổi thành "Quản lý chữ kí" (`SignaturesPanel.tsx`, khuôn của `AuthorsPanel`): mỗi
  chữ kí một thẻ (ảnh tròn, tên, các liên hệ, "đang dùng ở about"); bấm thẻ mở hộp thoại Tên chữ kí · ảnh · Liên hệ, ghi khi bấm
  Lưu; ⋮ có Sửa, Dùng ở about, Xoá (chữ kí đang dùng không xoá được). Ảnh chữ kí chỉ lưu, trang công khai chưa dùng.
- **[ĐỔI HÀNH VI]** Thanh menu › about › Cập nhật nội dung: Đoạn chữ phủ ảnh · Nhãn trên ảnh · Ảnh hẹp · Ảnh chính (chuyển từ
  Thông tin chung) + "Chữ kí": chọn trong danh sách, hoặc "Tạo chữ kí" → Thông tin chung với hộp thoại Thêm chữ kí mở sẵn.
  `PortPart` bỏ `sign`.
- **[SỬA DỮ LIỆU — chủ site duyệt 2026-10-15]** `site_settings` (id=true) `portfolio.home.features`, khối pageId `d58a1b4a-…`:
  ghi lại `label` "beæn weirdo", `image` `post-images/7026093d-7936-4936-9b16-e1391f7eeb42.jpeg` (REST PATCH, đọc trước rồi chỉ
  đổi hai trường này). bizops không mất gì nên không đụng.
- Trình duyệt (chặn lệnh ghi): dropdown about hiện đủ ô + Chữ kí "a soliloquise"; "Tạo chữ kí" → Thông tin chung, hộp thoại mở,
  con trỏ ở ô tên; lưu "thử" + email → một `PATCH /api/site` `portfolio.about` với `signatures` [chữ kí 1 kèm 4 liên hệ cũ, thử],
  `signId` sign-1. `/about` công khai vẫn ký "a soliloquise", liên hệ email + linkedin.
- **[ĐỔI HÀNH VI]** Dropdown about: thứ tự Ảnh hẹp · Ảnh chính → Nhãn trên ảnh → "Văn bản lớp phủ" (đổi tên từ "Đoạn chữ phủ
  ảnh") → Chữ kí. "Tạo chữ kí" thành lựa chọn cuối "+ Tạo chữ kí mới…" trong danh sách Chữ kí (`NEW_SIGN`, `PortEditors.tsx`).
- **[ĐỔI HÀNH VI]** Bấm vào thân dòng ở Thanh menu không còn mở trang nào; dòng chỉ làm việc qua nút của nó và ⋮
  (`ListItem.onOpen` thành tuỳ chọn, `RowBody` trong `Detail.tsx`). Trình duyệt: bấm tên bizops → vẫn ở Trang chủ; chọn
  "+ Tạo chữ kí mới…" → Thông tin chung, hộp thoại Thêm chữ kí mở, không lệnh ghi nào.
- **[ĐỔI HÀNH VI]** Ô chữ nhiều dòng trong `ContentTab` (Văn bản lớp phủ, Giới thiệu trang chủ…) cao vừa chữ: lúc nghỉ tối đa
  120px (`REST_MAX`), bấm vào thì hiện hết, gõ thêm thì giãn tiếp, rời ô thì về lại (`fitText`, `PortEditors.tsx`; bỏ
  `minHeight: 70`). Khung `ContentTab` bỏ 20px đệm dưới, khung ngoài ôm sát ô cuối. Lựa chọn "Tạo chữ kí mới…" bỏ dấu "+".
- **[SỬA LỖI]** `/about` công khai: văn bản lớp phủ dính thành một đoạn vì `.pf .over p` không giữ xuống dòng. Thêm
  `white-space: pre-wrap` (`portfolio/styles.ts`). Giữ xuống dòng thì bài 31 dòng tràn khỏi khung ảnh (458px) đè lên reach/post, nên
  riêng `.pf .over.ctx p` (chỉ about dùng) chuyển sang 2 cột, chữ `clamp(13px,1.5cqw,17px)`, line-height 1.4: vừa khung, chữ kí ở
  424px. Phương án khác đã thử: khung ảnh cao theo chữ (khung thành 1133px, ảnh bị cắt mạnh) — chưa chọn, chờ chủ site.
- **[ĐỔI HÀNH VI]** `/about` công khai: bỏ dòng tên chữ kí dưới văn bản lớp phủ (`PortAbout`, `PortfolioView.tsx`; chữ kí đang
  chọn vẫn quyết định liên hệ ở "reach"). Khối phủ xếp từ trên xuống, nhãn và văn bản cách nhau `--s-5` (34px), màu chữ
  `#b8505a` thay `var(--signal)` (`.pf .over.ctx`, `styles.ts`). Đo trên ảnh about (thu nhỏ 60×37, tương phản WCAG từng điểm):
  #b8505a trung bình 3.26:1, 60% điểm ≥3:1; #f19ea3 2.45:1, 19%; màu cũ 3.35:1, 60% — màu cũ chìm vì cùng tông xám-xanh với ảnh
  đen trắng chứ không vì độ sáng.
- **[ĐỔI HÀNH VI]** `/about`: văn bản lớp phủ có nền bôi luôn bật sau từng dòng chữ (`.pf .over.ctx p>span`): hồng `#fbd6d8` độ
  mờ 60%, phủ nửa dưới dòng (từ 50%). Đã thử: hồng đặc từ 40% (chủ site: nhức mắt), giấy `#fefdfb` mờ 72% gần kín dòng (chủ site:
  không chấp nhận được).
  `PortAbout` tách từng dòng: phần thụt đầu dòng để trống, chỉ chữ được bôi.
- **[ĐỔI HÀNH VI]** Thông tin chung: "Đầu trang" + "Chân trang" gộp thành một mục "Đầu trang và chân trang" (4 ô, nhãn ghi rõ
  "Đầu trang · …"/"Chân trang · …"); link trên thanh đầu trang tách thành mục "Link trang con" (ⓘ: thứ tự ở Trang chủ › Thanh
  menu). `PortPart`: `header` = chữ đầu + chân trang, `links` = các link; bỏ `footer`. Dữ liệu ghi vẫn là `portfolio.header` /
  `portfolio.footer` như cũ.
- **[ĐỔI HÀNH VI]** Bấm vào thân dòng ở Thanh menu giờ mở/đóng "Cập nhật nội dung" của dòng đó (port đang hiện ở trang chủ,
  about); port đang tắt "Hiện ở trang chủ" và journal thì bấm không làm gì. Không dòng nào còn mở trang khác khi bấm.
- **[SỬA DỮ LIỆU — chủ site yêu cầu 2026-10-16]** `nodes` site=port: `f215cf9d-…` bibi → title "archive 1", slug `archive-1`;
  `cc6f1175-…` bibe → title "archive 2", slug `archive-2` (REST PATCH). Cả hai đang `archived`. Đã tìm `biz/bibi`, `biz/bibe` trong
  `site_settings.data` và `nodes.blocks` của port: không còn chỗ nào trỏ tới. Mẫu trong code (`PresetKey` 'bibi'/'bibe') không đổi.
- **[ĐỔI HÀNH VI] journal: Mục lục và Dàn trang gộp vào Trang chủ** (`ConfigTree.tsx`, `blogSite` không còn `toc`/`cards`).
  Trang chủ journal = Nội dung tĩnh (trang chủ) → "Nội dung tĩnh · Mục lục" (`renderCopy('index')`) → "Danh mục trang con": cây
  chủ đề (subject + mục con thụt vào), kéo thả như Mục lục cũ, không còn ⋮ xoá và "+ Thêm subject" (thêm/xoá ở Biên tập ›
  Chuyên mục). Mỗi dòng: "Cài đặt giao diện" (bấm dòng cũng mở) = Hiện trên menu/Hiện ở trang chủ (`NavFlags`) + dàn trang mà
  trang chủ đề mượn (`moduleOfTopic`: `findPage` rồi module trùng id/alias) + nội dung tĩnh của Ghi; "Chọn nội dung" → Biên tập
  › Chuyên mục mở đúng chủ đề (`sentTopic`), nơi giờ có mục "Chọn nội dung" = Quy tắc liệt kê/Thứ tự/cài đặt riêng
  (`NodePage`/`PageEditor` prop `selectionOnly` ẩn Giao diện và Nội dung tĩnh).
- Dàn trang `ghi02` (Ghi 02, không chủ đề nào mượn) chuyển sang màn practice, mục "Giao diện". Ngoài nó, 6 dàn trang còn lại
  đều gắn chủ đề (đối chiếu `modules` với `page_overrides.aliases` qua REST, chỉ đọc).
- Trình duyệt (tab riêng, chặn lệnh ghi): thanh bên journal chỉ còn Trang chủ; 3 mục như trên, 18 dòng; mở giao diện bean
  weirdo hiện công tắc + dàn trang "a bean weirdo"; "Chọn nội dung" → `/ad-taxonomy`, chủ đề bean weirdo, có Quy tắc liệt kê;
  practice có "Giao diện". Không lệnh ghi nào.
- **[ĐỔI HÀNH VI]** journal › Trang chủ: hai mục đổi tên "Nội dung Trang chủ", "Nội dung Trang mục lục"; bỏ dòng tiêu đề lặp bên
  trong ("Trang chủ — landing", "Mục lục" trong `pageCopy`, `screens/Cms.tsx`).
- **[ĐỔI HÀNH VI]** "Danh mục trang con" giờ chỉ gồm trang đang hiện trên thanh bên journal, đúng thứ tự và tên của thanh bên
  (`flattenTree(buildTree(indexModules(pages)))`, cùng nguồn với `Sidebar`), số bài theo `postsOf`. Kéo thả vẫn đổi thứ tự cây
  chủ đề; chủ đề không hiện được nối vào cuối `order`. ⋮ = "Gỡ khỏi trang" (công tắc Hiện trên menu = tắt, qua `saveNavFlag`
  tách từ `NavFlags`, `PageSettings.tsx`; không xoá chủ đề). "Thêm nội dung": Trang có sẵn = các chủ đề đang không hiện (chọn →
  bật lại), Trang mới = "Tạo chủ đề ở Chuyên mục" → Biên tập › Chuyên mục với ô thêm mở sẵn (`sentNew`).
- Trình duyệt (tab riêng, chặn lệnh ghi): 7 dòng a bean weirdo · roasting 101 · sensory · biochemistry 101 · fermentation · tư
  duy tư duy · ghi, khớp thanh bên; "Gỡ khỏi trang" ở fermentation → một `PATCH /api/tags?vocab=pages&id=nav`; Thêm nội dung
  liệt kê 11 chủ đề đang ẩn; "Tạo chủ đề ở Chuyên mục" → `/ad-taxonomy`, ô thêm mở.
- **[ĐỔI HÀNH VI]** Ô ảnh của nội dung port (`ImageField`, `PortEditors.tsx` — khối port ở Thanh menu, Ảnh hẹp/Ảnh chính của
  about) vẽ như ô ảnh của journal (`ImageSlot`, `screens/Cms.tsx`): ảnh 16:9 rộng tối đa 360px, rồi "đổi ảnh/tải ảnh lên · đặt vào
  khung · dán link · ✕". Khung cắt vẫn tự do (`useCropping`) như trước; huỷ khung không lưu. Khung ngoài là `div`, không phải
  `label` của `Field`. Trình duyệt: bizops hiện ảnh + 4 lệnh; "đặt vào khung" mở hộp "Ảnh", Esc đóng; "dán link" mở ô; không
  lệnh ghi nào.
- **[ĐỔI HÀNH VI] Biên tập › Template** (mới, `/ad-templates`; `CmsTab` 'templates', `routeWords.adTemplates`, `AdminShell`
  `CONTENT_LISTS`, `Cms.tsx`, `RoutesPanel`): danh sách 6 khuôn bài (`POST_TEMPLATES`) kèm số bài dùng (mọi trạng thái trừ thùng
  rác, `listPosts('all')`). Mở một khuôn: danh sách bài dùng nó (mới sửa trước), xem trước bên phải là bài đã đăng mới nhất;
  bấm một bài đã đăng khác thì xem trên bài đó ("đang xem"). Xem trước theo id bài (`/p/<id>`) vì sổ địa chỉ công khai chỉ có
  bài đã đăng, slug tính ở admin có thể khác. Khuôn không xoá được.
- Trình duyệt (tab riêng): thanh bên Biên tập có Template; Article 2 · Cards 2 · Report 1 · Long-form 13 · Memo 1 · Bitesize note
  14 bài; Long-form xem trước pt.2, bấm pt.1 → xem pt.1. Chỉ đọc.
- Thứ tự khối trên trang chủ vẫn theo thứ tự port trên Thanh menu (`featuresFollowingMenu` khi kéo).
- Trình duyệt (chặn lệnh ghi): Trang chủ chỉ còn Nội dung trang, Thanh menu; "Cập nhật nội dung" ở bizops mở Hiện ở trang chủ ·
  Nhãn "beæn bizops" · Ảnh; sửa nhãn → một `PATCH /api/site` `portfolio.home.features`; "Xem dàn trang" ở beæn weirdo → port
  archives › port #2: bean. Không ghi gì thật. `npm test` 884/884 (API 3001 tắt), `vite build` OK.

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
