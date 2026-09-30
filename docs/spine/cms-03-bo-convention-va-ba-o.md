# Bỏ trang System conventions, và ba ô chữ không ai sửa

- Nhánh: `claude/project-thread-vvnk0a`
- PR: #18
- Lane: kiến trúc

Chủ site yêu cầu 2026-09-19 14:09: xoá `/ad-convention` "cả UI các thứ luôn",
và bỏ ba ô `Chữ khu quản trị`, `Tên ba khu`, `Trang Lưu trữ` khỏi lưới Cấu hình,
"bỏ cả logic nếu có".

## Đã đổi những gì

**[ĐỔI HÀNH VI] Trang System conventions không còn.** Xoá
`frontend/src/screens/Logic.tsx`, mục `logic` trong `frontend/src/content/navItems.ts`,
hàm `interpolateNav` trong cùng tệp ấy (chỉ `Logic.tsx` gọi), `goLogic` và
`'logic'` trong `frontend/src/lib/nav.tsx`, nhánh `logic` trong
`frontend/src/App.tsx`, `Sidebar.tsx:goOf`, hai nhánh `logic` trong
`frontend/src/lib/crumbs.ts` (`buildCrumbs` và `crumbBack`), `'logic'` trong
`AREA_SCREENS` của `frontend/src/lib/area.ts`, và cặp
`adminPages` / `screenPage` trong `frontend/src/lib/routes.ts`. Từ `adConvention`
bị bỏ khỏi `RouteWords`, `DEFAULT_WORDS`, `WORD_LABELS` và nhóm `MUST_DIFFER`.

- Trước: `/ad-convention` mở màn `Logic`, và sidebar có một dòng
  `System conventions` trong khu Admin.
- Sau: `/ad-convention` không khớp gì nữa; `readPath` rơi vào nhánh cuối của khu
  quản trị nên nó mở `/ad`. Không có lỗi 404 nào vì bảng địa chỉ này không có
  404: địa chỉ lạ rơi về trang đầu.

**Tệp `frontend/src/content/logic.ts` KHÔNG bị xoá.** Nay không tệp nào import
nó. Tôi giữ lại vì hai lý do, không phải vì quên: nó là tệp của **lane tài
liệu**, và mọi ghi chú bàn giao trong `docs/` đang trích dẫn nó theo `nhóm.số`
— xoá là bộ luật đánh số của cả nhóm mất chỗ neo. Chủ site đã được báo; nếu
chủ site muốn xoá nốt thì đó là một commit riêng, và lane tài liệu phải biết.

**[ĐỔI HÀNH VI] Ba ô rời khỏi lưới Cấu hình**, cùng với trường dữ liệu của
chúng trong `frontend/src/content/site.ts`:

| Ô | Trường bỏ đi | Chỗ trước đây vẽ ra chữ ấy |
|---|---|---|
| Chữ khu quản trị | `artT1` `artT2` `artIntro` | **không ở đâu cả** — xem bên dưới |
| Chữ khu quản trị | `logicTitle` `logicIntro` | `Logic.tsx`, vừa xoá |
| Chữ khu quản trị | `cmsTitle` `cmsIntro` | tiêu đề của chính màn CMS |
| Tên ba khu | `sections` | `Sidebar.tsx`, `crumbs.ts` |
| Trang Lưu trữ | `archiveTitle` `archiveNote` | `Archive.tsx` |

**[SỬA LỖI] `artT1` / `artT2` / `artIntro` là ba trường chết thật.** Chúng có ô
sửa trong CMS, có giá trị mặc định trong `SITE_DEFAULTS`, nhưng
`grep -rn "artT1\|artT2\|artIntro" frontend/src --include=*.tsx` chỉ trả về
đúng ba dòng trong `Cms.tsx` — tức là ba ô nhập, không có chỗ đọc. Màn
Design system mà chúng đặt tiêu đề cho thì không tồn tại trong
`frontend/src/screens/`. Ghi rõ chỗ này vì một ghi chú cũ của tôi từng nói
ngược lại.

Những trường còn lại **đang vẽ chữ thật**, nên chúng không bị xoá mà bị **viết
cứng vào mã**, đúng như lối đã làm với bộ từ đường dẫn ở PR #16:

