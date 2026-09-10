# Trình soạn: một bài viết được sửa như thế nào

Tài liệu này mô tả **một trình soạn văn bản phải làm được những gì**, viết từ
đầu chứ không mô tả lại bản đang có. Bảng đối chiếu ở cuối mới nói bản hiện
tại đứng ở đâu.

Viết theo yêu cầu của chủ site sau khi dán markdown vào màn soạn và gặp một
loạt lỗi: *"thêm bullet con thì thêm được mà không xoá bằng keyboard là sao?
docs thì centric của nó là người dùng tương tác qua bàn phím"*.

---

## Phần 0 — Câu hỏi gốc, và một chẩn đoán

Câu hỏi không phải "thiếu tính năng nào" mà là **"cái gì đang sai về nguyên
tắc"**. Bởi vì danh sách tính năng thiếu thì vá được từng cái, còn một nguyên
tắc sai thì mỗi lần vá lại đẻ ra một lỗ mới — đúng như bốn PR vừa rồi.

Chẩn đoán: **bản hiện tại là một cái biểu mẫu, không phải một trình soạn.**

| | Biểu mẫu | Trình soạn |
|---|---|---|
| Đơn vị | một **ô** rời | một **dòng chảy** chữ liên tục |
| Đường chính | chuột, tìm nút bấm | bàn phím, tay không rời |
| Cấu trúc | do nút bấm quyết định | do **chữ đang gõ** quyết định |
| Con trỏ | thuộc về một ô | đi xuyên qua cả bài |
| Xoá | có nút xoá riêng | Backspace, như xoá một chữ |

Mọi triệu chứng chủ site gặp đều rơi ra từ một chỗ này. Thêm mục con được mà
không xoá được bằng bàn phím, vì "thêm" có nút còn "xoá" thì bàn phím phải
biết đường — mà bàn phím chưa được dạy gì cả.

**Một câu để nhớ:** trong trình soạn, cấu trúc là *hệ quả* của việc gõ chữ.
Trong biểu mẫu, cấu trúc là *điều kiện* để được gõ chữ.

---

## Phần 1 — Năm nguyên tắc

**N1. Bàn phím là đường chính, chuột là đường phụ.**
Mọi thao tác cấu trúc — tạo, xoá, gộp, tách, thụt lề, đổi chỗ — phải làm được
mà tay không rời bàn phím. Nút bấm tồn tại để **chỉ ra** rằng thao tác có
tồn tại, không phải để làm cách duy nhất thực hiện nó.

**N2. Đối xứng: thêm được thì xoá được, bằng cùng hạng thao tác.**
Nếu thêm một mục con bằng một phím thì xoá nó cũng phải bằng một phím. Thêm
bằng phím mà xoá bằng chuột là một cái bẫy: người viết học được nửa đường rồi
đứng lại.

**N3. Không phát minh phím mới.**
Enter, Backspace, Tab, mũi tên, Cmd+B, Cmd+Z đã có nghĩa cố định trong mọi
trình soạn ba mươi năm nay. Người viết mang sẵn thói quen ấy tới. Đặt một
nghĩa khác cho chúng là bắt họ học lại, và họ sẽ không học.

**N4. Không có trạng thái không thoát được.**
Vào một danh sách thì phải ra được khỏi danh sách. Vào một ô thì phải ra được.
Mọi thứ đi vào bằng bàn phím phải đi ra được bằng bàn phím.

**N5. Không mất chữ. Mọi thứ hoàn tác được.**
Một thao tác cấu trúc lỡ tay không được nuốt chữ. Undo phải phục hồi **cả cấu
trúc**, không chỉ chữ.

---

## Phần 2 — Nghiệp vụ chi tiết

### A. Vòng đời một khối

