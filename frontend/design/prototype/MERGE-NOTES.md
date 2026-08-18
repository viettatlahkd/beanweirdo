# Merge notes — Coffee Study Blog v4

Gửi backend: **chỉ đọc phần này**, không cần sync lại toàn bộ file HTML.
Bản trước đã export chỉ có: sidebar tĩnh, các trang Public/Practice, ba template (Article / Field report / Info cards), và trang Content ở mức sửa tên module + danh sách bài.

Dưới đây là toàn bộ thay đổi so với bản export đó, nhóm theo vùng ảnh hưởng.

---

## 1. Nguồn dữ liệu (quan trọng nhất khi merge)

Toàn bộ nội dung do admin sửa nằm trong **một** khoá localStorage:

```
cs_cms_v1 = { cms: Module[], site: SiteVars }
```

`Module`
```
id, title, accent, on,            // đã có
layout        'band' | 'specimen' | 'sequence'
concept, blurb                    // blurb = giới thiệu ngắn (Mục lục)
long                              // MỚI — mô tả dài (Trang chủ + đầu trang module)
treatment, layoutNote             // MỚI — hiện ở Design system
shot1, shot2, shot3               // MỚI — chú thích ảnh
entries: Entry[]
```

`Entry`
```
n      '01'…   // KHÔNG phải id — hệ thống tự đánh lại theo thứ tự hiển thị
en     tiêu đề bài  (nguồn duy nhất, xem §4)
vi     sapo         (rỗng = dùng auto summary)
date, kind
tpl    'longform' | undefined     // MỚI — bài dùng template nào
```

`SiteVars` — các khoá MỚI:
```
sections   { Public, Practice, Admin }        // tên 3 nhóm sidebar
bwText, bwGlyph, bwColor, bwScale, bwImg     // text art tên thương hiệu
plateImg1..3                                  // ảnh Mục lục (dataURL)
artT1, artT2, artIntro                        // heading trang Design system
logicTitle, logicIntro                        // System conventions
cmsTitle, cmsIntro                            // Content
archiveTitle, archiveNote                     // Archive
```

Khi làm API: giữ đúng shape này, `n` sinh ở phía render (không lưu như khoá bền).

---

## 2. Trang Content (admin) — mở rộng nhiều

- Kéo thả để đổi thứ tự **module** và **bài** (bỏ nút ↑↓). Sau mỗi lần đổi, `n` của bài được đánh lại từ trên xuống.
- Sửa được **tên 3 section** (Public / Practice / Admin) ngay đầu mỗi nhóm → sidebar và breadcrumb đổi theo.
- Mỗi module thêm ô: mô tả dài, treatment, ghi chú dàn trang, 3 chú thích ảnh, chọn dàn trang.
- Khối **Text art** — khai báo tên thương hiệu một chỗ: tên, chữ nhấn, màu, cỡ, hoặc tải ảnh thay chữ.
- Khối **Admin** ở cuối: sửa tiêu đề + đoạn dẫn của Design system, System conventions, Content, Archive.
- Tải ảnh: ảnh Mục lục và ảnh wordmark có preview thumbnail + nút xoá.

## 3. Sidebar & điều hướng

- Ba template (Article / Field report / Info cards / Memo) tụt xuống **một cấp** dưới mục cha `Templates`.
- Content chuyển lên **đầu** nhóm Admin.
- Bộ ký hiệu vẽ lại để phân biệt được: trang giấy / vòng tròn / hình thoi / thanh dẹt; Ghi 02 dùng cánh hoa màu `#C25C7C`.
- Wordmark ở sidebar dùng chung cấu hình Text art (chữ nhấn phóng to + đổi màu), 15 dải breadcrumb cũng vậy.

## 4. Mapping nội dung (điểm cần backend chú ý)

- Tên trang trong System conventions viết bằng **token** `[[notes]] [[hours]] [[cards]] [[report]] [[article]] [[archive]] [[landing]] [[home]] [[cms]] [[secPublic]] [[secPractice]] [[secAdmin]]` — resolve tại render từ nhãn sidebar. Đổi nhãn là mọi câu quy tắc tự đổi.
- Bài long-form: **tiêu đề, sapo, ngày, module** đều đọc từ `Entry` trong `cs_cms_v1`. Thẻ ngoài trang module, breadcrumb, và tiêu đề trong bài dùng cùng một giá trị.
- Sapo: rỗng thì **tự tóm tắt** từ đoạn mở đầu của bài (một câu ngắn); có giá trị thì ưu tiên bản sửa tay.
- Ghi 01: xếp theo thời gian mới → cũ, bài **ghim** luôn nổi lên đầu.

## 5. Template mới

- **Memo** (`sc: 'taste'`) — khung ghi nếm thử. Một trang, hai lối vào: từ Templates (có nhãn "bài mẫu") và từ Ghi 01 (bài chính thức).
- **Long-form** (`sc: 'longform'`) — hệ bài siêu dài, nội dung đọc từ `longform.js` (mảng block đã parse sẵn từ Notion export):
  - toggle theo tiêu đề cấp 1 và 2, hai nút cố định *THU GỌN / XEM TẤT CẢ* ở mục lục nổi;
  - mục lục nổi bên phải: hover để mở, trôi lên khi cuộn sâu, nền gradient không viền;
  - hộp **Ghi chú** màu xanh mòng, mở sẵn, có +/− để thu;
  - thang chữ: title 70px → h1 42px → h2 27px → h3 20px → h4 12px.
  - Ảnh: `assets/longform/*.png`.

## 6. System conventions — các quy tắc mới ghi vào

Thứ tự Ghi 01 (thời gian + ghim), thứ tự hiển thị Content (trang chính trước, trang con sau), quy tắc text art tên thương hiệu, nhất quán khối tiêu đề giữa các template (không đặt ngày tạo/tác giả ở trang đọc), tiêu đề bài khai báo một chỗ, sapo tự động ← → sửa tay.

---

## 7. Bài đăng chính thức vs. bài mock-up

Điểm này backend cần đọc kỹ: **phần lớn bài đang thấy trong design là mock-up**, chỉ để minh hoạ cách một bài hiển thị trong module và trong template. Không coi chúng là nội dung thật.

Không đặt tên trường hay giá trị trạng thái ở phía design — phần này đã có trên DB/BE, cứ dùng đúng cái đang có để tránh conflict. Phía design chỉ cung cấp danh sách phân loại:

**Bài thật, đã hoàn thiện, có thể public:**

- `biochem` › **Lipids in Beans** (template long-form)
- `sensory` › **Sensory Lexicon** (template info cards)
- Ghi 01 › **taste modality: sơn la** (template memo, đang ghim)

**Còn lại:** toàn bộ bài khác trong mọi module là nội dung mẫu để dàn layout — xếp vào lưu trữ.

Sau khi map trạng thái, hiển thị ngoài trang public cập nhật theo: chỉ bài thật lên danh sách đọc và được tính vào số bài của module; bài lưu trữ chỉ còn thấy ở Content và Archive, không có đích đến khi bấm. Đổi trạng thái ở admin thì trang public đổi theo, không cần deploy lại.

---

**Không đổi:** ba template cũ, các trang Public/Practice khác, bảng màu và hệ chữ (Playfair Display + Be Vietnam Pro).
