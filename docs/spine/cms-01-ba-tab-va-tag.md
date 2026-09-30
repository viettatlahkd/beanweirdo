# spine/cms-01-ba-tab-va-tag · ba tab đặt lại tên và nhiệm vụ, Tag thành danh sách + chi tiết

PR: (điền sau khi mở)   nhánh: claude/project-thread-vvnk0a
base: origin/main @ `dbfe46e` (đã rebase lên bản có PR cụm nút)

Đợt đầu của việc chủ site giao: *"design lại toàn bộ cái trang dài như này nhìn
hơi khó"* cho `/ad-page-content`. Đây **chưa phải bản xong** — xem mục "Chưa
làm" ở cuối.

## Hai điều chủ site nói là chết, mà kiểm ra thì vẫn sống

Chủ site: *"box admin này có còn để làm gì đâu, mục trang lưu trữ cũng thế"*.
Kiểm trước khi đụng:

- **Trang Lưu trữ** — `archiveTitle` và `archiveNote` được đọc ở
  `frontend/src/screens/Archive.tsx`, chỗ `site.archiveTitle` và
  `site.archiveNote`. Route `/ad-archive` còn sống trong `lib/routes.ts`.
- **Box Admin** — `cmsTitle` và `cmsIntro` vẽ ra đúng chữ "Content" và "Sơ đồ
  toàn bộ trang và khu vực biên tập nội dung." ở đầu **chính màn chủ site đang
  chụp**. `artT1`/`artT2`/`artIntro` vẽ trang Design system, `logicTitle`/
  `logicIntro` vẽ trang System conventions.

Nên xoá là mất chỗ sửa chữ đang chạy, không phải dọn rác. **Không xoá ô nào.**
Nhưng lý do chủ site khó chịu thì đúng, nên chữ khu quản trị bị gập lại.

## Đã đổi

- [ĐỔI HÀNH VI] **Khối sửa module rời tab `content` sang tab `map`** —
  `frontend/src/screens/Cms.tsx`, khối mang `id="modules"`, 484 dòng. Chuyển
  nguyên khối, không sửa một dòng JSX nào bên trong; cả hai tab nằm trong cùng
  một component nên mọi closure (`patchModule`, `plateSwap`, `openModule`…)
  vẫn trong tầm.

  Lý do là quan sát của chính chủ site: họ đi tìm ô "Nằm trong" ở **Sơ đồ
  trang** và không thấy. Họ tìm đúng chỗ — đó là màn vẽ cái cây ấy. Sai là ở
  chỗ đặt. Đây cũng là phần lớn lý do tab kia dài: bỏ nó đi thì tab chữ ngắn
  lại gần một nửa.

- [ĐỔI HÀNH VI] **Ba tab đổi tên** — hằng `TABS`. `Tạo bài đăng` → **Bài
  viết** (nó liệt kê và sửa, không chỉ tạo), `Sơ đồ trang` → **Cấu trúc** (nay
  sửa được chứ không chỉ xem), `Sửa nội dung` → **Chữ trên trang**.
  **Đường dẫn không đổi** — `/ad-post`, `/ad-sitemap`, `/ad-page-content` giữ
  nguyên, vì chúng là `k` chứ không phải `t`, và chủ site đang có link tới đó.

- [ĐỔI HÀNH VI] **Chữ khu quản trị gập lại, mặc định đóng** — state `adminOpen`.
  Tiêu đề mục thành một `<button aria-expanded>`, kèm một dòng nói thẳng đó là
  tiêu đề của ba màn quản trị chứ không phải chữ trang công khai. Sáu ô vẫn ở
  nguyên đó, sửa được như cũ.

- [ĐỔI HÀNH VI] **`TagsPanel` dựng lại thành danh sách + chi tiết.** Trước đây
  mỗi tag là một ô nhập nằm thẳng trong danh sách và **rời ô là đổi tên luôn**,
  trên mọi bài đang đeo nó; nút xoá lặp trên từng dòng, nên thứ nguy hiểm nhất
  lại là thứ nhiều nhất trên màn. Nay:
  - Ô tạo tag + nút **"Tạo tag"**. Gõ không tạo gì. Trước đây Enter tạo, và
    rời ô thì huỷ — chủ site: *"giờ cứ điền 1 phát là tạo à?"*
  - Danh sách chỉ để đọc và chọn.
  - Đổi tên và xoá nằm ở khung chi tiết, mỗi lần một tag; đổi tên phải bấm
    **"Lưu tên"**.
  - Luồng "còn thứ đang đeo → chuyển sang tag khác" giữ nguyên, chỉ dời chỗ.

- [SỬA LỖI] `CONTENT_SECTIONS` bỏ mục `modules` (đã sang tab khác) và đổi nhãn
  `Quản trị` → `Khu quản trị`. Bỏ mục mà quên sửa hằng này thì nút mục lục trỏ
  vào hư không — xem mục dưới.