| Mã | Thao tác | Phím | Hành vi mong đợi |
|---|---|---|---|
| A1 | Tạo khối sau | `Enter` ở cuối khối | Khối mới, loại **đoạn văn** — trừ trong danh sách, xem mục B |
| A2 | Tách khối | `Enter` ở giữa chữ | Chữ trước con trỏ ở lại, chữ sau sang khối mới cùng loại |
| A3 | Gộp lên | `Backspace` ở **đầu** khối | Khối này nhập vào cuối khối trên, con trỏ đứng đúng chỗ nối |
| A4 | Bỏ khối rỗng | `Backspace` trong khối rỗng | Khối biến mất, con trỏ về cuối khối trên |
| A5 | Hạ cấp trước khi xoá | `Backspace` ở đầu khối **có cấp bậc** | Về đoạn văn trước, xoá sau — hai lần bấm, không phải một |
| A6 | Xoá cả khối | `Delete` khi cả khối đang được chọn | Khối đi, kèm hỏi về ghi chú neo vào nó |
| A7 | Đổi chỗ | `Cmd/Alt` + `↑`/`↓` | Khối đổi chỗ với khối trên/dưới, con trỏ đi theo |
| A8 | Nhân bản | `Cmd+D` | Bản sao ngay dưới, con trỏ sang bản sao |
| A9 | Đổi loại khi đang gõ | `# ` · `## ` · `- ` · `1. ` · `> ` ở **đầu** khối rỗng | Ký hiệu biến mất, khối đổi loại ngay |
| A10 | Chèn khối không gõ được | `/` ở đầu khối rỗng | Menu đọc từ kho element, gõ để lọc, Enter để chọn |

**A5 đáng nói riêng.** Backspace ở đầu một tiêu đề không nên xoá luôn tiêu đề
— nó nên hạ tiêu đề xuống đoạn văn. Lần bấm thứ hai mới gộp lên. Lý do: mất
một tiêu đề đã gõ xong đau hơn nhiều so với thừa một lần bấm phím.

### B. Danh sách — chỗ chủ site đang đau

| Mã | Thao tác | Phím | Hành vi mong đợi |
|---|---|---|---|
| B1 | Mục mới | `Enter` | Mục mới **cùng cấp**, ngay dưới |
| B2 | Tách mục | `Enter` giữa chữ | Chữ sau con trỏ thành mục mới |
| B3 | Thụt vào | `Tab` ở đầu mục | Xuống một cấp, tối đa ba cấp |
| B4 | Lùi ra | `Shift+Tab` | Lên một cấp; ở cấp một thì **thoát danh sách**, thành đoạn văn |
| B5 | **Xoá mục** | `Backspace` ở đầu mục | Mục nhập vào mục trên. Đây là cái đang thiếu |
| B6 | Bỏ mục rỗng | `Backspace` trong mục rỗng | Mục đi, con trỏ về cuối mục trên |
| B7 | **Thoát danh sách** | `Enter` ở mục rỗng | Không tạo mục rỗng nữa — lùi một cấp, hoặc thành đoạn văn nếu đang ở cấp một |
| B8 | Dòng phụ | `Shift+Enter` | Dòng chìm dưới mục, không phải mục mới |
| B9 | Giữ ít nhất một mục | — | Xoá mục cuối cùng thì cả khối danh sách đi, không để lại khối rỗng |

**B7 là cách người ta thoát khỏi danh sách ở mọi trình soạn.** Không có nó thì
danh sách là một cái hố: vào được, không ra được, phải với tay lấy chuột.

### C. Con trỏ và vùng chọn

| Mã | Thao tác | Phím |
|---|---|---|
| C1 | Đi qua ranh giới khối | `↑` `↓` `←` `→` — con trỏ đi xuyên bài, không dừng ở mép ô |
| C2 | Giữ cột khi lên xuống | `↑`/`↓` nhớ vị trí ngang, không nhảy về đầu dòng |
| C3 | Đầu/cuối dòng, đầu/cuối bài | `Home` `End` `Cmd+↑` `Cmd+↓` |
| C4 | Chọn trong khối | `Shift` + mũi tên |
| C5 | Chọn **qua nhiều khối** | `Shift` + mũi tên vượt mép khối |
| C6 | Chọn hai nấc | `Cmd+A` lần một chọn khối, lần hai chọn cả bài |
| C7 | Thao tác trên nhiều khối | Xoá · đổi chỗ · nhân bản · đổi loại, áp cho cả vùng chọn |

