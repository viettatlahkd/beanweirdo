# Hai tab gộp thành `Cấu hình`, và một lưới ô thay cho hai cuộn dài

- Nhánh: `claude/project-thread-vvnk0a`
- PR: #16
- Lane: kiến trúc

Chủ site yêu cầu ba việc trong hai tin nhắn 2026-09-19 13:47 và 13:48: gộp
`Cấu trúc` với `Chữ trên trang` và đặt một cái tên cao hơn, bỏ cây sơ đồ chỉ để
đọc, bỏ khối `Đường dẫn`, và thay bố cục dài bằng một nút vào rồi các box bên
trong.

## Đã đổi những gì

**[ĐỔI HÀNH VI] Ba tab còn hai.** `TABS` trong `frontend/src/screens/Cms.tsx`
nay là `posts` và `config`. `CmsTab` trong `frontend/src/lib/routes.ts` đổi từ
`'posts' | 'map' | 'content'` thành `'posts' | 'config'`.

- Trước: `/ad-sitemap` mở tab `Cấu trúc`, `/ad-page-content` mở tab
  `Chữ trên trang`.
- Sau: `/ad-config` mở tab `Cấu hình`. Hai địa chỉ cũ **vẫn đọc được** và cùng
  mở ra tab ấy (`cmsTabs` trong `routes.ts`), nhưng `pageOfTab` không sinh ra
  chúng nữa. Link đã phát ra không chết.
- Thêm một từ `adConfig` (mặc định `config`) vào `RouteWords`, `DEFAULT_WORDS`,
  `WORD_LABELS` và nhóm `MUST_DIFFER` thứ hai trong
  `frontend/src/lib/routeWords.ts`.

**[ĐỔI HÀNH VI] Trong tab `Cấu hình` là một lưới tám ô**, mỗi ô bấm vào mới xổ
phần của nó: `landing` · `modules` · `index` · `tag` · `notes` · `archive` ·
`areas` · `admin`. Danh sách nằm ở hằng `CONFIG_BOXES`; lưới là `BoxGrid`, thanh
quay lại là `BoxHeader`. Ô đang mở giữ trong state `box`, **không** nằm trong
địa chỉ — F5 quay về lưới.

- Trước: hai tab, mỗi tab một cuộn dài; `ContentIndex` là thanh nhảy mục dính
  trên đầu tab chữ.
- Sau: `ContentIndex` và `CONTENT_SECTIONS` không còn; `CONFIG_BOXES` thay chỗ.

**[ĐỔI HÀNH VI] Cây sơ đồ trong tab `Cấu trúc` bị bỏ.** Nó chỉ để đọc, và
những gì nó liệt kê thì sidebar đã bày ra rồi. Cùng với nó, `MapKids`,
`childrenOf`, `moduleRow`, hằng `tree` trong `Cms.tsx` và cả tệp
`frontend/src/lib/siteMapRows.ts` (cùng test của nó) bị xoá.

Nhưng **ba tiêu đề của cây ấy là ô nhập, không phải chữ chết**: chúng ghi
`site.sections.Public/Practice/Admin`, thứ vẽ ra nhãn sidebar
(`Sidebar.tsx`, ba chỗ gọi `SectionLabel`) và chặng đầu của đường dẫn
(`crumbs.ts:buildCrumbs`, tham số `sections`). Ba ô ấy chuyển nguyên vào ô
`areas` của lưới, tên hiển thị `Tên ba khu`. Không có ô ấy thì ba chữ kia thành
không sửa được.

**[ĐỔI HÀNH VI] Khối `Đường dẫn` bị bỏ khỏi màn hình.**
`frontend/src/admin/components/RoutesPanel.tsx` và test của nó bị xoá.

- Phần **nạp** bộ từ vẫn nguyên: `RouteWordsSync` trong `frontend/src/App.tsx`
  vẫn gọi `adoptWords(overrides.routes)`, và `parsePath` vẫn thử
  `pastWords()`. Nghĩa là bộ từ nào đã lưu trong `site.routes` thì vẫn áp dụng,
  và địa chỉ viết bằng bộ từ cũ vẫn mở đúng chỗ.
