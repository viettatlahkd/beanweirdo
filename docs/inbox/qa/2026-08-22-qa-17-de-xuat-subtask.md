# QA-17 · Đề xuất: một hoạt động có nhiều lần thực hiện

**Đây là đề xuất, chưa viết dòng code nào.** Chủ site yêu cầu đề xuất cách thao
tác và cách hiển thị trước khi làm.
Nguồn: chủ site ngày 2026-08-22 — "cho phép người dùng thêm 1 tầng sub-task kiểu
1 hoạt động chính có nhiều thời điểm hoặc hoạt động phụ >> hoạt động chính =
tổng thời lượng thực hiện của các hoạt động phụ (tính theo thời lượng, không
tính theo [end time - start time])".

## Vấn đề có thật, nhìn thấy trong dữ liệu

Ngày 21/8 trong nhật ký thật:

```
#Work  thực hành  13:42 – 16:42   3h      beanweirdo: web code
#Work  thực hành  23:10 – 00:30   1h 20m  beanweirdo: web code
```

Cùng một việc, hai lần ngồi vào, hai hàng rời nhau, cách nhau bảy tiếng. Hiện
tại nhật ký không có cách nào nói "đây là **một** việc làm hai lần" — nên bảng
thống kê đếm hai hoạt động, và mắt người đọc phải tự cộng 3h + 1h20.

Chỗ này chính là cái chủ site gọi là "1 hoạt động chính có nhiều thời điểm".

## Đề xuất — cách hiển thị

Một hoạt động cha, các lần thực hiện thụt vào dưới nó:

```
┌──────────────────────────────────────────────────────────────────────┐
│ ✓  #Work  thực hành              13:42 → 00:30 · 2 lần      4h 20m  ⧉ ✕│
│    beanweirdo: web code                                               │
│    ├─  13:42 – 16:42                                          3h    ✕ │
│    └─  23:10 – 00:30                                       1h 20m   ✕ │
│    ＋ thêm một lần nữa                                                │
└──────────────────────────────────────────────────────────────────────┘
```

Bốn quyết định trong bản vẽ này, và lý do:

1. **Tên và hai tag chỉ nằm ở hàng cha.** Các lần thực hiện là *cùng một việc*
   — lặp lại tên và tag ba lần là bắt mắt đọc lại ba lần một thông tin không
   đổi, và mở đường cho hai lần cùng việc lại mang hai tag khác nhau.
2. **Số thời lượng lớn ở hàng cha là tổng của các con**, đúng yêu cầu: cộng
   thời lượng, không lấy hiệu giờ cuối trừ giờ đầu. Ở ví dụ trên, 13:42 → 00:30
   là mười tiếng bốn tám phút, nhưng thời lượng là **4h 20m**.
3. **Hàng cha vẫn hiện khoảng trải và số lần** (`13:42 → 00:30 · 2 lần`) bằng
   chữ nhỏ, xám. Đây là thông tin thật và hay dùng — "việc này kéo dài cả ngày"
   khác với "việc này tốn bốn tiếng" — nhưng nó không được cạnh tranh với con
   số thời lượng.
4. **Con không có tag, không có tên, chỉ có giờ và thời lượng.** Sửa giờ hoặc
   thời lượng của con thì tổng ở cha đổi theo ngay.

Khi hoạt động chỉ có một lần thực hiện, **màn hình không đổi gì so với bây
giờ** — không có tầng con, không có hàng thụt vào. Tầng thứ hai chỉ xuất hiện
khi thật sự có lần thứ hai.

## Đề xuất — cách thao tác

**Tạo lần thứ hai:** nút `＋ thêm một lần nữa` ở cuối hàng. Bấm là có ngay một
lần thực hiện mới, giờ bắt đầu tính theo đúng quy tắc của QA-15 (15 phút sau
lần muộn nhất), thời lượng mặc định bằng lần gần nhất.

Hàng đang có một lần duy nhất thì lần đó là chính nó; bấm `＋` biến nó thành
hàng cha có hai con — lần đang có, cộng lần vừa thêm. Người dùng không phải học
khái niệm "chuyển thành hoạt động cha", việc đó xảy ra ngầm.