C5 và C7 là thứ phân biệt một trình soạn với một xấp biểu mẫu. Không có chúng
thì không xoá được ba đoạn cùng lúc, không kéo được năm mục sang chỗ khác.

### D. Định dạng trong dòng

| Mã | Thao tác | Phím |
|---|---|---|
| D1 | Nhấn | `Cmd+B` — và `Cmd+I` về cùng một mức nếu design chỉ có một |
| D2 | Số đo | `Cmd+U` |
| D3 | Link | `Cmd+K`; đang chọn chữ mà **dán một địa chỉ** thì chữ ấy thành link |
| D4 | Bỏ định dạng | `Cmd+\` |
| D5 | Gõ tay tự đổi | `**x**` gõ xong dấu cuối là thành chữ nhấn ngay |
| D6 | Sửa link | Con trỏ vào link thì hiện chỗ sửa địa chỉ, không phải xoá đi gõ lại |

### E. Nhập vào

| Mã | Nguồn | Hành vi |
|---|---|---|
| E1 | Dán HTML | Đổi sang định dạng của mình; style trang nguồn không theo sang |
| E2 | Dán chữ thuần | Đọc như markdown |
| E3 | Dán vào giữa câu | Là dán chữ, **không** sinh khối mới |
| E4 | Dán ảnh từ clipboard | Tải lên, thành khối ảnh |
| E5 | Kéo–thả tệp | Như E4 |
| E6 | Chép ra | Giữ định dạng, dán sang nơi khác không mất |

### F. Lịch sử

| Mã | Việc | Yêu cầu |
|---|---|---|
| F1 | Hoàn tác | `Cmd+Z`, **nhiều bậc**, không chỉ một |
| F2 | Làm lại | `Cmd+Shift+Z` |
| F3 | Gộp bước | Gõ liền một mạch là **một** bước undo, không phải mỗi ký tự một bước |
| F4 | Undo cấu trúc | Lỡ xoá một khối thì Cmd+Z trả lại cả khối lẫn ghi chú neo vào nó |
| F5 | Không mất khi rời ô | Undo không được dừng ở biên một ô |

### G. An toàn dữ liệu

| Mã | Việc | Yêu cầu |
|---|---|---|
| G1 | Tự lưu | Có, và **chỉ rõ trạng thái**: đang lưu · đã lưu · lưu hỏng |
| G2 | Lưu hỏng | Nói ra, giữ chữ lại, cho thử lại — không im lặng |
| G3 | Rời trang khi chưa lưu | Chặn lại và hỏi |
| G4 | Hai tab cùng mở một bài | Phát hiện, không để tab này ghi đè tab kia |

### H. Trợ năng và phản hồi

| Mã | Việc | Yêu cầu |
|---|---|---|
| H1 | Thứ tự Tab | Đi theo thứ tự đọc |
| H2 | Viền focus | Luôn nhìn thấy chỗ con trỏ đang đứng |
| H3 | Không bẫy focus | Vào được thì ra được bằng bàn phím |
| H4 | Không giật | Đổi trạng thái một ô không được làm trang nhảy |
| H5 | Chữ mờ gợi ý | Chỉ ở khối đang trống, không phải mọi khối |

---

## Phần 3 — Ba mức tham vọng

Không phải cái nào cũng cần làm. Ba mức, mỗi mức là một sản phẩm hoàn chỉnh:

| Mức | Là gì | Cần những mục nào |
|---|---|---|
| **1. Markdown editor** | Một ô chữ, gõ markdown, xem trước cạnh bên | A9, D5, E2, F1–F3, G1–G2 |
| **2. Block editor (Notion)** | Mỗi khối một đơn vị, bàn phím điều khiển cấu trúc | Mức 1 + toàn bộ A, B, C1–C6, D1–D4, E1–E5 |
| **3. Document editor (Docs)** | Dòng chảy liên tục, chọn tự do qua mọi thứ | Mức 2 + C7, E6, G3–G4, cộng cộng tác nhiều người |

**Dự án này thuộc mức 2.** Kho element, template dàn trang riêng, ghi chú neo
vào `id` khối — tất cả là kiến trúc của một block editor. Mức 3 sẽ phá vỡ
chúng; mức 1 thì không đựng nổi bảng, biểu đồ, số liệu, điểm căn ảnh.

Nói riêng về đề xuất "chuyển hẳn sang markdown editor": markdown **không có
chỗ đựng** điểm căn ảnh, bề rộng cột bảng, `heightPct` của biểu đồ, cặp
nhãn–giá trị, màu riêng của bài, và ghi chú neo `id`. Markdown nên là **ngôn
ngữ nhập và ngôn ngữ hiển thị trong ô**, không nên là cách lưu.

---

## Phần 4 — Bảng đối chiếu: hiện có gì, thiếu gì

Cột "Hiện tại" đo trên `origin/main` @ `30a80aa`. **Bằng chứng là tên hàm
trong mã**, không phải cảm nhận.

Ký hiệu: ✅ có · 🟡 có một nửa · ❌ không có · ⬜ ngoài mức 2

### A. Vòng đời khối

| Mã | Việc | Hiện tại | Bằng chứng / chỗ hỏng |
|---|---|---|---|
| A1 | `Enter` tạo khối mới | ❌ | Không handler nào. `Enter` trong `textarea` chèn một ký tự xuống dòng vào chữ — **và trang không vẽ nó ra** (`text.tsx` không đặt `whiteSpace`), nên chữ trông có ngắt dòng lúc soạn mà mất khi đăng |
| A2 | `Enter` tách khối | ❌ | — |
| A3 | `Backspace` gộp lên | ❌ | — |
| A4 | Xoá khối rỗng bằng phím | 🟡 | `vanishesWhenEmpty` **chỉ nhận `paragraph`**, và phải xoá hết chữ rồi *rời ô* mới ăn. Tiêu đề, danh sách, bảng: không |
| A5 | Hạ cấp trước khi xoá | ❌ | — |
| A6 | `Delete` xoá khối đang chọn | 🟡 | Có, nhưng phải Tab tới **tay nắm** trước (`RowShell`, `BlockGrip`), không phải từ trong chữ |
| A7 | `Cmd/Alt`+`↑↓` đổi chỗ | 🟡 | `↑`/`↓` trên tay nắm, không có tổ hợp từ trong chữ |
| A8 | `Cmd+D` nhân bản | ❌ | Chỉ có nút `⧉` |
| A9 | Gõ `# `, `- ` để đổi loại | ❌ | Chỉ đổi loại khi **dán**, không khi gõ |
| A10 | `/` mở menu chèn | ❌ | Phải bấm "+ thêm khối" |