- Phần **ghi** thì không còn: từ nay đổi một từ trong địa chỉ là sửa
  `DEFAULT_WORDS`, tức là một lần deploy. Đó đúng là điều chủ site yêu cầu
  ("code là được").
- Trường `routes` trong `SiteOverrides` **không bị xoá** khỏi kiểu hay khỏi
  bảng — chỉ là không còn màn nào ghi vào nó.

**[ĐỔI HÀNH VI] Khối `Chữ của khu quản trị` hết gập.** State `adminOpen` bị bỏ;
nó là một ô trong lưới (`admin`), nên việc gập không còn nghĩa gì.

**[SỬA LỖI] Nút `Trả về nội dung gốc…` chỉ hiện ở lưới**, không hiện khi đang
mở một ô. Nó xoá chữ của **mọi** ô, nên đứng trong một ô là nói sai phạm vi.

## Test

`frontend/src/screens/Cms.sections.test.tsx` viết lại: nó dựng `Cms` thật, bấm
từng thẻ trong lưới rồi soi `document.getElementById(<id của thẻ>)`. Chỗ hỏng nó
canh là `CONFIG_BOXES` và các `{box === '…' && …}` viết tay lệch nhau — TypeScript
không bắt được, màn vẫn dựng, chỉ có cái thẻ mở ra màn trống.

Đã kiểm test này **có cắn**: đổi `<div id="areas">` thành `id="areas-BROKEN"`
rồi chạy, test đỏ với câu `thẻ "Tên ba khu" mở ra màn trống`. Đổi lại thì xanh.

Lưới mang `aria-label="Mục cấu hình"` (hằng `GRID_LABEL`) vì "Trang chủ" cũng là
một chặng trên dải đường dẫn ngay phía trên, nên tìm khắp màn thì trúng hai chỗ.

`frontend/src/lib/routes.test.ts` thêm hai khẳng định: `/ad-sitemap` và
`/ad-page-content` vẫn ra `tab: 'config'`.

`npm test` sau thay đổi: 128 tệp, 1326 bài xanh, 2 bỏ qua. `vite build` chạy
được. (Trước là 130 tệp / 1339 bài; chênh lệch là hai tệp test của
`RoutesPanel` và `siteMapRows` bị xoá cùng mã của chúng.)

## Bảng, cột, endpoint đã đụng

Không đụng DDL, không đụng endpoint nào. Vẫn đọc ghi `site` qua `getSite` và
`updateSite` như cũ, trên đúng các trường cũ (`sections`, `routes` và các
trường chữ). Trường `routes` từ nay chỉ còn được **đọc**.

## Đối chiếu bộ luật

Không mâu thuẫn với luật nào trong `frontend/src/content/logic.ts`. Nhóm 05
(đường dẫn ba chặng cố định) và nhóm 01 (viết cứng ba module) vẫn sai như đã nêu
ở `tree-02`, `tree-03`, `tree-07` — bản sửa này không làm chúng đúng hơn cũng
không làm chúng sai thêm.

## Có đụng lane khác một chỗ

Tôi thêm mười hai dòng vào cuối `frontend/src/admin/admin.css` (`.ab-box:hover`
và `.ab-box:focus-visible`), là tệp của lane nút. Thêm mới ở cuối tệp, không sửa
luật nào sẵn có. Lý do không né được: cả thẻ là vùng bấm, mà hover và vòng focus
thì không viết inline được. Nếu lane nút muốn dời chỗ hoặc đổi tên lớp thì cứ
dời, chỗ dùng nằm ở `BoxGrid` trong `Cms.tsx`.

## Đề xuất luật (ý kiến, không phải sự thật)

Một màn quản trị nên có một cách duy nhất để đi sâu vào một chủ đề. Màn này
từng có ba cách chồng lên nhau — tab, thanh nhảy mục, và khối gập — nên cùng một
ô có thể nằm sau hai lớp khác nhau, và chủ site đã không tìm ra ô "Nằm trong" vì
đúng lý do đó.