**Gộp hai hàng rời sẵn có** (như hai hàng `beanweirdo: web code` ở trên): kéo
thả thì tốn công làm và dễ bấm nhầm. Đề xuất thay bằng: khi trong cùng một ngày
có từ hai hàng **trùng tên và trùng cả hai tag**, hàng dưới hiện thêm một nút
nhỏ `⇡ gộp vào hàng trên`. Một cú bấm, không kéo, không hộp thoại.

**Tách ra:** nút `✕` ở một con xoá đúng lần đó. Xoá tới khi còn một lần thì hàng
tự trở lại dạng phẳng như cũ.

**Xoá hàng cha** xoá cả các lần bên dưới — nhưng việc này đã nằm trong hệ hoàn
tác Ctrl+Z sẵn có, nên vẫn lấy lại được.

## Việc phải làm dưới database — và chỗ tôi không tự làm được

Cần **một cột mới**:

```sql
alter table hour_logs
  add column parent_id uuid references hour_logs(id) on delete cascade;

create index if not exists hour_logs_parent_idx on hour_logs (parent_id);
```

Đây là DDL, mà REST API không chạy DDL được — nên khác với migration 0017, lần
này **tôi không tự áp được bằng `curl`**. Cần chủ site dán hai câu trên vào SQL
Editor của Supabase (không phải cài gì, chỉ mở dashboard).

Lưu ý ranh giới: **file migration thuộc lane kiến trúc**, không phải lane QA.
Tôi để nguyên hai câu SQL ở đây; ai tạo file `backend/supabase/migrations/`
thì do chủ site phân công.

Ràng buộc kèm theo, đề xuất áp ngay trong cùng migration:

- Chỉ một tầng: một hàng có `parent_id` thì không được làm cha của hàng khác.
  Ép bằng trigger, hoặc kiểm ở tầng API. **Đề xuất kiểm ở API** — trigger cho
  một luật đơn giản thế này làm khó việc đọc hiểu schema về sau.
- Con phải cùng `date` với cha.

## Ba chỗ khác sẽ phải đổi theo

1. **Thống kê.** `byProject`, `byKind`, `periodStats`, `usefulRatio` đang cộng
   `mins` của mọi hàng. Nếu hàng cha *cũng* mang `mins` thì mọi con số sẽ bị
   đếm hai lần. Đề xuất: **hàng cha không lưu `mins` riêng** — tổng được tính
   khi đọc. Nhưng cột `mins` đang có ràng buộc `check (mins > 0)`, nên hàng cha
   phải lưu một giá trị nào đó.
   Hai đường: (a) nới ràng buộc để cha lưu `0`; (b) cha lưu tổng, và mọi phép
   cộng đều lọc `parent_id is null`. **Đề xuất (b)** — không đụng ràng buộc cũ,
   và một truy vấn quên lọc thì ra số lớn hơn thực tế chứ không ra số 0, tức là
   sai kiểu dễ phát hiện.
2. **Hoàn tác.** `useUndoStack` đang ghi lại từng thao tác một hàng. Xoá một
   hàng cha là xoá nhiều hàng — cần gói thành một bước hoàn tác, nếu không
   Ctrl+Z sẽ trả lại từng con một.
3. **Ghi từ đồng hồ.** Hiện mỗi lần bấm ✓ tạo một hàng mới. Nếu hôm nay đã có
   hàng trùng tên và trùng tag, có nên tự thành lần thứ hai của hàng đó không?
   **Đề xuất: không tự động** — đoán ý người dùng ở chỗ này sai thì phiền hơn
   là lợi. Để nút `⇡ gộp vào hàng trên` lo.

## Cần chủ site duyệt bốn điểm

1. Bản vẽ trên có đúng ý "hoạt động chính + hoạt động phụ" không?
2. Hàng cha hiện `13:42 → 00:30 · 2 lần` bằng chữ nhỏ — giữ hay bỏ?
3. Nút `⇡ gộp vào hàng trên` cho hai hàng trùng tên trùng tag — làm luôn trong
   đợt này, hay để sau?
4. Ai chạy hai câu SQL: chủ site dán vào SQL Editor, hay muốn tôi tìm đường
   khác?

## Ước lượng

Sau khi duyệt và có cột `parent_id`: khoảng 3 tiếng — 1h cho dữ liệu và API,
1h cho giao diện hai tầng, 1h cho thống kê, hoàn tác và test.