### B. Danh sách — nơi chủ site báo lỗi

| Mã | Việc | Hiện tại | Bằng chứng / chỗ hỏng |
|---|---|---|---|
| B1 | `Enter` mục mới | ❌ | `ListEditor` **không truyền `onKeyDown`** cho dòng nào |
| B2 | `Enter` tách mục | ❌ | — |
| B3 | `Tab` thụt vào | ❌ | Chỉ có nút "+ mục con". Longform có `Tab` (`stepIndent`) nhưng danh sách thì không |
| B4 | `Shift+Tab` lùi ra | ❌ | Không có đường nào, kể cả chuột |
| B5 | **`Backspace` xoá mục** | ❌ | **Đúng lỗi chủ site báo.** Chỉ có nút "xoá dòng" |
| B6 | Bỏ mục rỗng bằng phím | ❌ | — |
| B7 | `Enter` ở mục rỗng để thoát | ❌ | Không có đường thoát nào bằng bàn phím |
| B8 | `Shift+Enter` dòng phụ | ❌ | Chỉ có nút "+ dòng phụ" |
| B9 | Giữ ít nhất một mục | ✅ | `without()` giữ mục cuối |

**Cả khối B chỉ có một dấu ✅.** Danh sách hiện là thứ thuần chuột.

### C. Con trỏ và vùng chọn

