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

Cột "Trước" đo trên `origin/main` @ `30a80aa`, lúc tài liệu này được viết.
Cột "Nay" đo sau sáu đợt. **Bằng chứng là tên hàm trong mã.**

Ký hiệu: ✅ có · 🟡 có một nửa · ❌ không có · ⬜ ngoài mức 2

### A. Vòng đời khối

| Mã | Việc | Trước | Nay | Ghi chú |
|---|---|---|---|---|
| A1 | `Enter` tạo khối mới | ❌ | ✅ | `enterBlock`; ở cuối tiêu đề cũng mở đoạn văn |
| A2 | `Enter` tách khối | ❌ | ✅ | Hai nửa giữ nguyên loại, nửa sau mang id mới |
| A3 | `Backspace` gộp lên | ❌ | ✅ | `backspaceBlock`; con trỏ ở chỗ nối |
| A4 | Xoá khối rỗng bằng phím | 🟡 | ✅ | Mọi khối có ô chữ, không riêng `paragraph` |
| A5 | Hạ cấp trước khi xoá | ❌ | ✅ | Tiêu đề về đoạn văn trước, bấm nữa mới gộp |
| A6 | `Delete` xoá khối đang chọn | 🟡 | 🟡 | Vẫn phải Tab tới tay nắm; chưa có vùng chọn khối |
| A7 | `Cmd/Alt`+`↑↓` đổi chỗ | 🟡 | 🟡 | Vẫn chỉ trên tay nắm |
| A8 | `Cmd+D` nhân bản | ❌ | ❌ | Vẫn chỉ có nút `⧉` |
| A9 | Gõ `# `, `- ` đổi loại | ❌ | ✅ | `spaceBlock`; chỉ ăn ở đầu khối |
| A10 | `/` mở menu chèn | ❌ | ✅ | `InsertMenu`, lọc theo tên và từ khoá, đọc từ kho |

### B. Danh sách

| Mã | Việc | Trước | Nay | Ghi chú |
|---|---|---|---|---|
| B1 | `Enter` mục mới | ❌ | ✅ | `listKeys.enter` |
| B2 | `Enter` tách mục | ❌ | ✅ | Con ở lại với nửa trên |
| B3 | `Tab` thụt vào | ❌ | ✅ | Chỉ ở **đầu** dòng, để còn Tab ra khỏi ô được |
| B4 | `Shift+Tab` lùi ra | ❌ | ✅ | Các em phía dưới đi theo |
| B5 | **`Backspace` xoá mục** | ❌ | ✅ | Chỗ chủ site báo. Mục lồng lùi ra trước |
| B6 | Bỏ mục rỗng bằng phím | ❌ | ✅ | |
| B7 | `Enter` ở mục rỗng để thoát | ❌ | ✅ | `onLeaveList` → mở một đoạn văn |
| B8 | `Shift+Enter` dòng phụ | ❌ | ✅ | `listKeys.subLine` |
| B9 | Giữ ít nhất một mục | ✅ | ✅ | |

### C. Con trỏ và vùng chọn

| Mã | Việc | Trước | Nay | Ghi chú |
|---|---|---|---|---|
| C1 | Mũi tên đi qua khối | ❌ | ✅ | `neighbour`; bỏ qua bảng, ảnh |
| C2 | Nhớ cột khi lên xuống | ❌ | ❌ | **Chưa làm** — xem ghi chú dưới |
| C3 | `Home`/`End`/`Cmd+↑↓` | 🟡 | 🟡 | Vẫn trong một ô |
| C4 | Chọn trong khối | ✅ | ✅ | |
| C5 | Chọn qua nhiều khối | ❌ | ❌ | **Chưa làm** — xem ghi chú dưới |
| C6 | `Cmd+A` hai nấc | ❌ | ❌ | Cần C5 trước |
| C7 | Thao tác trên nhiều khối | ⬜ | ⬜ | Cần C5 trước |

### D. Định dạng trong dòng

