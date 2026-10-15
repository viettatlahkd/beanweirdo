# Khung cắt ảnh dùng chung, và ô ảnh trong màn sửa vẽ đúng tấm ảnh

Nhánh: `claude/project-thread-ey2sz1`, cắt lại từ `origin/main` @ `8dfe87a`.
PR: #20.

Nối tiếp ghi chú `2026-09-19-nut-tai-anh-o-goc-o-anh.md` (PR #15, đã merge @
`a53377b`). Ghi chú ấy nói về chỗ **bấm** để tải ảnh; ghi chú này nói về chuyện
sau khi bấm.

Vẫn là thư mục `docs/inbox/template/`, vẫn chạm `packages/post-renderer` — thứ
`CLAUDE.md` xếp vào lane Kiến trúc. Không đụng `Cms.tsx`, `RoutesPanel.tsx` hay
`siteMapRows.ts` (ba tệp lane ấy vừa viết lại ở PR #16); có đụng
`frontend/src/design/Button.tsx` **chỉ ở chỗ gọi**, không sửa tệp ấy.

---

## [SỬA LỖI] Ô ảnh cố định vẽ ảnh mà không đọc điểm căn

**Tái hiện:** mở một bài article trên `/ad-post`, tải một ảnh dọc vào ô "ảnh
chính". Trong màn sửa ô ấy hiện ra một mảng nhoè; bấm "xem trước" thì cùng tấm
ảnh ấy hiện đúng. Chủ site chụp lại đúng cặp ảnh này.

**Nguyên nhân, chỉ được:** `coverStyle` trong `frontend/src/lib/imageFocus.ts`
là chỗ duy nhất biết đọc `#focus=x,y` và đặt `background-position`. Chú thích
đầu tệp viết "everything that draws an uploaded image goes through here" —
không đúng. Sáu chỗ tự viết `backgroundImage` bằng tay, giữ `backgroundSize:
'cover'` nhưng **không có** `background-position`, nên CSS lấy mặc định `0% 0%`
tức neo vào góc trên-trái:

- `packages/post-renderer/src/Article.tsx` — `heroPlate`, `platePrimary`,
  `plateSecondary`, `detailPlate`, và ô ảnh của từng phần trong `sections`.
- `packages/post-renderer/src/Bitesize.tsx` — ô phương tiện và `subBox`. Hai ô
  này có `backgroundPosition: 'center'` ghi cứng, tức bỏ qua điểm căn chứ không
  phải quên.
- `packages/post-renderer/src/elements/media.tsx` — khối `image` của kho dùng
  chung.
- `ImageBlockEditor` trong `frontend/src/admin/screens/Editor.tsx` — ô thả ảnh.

Lý do cấu trúc: hàm nằm ở `frontend/src/lib/`, mà gói `post-renderer` không
import từ `frontend/` được. Khuôn bài không với tới được thì nó tự vẽ.

**Đã sửa:** `git mv` hàm sang `packages/post-renderer/src/focus.ts`.
`frontend/src/lib/imageFocus.ts` ở lại làm cửa xuất lại, nên 24 chỗ gọi trong
app không phải sửa. Thêm `fillStyle(url, tint)` gộp hai nhánh "có ảnh thì vẽ
ảnh, không thì vẽ mảng màu" vào một chỗ, và sáu chỗ trên gọi nó.

`fillStyle` chỉ dùng thuộc tính dài, không dùng lối rút gọn `background`:
jsdom bỏ im lặng `background: url(...) center/cover`, nên một ô mất ảnh vẫn qua
được bài kiểm. Chú thích trong `Bitesize.tsx` đã ghi điều này từ trước; nay nó
nằm ở `focus.ts` cho cả sáu chỗ.

**Cố ý không đổi:** khung ảnh của long-form (`Longform.tsx`, hai chỗ `b.k ===
'fig'` và `a.k === 'fig'`) dùng `backgroundSize: 'contain'` — cả tấm ảnh nằm
gọn trong khung trắng, không cắt gì, nên điểm căn vô nghĩa. Chỉ thêm
`stripFocus` để địa chỉ tải về không mang đuôi `#focus=`.

**Bài kiểm:** `frontend/src/admin/screens/Editor.plates.test.tsx`, nhóm *"ô ảnh
trong màn sửa vẽ đúng tấm ảnh, đúng điểm căn"* — dựng `EditorCanvas` thật cho
article với `plate_images` có `#focus=`, khẳng định `background-position` khớp
và địa chỉ tải về không còn đuôi.

**Đối chiếu bộ luật:** đây là **15.3** ("Ảnh tải lên luôn phủ kín ô và cắt phần
thừa… Mặc định căn giữa; người dùng có thể co kéo đặt lại điểm neo"). Luật đã
có từ trước và mã không làm đúng, nên là *sửa lỗi* — specs **không đổi**.

## [SỬA LỖI] Chỉ ảnh bìa mở khung đặt ảnh, các chỗ đăng ảnh khác thì không

**Tái hiện:** tải ảnh vào ô "ảnh chính" của article — ảnh vào thẳng, không hỏi
gì. Tải ảnh bìa qua thanh đầu khung sửa — hiện khung đặt ảnh. Chủ site: *"tất
cả các chỗ đăng ảnh thống nhất là đều hiện cái toast"*.

**Nguyên nhân, chỉ được:** `setHero` trong `frontend/src/admin/screens/Editor.tsx`
gọi `setFraming(url)` sau khi tải xong. `PlateImageUpload` trong
`frontend/src/admin/components/PlateUpload.tsx` gọi thẳng `onUrl(url)`. `setSub`
gọi thẳng `saveSub(url)`. `handleFile` trong `ImageBlockEditor` gọi thẳng
`onChange({ imageUrl: url })`. Một chỗ có, ba chỗ không.

**Đã sửa:** `frontend/src/admin/components/framing.tsx` — mới. `FramingProvider`
dựng đúng **một** hộp thoại cho cả màn; `useFraming()` trả một hàm
`frame({ url, name, ratio, previews })` trả về `Promise<string>` là địa chỉ đã
kèm điểm căn. Chỗ đăng ảnh `await` nó, không tự dựng hộp thoại nào.

`Editor` bọc `EditorContent` trong `FramingProvider`. Bốn chỗ đăng ảnh đi qua
nó: `setHero`, `setSub`, `PlateImageUpload` (tức cả mười một ô ảnh cố định trên
sáu khuôn), và `handleFile` của `ImageBlockEditor`. State `framing` cũ và khối
`<FocusPicker>` viết tay trong JSX của `EditorContent` đã bỏ.

`ModuleImages.tsx`, `FeatureCellsEditor.tsx` và `Cms.tsx` vẫn gọi `FocusPicker`
trực tiếp bằng state riêng — **không đụng tới**. Chúng đã mở hộp thoại rồi nên
không nằm trong lỗi này, và `Cms.tsx` là tệp lane Kiến trúc vừa viết lại.

**Hình dạng khung lấy ở đâu:** `cellRatio` trong `PlateUpload.tsx` đo
`getBoundingClientRect()` của chính ô ảnh — lần ngược từ nút lên
`[data-plate-corner]` rồi `offsetParent`, mà `offsetParent` đúng là ô ảnh vì
mọi ô ảnh cố định là mốc toạ độ của chính nó (`plateHost`, hoặc sẵn `absolute`
như hero của article). Đo chứ không tra bảng: thêm một khuôn bài hay đổi dàn
trang một khuôn đã có thì không kéo theo một bảng tỉ lệ phải giữ cho khớp.
`ImageBlockEditor` đo ô thả ảnh của chính nó. Ảnh bìa và ô phụ của bitesize
dùng tỉ lệ ghi trong mã (`172/130`, `4/5`) vì chúng không có ô nào trên màn để
đo.

**Clip không mở hộp thoại:** `FramingProvider` gọi `looksLikeVideo` và trả
thẳng địa chỉ. Khung cắt vẽ bằng `background-image`, clip không vẽ kiểu ấy
được. Đây là hành vi cũ của `setHero`, nay áp cho mọi chỗ.

**Huỷ là huỷ việc căn, không phải huỷ tấm ảnh.** `onCancel` trả về đúng địa chỉ
đưa vào; ảnh đã tải lên vẫn ở lại ô.

**Bài kiểm:** `frontend/src/admin/components/framing.test.tsx` — 4 bài, đi qua
đường `PlateImageUpload` thật.

**Đối chiếu bộ luật:** đây là **15.4** ("Tải ảnh lên xong thì mở ngay màn đặt
ảnh vào khung, với khung đúng hình dạng ô trên trang công khai"). Cũng là luật
đã có mà mã không làm đúng — specs **không đổi**. Vế "khung đúng hình dạng ô"
trước nay cũng sai: ảnh bìa mở khung `172/130` là hình cắt ở danh sách module,
không phải hình của ô trên trang bài; chỗ này giữ nguyên vì bày kèm cả hai ô
xem trước, và đổi nó là một việc khác.

## [ĐỔI HÀNH VI] Khung cắt ảnh vẽ lại: cả tấm ảnh, phần bỏ đi bị làm mờ

Chủ site: *"tôi không thích toast kiểu này. làm toast kiểu telegram cắt ảnh các
thứ ấy được không"*.

**Trước:** `FocusPicker` bày tấm ảnh **đã cắt sẵn** — ô trên màn đúng hình dạng
ô đích, `background-size: cover`, kéo thì ảnh chạy phía sau. Nhìn thấy gì là
giữ đúng ngần ấy; phần bị bỏ đi không có trên màn hình.

**Sau:** bày **cả tấm ảnh** (`contain`), phần bỏ đi bị phủ một lớp mờ, hình chữ
nhật sáng có lưới một phần ba là phần giữ lại. Kéo hình chữ nhật, hoặc bấm nút
căn sát mép. Tiêu đề đổi từ "Đặt ảnh vào khung" thành "Chọn phần ảnh giữ lại".

Phép tính đổi theo: trước đo ảnh tràn ra ngoài khung bao nhiêu (`overX`,
`overY`), nay đo khung còn chạy được trong ảnh bao nhiêu (`frameW`, `frameH`,
`spareX`, `spareY`) — và dấu không còn đảo, vì thứ đang kéo là khung chứ không
phải ảnh.

Những thứ **giữ nguyên**: `AlignRow` (sáu nút căn sát mép, chỉ bật trục thật sự
chọn được), các ô xem trước khung khác, phím Esc, và mô hình dữ liệu
`#focus=x,y`.

**Không có zoom.** Zoom phải cất riêng cho từng khung và phải được mọi ô vẽ ảnh
áp dụng, mà các ô vẽ bằng `background-size: cover` — CSS không diễn đạt được
"phủ kín, rồi gần thêm một chút" nếu không biết hình dạng từng ô. Đếm được 24
chỗ gọi `coverStyle` cộng 16 chỗ vẽ nền thô; đổi hết sang `<img>` +
`object-fit` + `transform` là một việc khác, lớn hơn việc này.

Nút Huỷ/Xong nay dùng `Button` của `frontend/src/design/Button.tsx` thay cho
`Hover` + style nội tuyến, và bán kính bo lấy từ hằng `radius` trong
`frontend/src/design/controls.ts` (không ghi số vào CSS —
`frontend/src/design/Button.test.tsx` bắt buộc `admin.css` chỉ có đúng một giá
trị bán kính).

**Bài kiểm:** `frontend/src/admin/components/FocusPicker.test.tsx` — 10 bài.
Số đo tính bằng phần trăm của chính tấm ảnh nên không phụ thuộc bề rộng hộp
thoại, điều kiện để kiểm được gì cả trong jsdom (ở đó mọi thứ rộng 0).

**Đối chiếu bộ luật:** **15.3** nói "người dùng có thể co kéo đặt lại điểm neo"
— vẫn co kéo được, chỉ khác thứ đang co kéo. Không luật nào trong `logic.ts` mô
tả hình dáng hộp thoại này. Không luật nào bị bản sửa này làm sai.

## Bảng, cột và endpoint đã đụng

Không thêm, không đổi cột nào. Không thêm migration nào.

- **`POST /api/upload`** — dùng lại y nguyên, qua `uploadImage` sẵn có.
- **`PATCH /api/posts/:id`** — dùng lại y nguyên. Cột `plate_images` đã thêm ở
  PR #15 (migration `0027`, chủ site đã chạy trên database thật 2026-09-19).
- **Không đọc thêm cột nào**, không đụng `LIST_COLUMNS` trong
  `frontend/src/data/usePublishedPosts.ts`.

Điểm căn đi kèm địa chỉ ảnh dưới dạng `#focus=x,y`, mà mảnh sau `#` không bao
giờ gửi lên máy chủ — nên không có chỗ nào phải cất thêm.

## Chưa nhìn tận mắt

Đo bằng `npm test` (131 tệp, 1350 bài, xanh) và `vite build`. Phiên từ xa dựng
được app nhưng `/ad-post` nằm sau cổng đăng nhập, nên **chưa ai mở trình duyệt
xem**. Ba chỗ đáng nhìn trước khi merge:

1. Lớp mờ ngoài khung vẽ bằng `box-shadow: 0 0 0 9999px` trên chính khung, ăn
   theo `overflow: hidden` của ô ảnh. jsdom không vẽ nên bài kiểm không nói gì
   về nó.
2. `cellRatio` đo ô ảnh lúc bấm nút. Ô hero của article đổi từ `absolute` sang
   `relative` ở bản điện thoại — `offsetParent` vẫn là nó, nhưng chưa ai xác
   nhận bằng mắt.
3. Hộp thoại cao tối đa `52vh` cho phần ảnh. Ảnh rất dọc trên màn thấp thì phần
   ảnh co lại, chưa đo trên màn thật.

## Đề xuất luật

Một điều, để riêng ở đây chứ không tự ghi vào `logic.ts`:

Nhóm 15 nên có một câu nói rằng **khuôn bài không được tự vẽ ảnh tải lên** —
mọi ô phải đi qua `fillStyle`. Hai lỗi trên đều mọc ra từ chỗ ấy, và luật 15.3
hiện nói về kết quả ("phủ kín ô, cắt phần thừa, căn giữa") chứ không nói về
đường đi, nên một ô mới viết tay vẫn đọc như đang tuân thủ.

## Đã trao đổi với lane Thiết kế

Lane Thiết kế đang dựng `NewPostDialog` (PR #19) — cũng là một lớp phủ. Hai bên
đã so và thống nhất:

- **Vỏ nổi dùng chung để PR sau, không nhét vào #19.** Lý do họ đưa ra: hiện
  mới có một chỗ dùng, tách component từ một chỗ dùng là đoán. Khi #19 vào
  `main` họ tách vỏ ra tệp riêng rồi báo tên; `FocusPicker` đổi sang dùng nó ở
  PR sau của lane này.
- **Viền hộp đã đổi sang `ink.border`.** PR #19 merge trong lúc PR này còn mở,
  token `ink.border` (`#5A4632`) vào `main` @ `8dfe87a`, nên ba chỗ viền trong
  `FocusPicker.tsx` — vỏ hộp, nút căn sát mép lúc tắt, ô xem trước khung khác —
  đã lấy theo nó. `paper.rule` không còn chỗ nào trong tệp.
- **Màu nền lớp phủ vẫn khác của họ, cố ý.** `NewPostDialog` dùng
  `rgba(35,33,26,.38)`; hộp này dùng `rgba(18,16,12,.78)`, đậm hơn hẳn, vì việc
  của nó là bày một tấm ảnh — nền sáng thì mắt không đọc được đâu là phần ảnh
  bị làm mờ. Khi tách vỏ chung, độ đậm nền nên là tham số chứ không phải một
  hằng.
- **Nghe `pointerdown` chứ không nghe `click`** để đóng ra nền: bôi đen chữ
  trong hộp rồi thả chuột ra ngoài cũng đếm là một `click` trên nền, và như vậy
  là đóng mất hộp đang dùng. Lane Thiết kế đã vấp chỗ này.
- Đã thêm theo góp ý của họ: khoá `document.body.style.overflow` khi mở và trả
  lại **đúng giá trị cũ** khi đóng (không đặt về `''` — màn sửa có thể đang tự
  khoá cuộn vì việc khác), cộng `role="dialog"`, `aria-modal="true"`,
  `aria-label` và `focus()` vào vỏ khi mở.
- Esc chồng nhau khi hai lớp cùng mở: hiện không có đường nào mở hộp này từ
  trong hộp kia, nên chưa cắn. Vỏ chung sẽ xử một lần bằng một ngăn xếp, chỉ
  lớp trên cùng nghe Esc.