- `sections` → hằng `SECTION_NAMES` xuất từ `frontend/src/content/site.ts`.
  `Sidebar.tsx` (ba chỗ `SectionLabel`) và `crumbs.ts` (`buildCrumbs`, hằng
  `admin`) đọc hằng ấy. Tham số `sections` của `buildCrumbs` bỏ luôn, nên
  `Breadcrumbs.tsx` không còn gọi `useSiteCopy`.
- `archiveTitle` → chuỗi `Archive` ngay trong `Archive.tsx`;
  `archiveNote` → `sắp theo thời gian` ngay dưới nó. `Archive.tsx` không còn
  gọi `useSiteCopy`.
- `cmsTitle` / `cmsIntro` → viết thẳng trong phần đầu của `Cms.tsx`. Câu dẫn
  đổi từ "Sơ đồ toàn bộ trang và khu vực biên tập nội dung" thành "Mọi thứ
  trong khu quản trị: bài viết, và cấu hình của trang", vì sơ đồ trang đã bỏ ở
  PR #16 nên câu cũ nói về một thứ không còn.

**Hệ quả gọn thêm:** `SiteCopy` không còn trường nào có hình dạng riêng, nên
`siteValue` bỏ được nhánh đặc biệt cho `sections`, và `SiteOverrides` trở lại
`Partial<SiteCopy>` thay vì `Partial<Omit<SiteCopy, 'sections'>> & {…}`. Nút
`Trả về nội dung gốc…` cũng bỏ được `.filter((k) => k !== 'sections')`.

Lưới Cấu hình nay còn năm ô: Trang chủ · Cây module · Trang mục lục · Tag ·
Trang Ghi chép.

## Bảng, cột, endpoint đã đụng

**Không có DDL, không có migration.** Chữ của trang nằm trong một khối JSON ở
hàng `site_settings`, đọc ghi qua `GET`/`PATCH /api/site` như cũ. Bỏ một trường
khỏi `SiteCopy` không xoá gì trong cơ sở dữ liệu: khoá cũ (`artT1`,
`logicTitle`, `sections`…) vẫn nằm trong khối ấy và từ nay không ai đọc. Nếu
chủ site muốn dọn nốt trong dữ liệu thì đó là một câu `PATCH` gửi `null`, làm
riêng, và phải hỏi trước vì là dữ liệu thật.

## Test

`npm test`: 128 tệp, 1328 bài xanh, 2 bỏ qua. `vite build` chạy được.

Sửa theo: `routes.test.ts` bỏ `{ screen: 'logic' }` khỏi danh sách đi-một-vòng;
`area.test.ts` đổi câu kiểm `'logic'` sang `'archive'`; ba tệp `crumbs.*.test.ts`
bỏ tham số `SECTIONS` khi gọi `buildCrumbs`, và `crumbs.reach.test.ts` đổi vòng
lặp `['logic']` sang `['archive']` — `crumbBack` của `archive` cũng trả
`nav.goCms`, nên bài kiểm "← trong khu quản trị không nhảy ra trang công khai"
vẫn còn người canh.

## Đối chiếu bộ luật

Đây là chỗ phải nói thẳng: **bản sửa này làm cả `frontend/src/content/logic.ts`
mất chỗ hiện ra.** Bộ luật vẫn còn nguyên trong mã và vẫn trích dẫn được, nhưng
không còn trang nào vẽ nó, nên nó thành tài liệu chỉ đọc được trong repo. Đó là
thay đổi lớn với lane tài liệu, không phải việc lane kiến trúc tự quyết — chủ
site yêu cầu xoá trang, tôi xoá trang và giữ tệp.

Luật 05 có nhắc "System conventions, rule 05" trong chú thích đầu
`frontend/src/lib/crumbs.ts`. Tôi **không** sửa chú thích ấy: nó trỏ tới bộ
luật, không trỏ tới trang, và bộ luật vẫn còn.

## Đề xuất luật (ý kiến, không phải sự thật)

Một trường trong `SiteCopy` chỉ nên tồn tại khi có ít nhất một chỗ đọc nó.
`artT1`/`artT2`/`artIntro` sống sót qua nhiều vòng rà vì chúng **có ô sửa** —
mà ô sửa thì trông y hệt một tính năng đang chạy. Một bài kiểm đối chiếu
`Object.keys(SITE_DEFAULTS)` với các chỗ đọc sẽ bắt được loại này; tôi chưa
viết vì nó là loại test đọc mã nguồn mà nhóm đã chủ ý bỏ.