| Mã | Việc | Trước | Nay | Ghi chú |
|---|---|---|---|---|
| D1 | `Cmd+B` | ❌ | ✅ | `marks.applyMark`; bấm lại là bỏ |
| D2 | `Cmd+U` | ❌ | ✅ | |
| D3 | `Cmd+K` | ❌ | ✅ | Để lại `[chữ]()`, con trỏ vào chỗ điền địa chỉ |
| D4 | `Cmd+\` bỏ định dạng | ❌ | ❌ | Bấm lại chính phím ấy thì bỏ được rồi |
| D5 | Gõ tay tự đổi | 🟡 | ✅ | Ô vẽ markdown khi con trỏ ra khỏi ô |
| D6 | Sửa link tại chỗ | ❌ | 🟡 | Sửa trong chữ thô; chưa có ô riêng |

### E. Nhập vào

| Mã | Việc | Trước | Nay |
|---|---|---|---|
| E1 | Dán HTML | ✅ | ✅ |
| E2 | Dán chữ thuần đọc như markdown | ✅ | ✅ |
| E3 | Dán vào giữa câu là dán chữ | ✅ | ✅ |
| E4 | Dán ảnh từ clipboard | ❌ | ❌ |
| E5 | Kéo–thả tệp vào thân bài | 🟡 | 🟡 |
| E6 | Chép ra giữ định dạng | ⬜ | ⬜ |

### F. Lịch sử

| Mã | Việc | Trước | Nay | Ghi chú |
|---|---|---|---|---|
| F1 | `Cmd+Z` nhiều bậc | ❌ | ✅ | `editHistory`, 100 bước |
| F2 | `Cmd+Shift+Z` | ❌ | ✅ | Kèm `Ctrl+Y` |
| F3 | Gộp bước | ❌ | ✅ | Cùng một ô, trong 800ms |
| F4 | Undo cấu trúc | ❌ | ✅ | Lấy lại cả khối lẫn ghi chú neo vào nó |
| F5 | Undo qua biên ô | ❌ | ✅ | Ở mức cả màn; ô đang dở thì trả phím lại |

### G. An toàn dữ liệu

| Mã | Việc | Trước | Nay |
|---|---|---|---|
| G1 | Tự lưu, có chỉ báo | ✅ | ✅ |
| G2 | Báo khi lưu hỏng | 🟡 | 🟡 |
| G3 | Chặn rời trang khi chưa lưu | ❌ | ❌ |
| G4 | Hai tab cùng mở | ❌ | ❌ |

### H. Trợ năng và phản hồi

| Mã | Việc | Trước | Nay | Ghi chú |
|---|---|---|---|---|
| H1 | Thứ tự Tab | 🟡 | 🟡 | Chưa rà |
| H2 | Viền focus | 🟡 | 🟡 | Mặt vẽ chưa rà |
| H3 | Không bẫy focus | 🟡 | ✅ | `Tab` chỉ thụt lề ở đầu dòng, nên vẫn Tab ra được |
| H4 | Không giật | ❓ | ❓ | Hai mặt của ô **chưa đo** — cần soi mắt |
| H5 | Chữ mờ đúng chỗ | ✅ | ✅ | |

### Tổng

| Nhóm | Trước ✅ | Nay ✅ | Nay 🟡 | Nay ❌ |
|---|---|---|---|---|
| A. Vòng đời khối | 0 | 7 | 2 | 1 |
| B. Danh sách | 1 | 9 | 0 | 0 |
| C. Con trỏ & chọn | 1 | 2 | 1 | 3 |
| D. Định dạng | 0 | 4 | 1 | 1 |
| E. Nhập vào | 3 | 3 | 1 | 1 |
| F. Lịch sử | 0 | 5 | 0 | 0 |
| G. An toàn | 1 | 1 | 1 | 2 |
| H. Trợ năng | 1 | 2 | 3 | 0 |
| **Cộng** | **7** | **33** | **9** | **8** |

### Hai mục cố ý chưa làm, và vì sao

**C5 — chọn qua nhiều khối.** Đây không phải một tính năng thiếu mà là một
kiến trúc khác. Mỗi khối hiện là một `textarea` riêng, và trình duyệt không
cho một vùng chọn trải qua hai ô nhập. Làm được nó nghĩa là bỏ hết các ô ấy,
dựng cả thân bài thành **một** mặt `contenteditable` duy nhất, rồi tự viết
lấy việc ánh xạ giữa cây khối và vị trí trong DOM. Đó là việc nhiều ngày, và
nó phá đúng thứ đang chạy tốt: mỗi khối một ô là lý do `Cmd+B`, `/`, và mặt
vẽ markdown làm được gọn như vậy. **Nên hỏi chủ site trước khi bắt đầu.**
C6 và C7 đều nằm sau nó.

**C2 — nhớ cột khi lên xuống.** Đo được cột thật thì phải đo được **hình chữ
nhật của con trỏ** trong một `textarea`, mà trình duyệt không cho; cách duy
nhất là dựng một khối vô hình chép lại y hệt kiểu chữ rồi đo trên đó. Hiện
tại đi lên rơi vào cuối khối trên, đi xuống rơi vào đầu khối dưới — đoán
được, chỉ là chưa giữ cột.

## Phần 5 — Đã làm gì, và còn gì

Sáu đợt đã chạy, theo thứ tự: danh sách → hoàn tác → khối → định dạng → ký
hiệu và `/` → con trỏ. Hoàn tác được đẩy lên làm sớm vì mỗi thao tác cấu trúc
thêm vào là một thứ nữa lịch sử phải biết hoàn tác.

Còn lại, xếp theo đau chia cho tốn:

| Việc | Vì sao | Ước lượng |
|---|---|---|
| A8 `Cmd+D`, A6/A7 từ trong chữ | Rẻ, và làm nốt nhóm A | ~2 giờ |
| E4 dán ảnh từ clipboard | Thao tác thường, hiện phải tải lên bằng tay | ~2 giờ |
| G3 chặn rời trang khi chưa lưu | Một dòng chữ hỏi, chặn được mất chữ thật | ~1 giờ |
| D6 sửa link tại chỗ | Hiện phải sửa trong chữ thô | ~2 giờ |
| C5 chọn qua nhiều khối | **Hỏi trước** — xem ghi chú ở Phần 4 | nhiều ngày |

**Một lỗi đã vá trong đợt này, không đợi đợt nào:** `Enter` trong đoạn văn
từng chèn một ký tự xuống dòng mà trang không vẽ ra. Nay `Enter` mở khối mới,
và đoạn văn trên trang giữ ngắt dòng (`whiteSpace: pre-wrap`) cho những chỗ
còn sót lại — bài cũ, chữ dán vào.