| Mã | Việc | Hiện tại | Bằng chứng |
|---|---|---|---|
| C1 | Mũi tên đi qua khối | ❌ | Con trỏ dừng ở mép mỗi ô |
| C2 | Nhớ cột khi lên xuống | ❌ | — |
| C3 | `Home`/`End`/`Cmd+↑↓` | 🟡 | Chỉ trong một ô |
| C4 | Chọn trong khối | ✅ | Trình duyệt lo |
| C5 | Chọn qua nhiều khối | ❌ | Mỗi ô là một vùng chọn riêng |
| C6 | `Cmd+A` hai nấc | ❌ | Chỉ chọn trong ô |
| C7 | Thao tác trên nhiều khối | ⬜ | Ngoài mức 2 tối thiểu |

### D. Định dạng trong dòng

| Mã | Việc | Hiện tại | Bằng chứng |
|---|---|---|---|
| D1 | `Cmd+B` | ❌ | Phải gõ tay `**...**` |
| D2 | `Cmd+U` | ❌ | Phải gõ tay `_..._` |
| D3 | `Cmd+K` | ❌ | Phải gõ tay `[chữ](địa chỉ)` |
| D4 | `Cmd+\` bỏ định dạng | ❌ | — |
| D5 | Gõ tay tự đổi | 🟡 | Vẽ ra khi **rời ô**, không ngay lúc gõ xong dấu cuối |
| D6 | Sửa link tại chỗ | ❌ | Phải sửa trong chữ thô |

### E. Nhập vào

| Mã | Việc | Hiện tại | Bằng chứng |
|---|---|---|---|
| E1 | Dán HTML | ✅ | `htmlToMarkdown` — đậm, link, tiêu đề, danh sách lồng, bảng |
| E2 | Dán chữ thuần đọc như markdown | ✅ | `pastedToBlocks`, `pastedToItems` |
| E3 | Dán vào giữa câu là dán chữ | ✅ | Trả `null` cho một đoạn đơn độc |
| E4 | Dán ảnh từ clipboard | ❌ | — |
| E5 | Kéo–thả tệp | 🟡 | Có ở ảnh bìa (`onHeroDrop`), không có trong thân bài |
| E6 | Chép ra giữ định dạng | ⬜ | Ngoài mức 2 tối thiểu |

### F. Lịch sử — **không có gì**

| Mã | Việc | Hiện tại | Bằng chứng |
|---|---|---|---|
| F1 | `Cmd+Z` nhiều bậc | ❌ | Không có lịch sử. `UNDO_MS` chỉ là **2 giây hoàn tác** cho hộp thoại ghi chú |
| F2 | `Cmd+Shift+Z` | ❌ | — |
| F3 | Gộp bước | ❌ | — |
| F4 | Undo cấu trúc | ❌ | Xoá nhầm một khối là mất, trừ khi kịp bấm trong hai giây |
| F5 | Undo qua biên ô | ❌ | Undo của trình duyệt dừng trong từng `textarea` |

**Đây là lỗ nguy hiểm nhất.** N5 nói không mất chữ; hiện tại xoá nhầm một khối
đã gõ xong là mất thật.

### G. An toàn dữ liệu

| Mã | Việc | Hiện tại |
|---|---|---|
| G1 | Tự lưu, có chỉ báo | ✅ | "Tự lưu khi rời khỏi ô soạn · trạng thái hiện tại: draft" |
| G2 | Báo khi lưu hỏng | 🟡 | Cần kiểm lại bằng tay |
| G3 | Chặn rời trang khi chưa lưu | ❌ | — |
| G4 | Hai tab cùng mở | ❌ | — |

### H. Trợ năng và phản hồi

| Mã | Việc | Hiện tại |
|---|---|---|
| H1 | Thứ tự Tab | 🟡 | Chưa rà |
| H2 | Viền focus | 🟡 | Ô soạn có viền nét đứt; mặt vẽ mới thêm thì chưa rà |
| H3 | Không bẫy focus | 🟡 | Chưa rà |
| H4 | Không giật | ❓ | Mặt vẽ và mặt gõ **chưa đo** xem có cao bằng nhau không |
| H5 | Chữ mờ đúng chỗ | ✅ | `GHOST` lấy tên element |

### Tổng

| Nhóm | ✅ | 🟡 | ❌ |
|---|---|---|---|
| A. Vòng đời khối | 0 | 3 | 7 |
| B. Danh sách | 1 | 0 | 8 |
| C. Con trỏ & chọn | 1 | 1 | 4 |
| D. Định dạng | 0 | 1 | 5 |
| E. Nhập vào | 3 | 1 | 1 |
| F. Lịch sử | 0 | 0 | 5 |
| G. An toàn | 1 | 1 | 2 |
| H. Trợ năng | 1 | 4 | 0 |
| **Cộng** | **7** | **11** | **32** |

Bốn PR vừa rồi làm gần trọn nhóm E. Nhóm E là **đường vào**. Nhóm A, B, C, F
là **cách sống trong bài sau khi đã vào** — và gần như chưa có gì.

---

## Phần 5 — Thứ tự đề nghị

Xếp theo *đau bao nhiêu* chia cho *tốn bao nhiêu*, không theo nhóm.

| Đợt | Làm gì | Vì sao trước | Ước lượng |
|---|---|---|---|
| **1** | B1, B5, B6, B7, B3, B4 — bàn phím cho danh sách | Đúng chỗ chủ site đang đau. Gọn trong một component | ~3 giờ |
| **2** | A1, A2, A3, A4 — Enter và Backspace cho khối | Bỏ được nút "+ thêm khối" khỏi đường chính | ~4 giờ |
| **3** | F1–F4 — undo nhiều bậc | Lỗ nguy hiểm nhất, và càng để lâu càng khó ghép | ~5 giờ |
| **4** | D1, D2, D3 — `Cmd+B`, `Cmd+U`, `Cmd+K` | Rẻ, và là thứ người viết thử đầu tiên | ~2 giờ |
| **5** | A9, A10 — gõ `# ` đổi loại, `/` mở menu | Cần đợt 2 xong trước | ~3 giờ |
| **6** | C1, C2, C5 — con trỏ đi xuyên khối | Đắt nhất, đụng vào cách quản focus | ~8 giờ |

**Một cảnh báo về thứ tự.** Đợt 3 (undo) càng để muộn càng đắt: mỗi thao tác
cấu trúc thêm vào là một thứ nữa lịch sử phải biết cách hoàn tác. Làm undo
*trước* đợt 2 sẽ rẻ hơn tổng thể, dù cảm giác ít cấp bách hơn.

**Một lỗi cần vá ngay, không đợi đợt nào.** `Enter` trong đoạn văn hiện chèn
một ký tự xuống dòng mà **trang không vẽ ra** — chữ có ngắt dòng lúc soạn và
mất ngắt dòng khi đăng. Hoặc trang phải giữ ngắt dòng, hoặc `Enter` phải làm
việc khác. Im lặng nuốt mất là lựa chọn tệ nhất trong ba.