## Một cái bẫy im lặng, nay có test

Lane sửa nút chỉ ra, và đúng: bảy `div id=` trong tab chữ chính là neo của
`ContentIndex`. Hằng `CONTENT_SECTIONS` và các `id` ấy không có gì buộc phải
khớp. Đổi tên hay bỏ một mục mà quên chỗ kia thì **TypeScript không kêu, màn
vẫn dựng, test cũ vẫn xanh** — chỉ có nút trỏ vào `getElementById` trả `null`.

`frontend/src/screens/Cms.sections.test.tsx` dựng màn thật rồi soi DOM, không
đọc mã. **Đã kiểm là không đỗ vống:** thêm một mục ma vào `CONTENT_SECTIONS`
thì nó đỏ, báo đúng `thiếu neo id="khong-ton-tai"`; bỏ ra thì xanh.

`TABS` và `CONTENT_SECTIONS` nay `export`, để test đọc nhãn từ hằng thay vì
gõ lại chuỗi. `Cms.liveValues.test.tsx` trước đó tìm `/sửa nội dung/i` — đổi
tên tab là nó đỏ ngay, đã sửa sang đọc `TABS`.

## Chưa làm, và vì sao

- **Nút Lưu cho các ô chữ còn lại chưa làm** — đang chờ chủ site trả lời một
  câu: nút Lưu áp cho *tất cả* các ô, hay chỉ cho việc *tạo mới*. Hiện tại chỉ
  Tag có nút, vì đó là chỗ chủ site nói thẳng. Các ô chữ khác vẫn tự lưu
  (`field()`, hai lối: nhịp ngắn khi gõ và ngay khi rời ô). Đổi hết sang
  bấm-mới-lưu là thêm một cách mất chữ mới (gõ xong đóng tab), nên không tự
  quyết.
- **Chưa rà hết từng ô** như chủ site yêu cầu (*"rà lại 1 loạt cả cái trang"*).
  Đợt này làm phần cấu trúc; phần soi từng nhãn, từng ô có còn đúng không là
  đợt sau.
- **Tab Cấu trúc giờ có hai thứ cùng nói về module**: sơ đồ cây ở trên (chỉ
  đọc) và khối sửa module ở dưới. Gộp hai cái thành một danh sách bấm-vào-mở
  là việc đáng làm, nhưng nó đụng `tree` và `MapRow` chứ không chỉ là dời chỗ.

## Đụng dữ liệu

- **Không đổi schema, không đổi endpoint, không thêm truy vấn nào.** Các hàm
  API dùng y như cũ: `createTag`, `renameTag`, `deleteTag`, `updateSite`.
- **Chưa ghi gì vào dữ liệu thật** từ phiên này.

## Đối chiếu bộ luật

- Không mâu thuẫn luật nào. Các luật có chữ "tag" trong `logic.ts` (nhóm 11,
  12) đều nói về hệ tag của Practice — tag hoạt động, tag task — không phải
  bảng tag bài viết trong CMS. Đã kiểm từng dòng có chữ `tag`.
- `logic.ts` không có luật nào về tên ba tab hay về chỗ đặt khối sửa module.
- Ba luật nhóm 05 và 01 nêu ở `tree-02`, `tree-03`, `tree-07` **vẫn chưa sửa**;
  đợt này không làm chúng đúng thêm hay sai thêm.

## Kiểm chứng

- `npm test`: **129 file, 1317 test xanh**, 2 skip. `npm run lint` 0 lỗi (còn
  cảnh báo `useEffect` cũ ở `components/ActivityRow.tsx`, có từ trước).
  `npx vite build` xanh.
- Test mới: 3 cho thanh nhảy mục và chỗ đứng của khối module
  (`Cms.sections.test.tsx`), 3 cho Tag (`Cms.tags.test.tsx`) — trong đó hai bài
  chốt đúng điều chủ site đòi: **gõ xong rời ô thì API phải im**, cho cả tạo
  mới lẫn đổi tên.
- **Chưa mở trình duyệt xem.** Phiên này không có `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY`. Đây là thay đổi **nhìn thấy được trên màn hình**,
  nên nó cần chủ site mở `/ad-page-content` và `/ad-sitemap` xem tận mắt trước
  khi tin — nhất là khung Tag hai cột ở màn hẹp.

## Đề xuất luật (chưa ghi vào `logic.ts`)

- Một thao tác tạo hoặc đổi tên thứ mà nhiều nơi khác đang dùng thì phải có
  bước bấm. Rời ô không phải là xác nhận.
- Chỗ sửa một thứ nằm cùng màn với chỗ nhìn thấy thứ ấy.
