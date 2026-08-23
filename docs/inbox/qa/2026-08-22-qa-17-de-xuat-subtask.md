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
│ ✓  #Work  thực hành                    2 lần            4h 20m  ⧉ ✕ │
│    beanweirdo: web code                                              │
│    ├─  13:42 – 16:42                                       3h     ✕ │
│    └─  23:10 – 00:30                                    1h 20m    ✕ │
│    ＋ thêm một lần nữa                                               │
└──────────────────────────────────────────────────────────────────────┘
```

Bốn quyết định trong bản vẽ này:

1. **Tên và hai tag chỉ nằm ở hàng cha.** Các lần thực hiện là *cùng một việc*
   — lặp lại tên và tag ba lần là bắt mắt đọc lại ba lần một thông tin không
   đổi, và mở đường cho hai lần cùng việc lại mang hai tag khác nhau.
2. **Số thời lượng lớn ở hàng cha là tổng của các con**: cộng thời lượng, không
   lấy hiệu giờ cuối trừ giờ đầu.
3. **Hàng cha không ghi khoảng trải.** Bản đề xuất đầu có ghi `13:42 → 00:30`;
   chủ site bỏ, và đúng: hai đầu mút ấy không khớp với con số bên cạnh chúng.
   Đọc "13:42 → 00:30" rồi thấy "4h 20m" thì mắt phải tự trừ ra rằng gần bảy
   tiếng ở giữa là khoảng trống — một phép tính không ai nhờ, trên hai con số
   nói hai chuyện khác nhau. Hàng cha chỉ còn **số lần** và **tổng thời lượng**;
   giờ giấc là việc của từng lần, và từng lần đã tự ghi rồi.
4. **Con không có tag, không có tên, chỉ có giờ và thời lượng.** Sửa giờ hoặc
   thời lượng của con thì tổng ở cha đổi theo ngay.

Khi hoạt động chỉ có một lần thực hiện, **màn hình không đổi gì so với bây
giờ** — không có tầng con, không có hàng thụt vào. Tầng thứ hai chỉ xuất hiện
khi thật sự có lần thứ hai.

## Đề xuất — thứ tự trong ngày

Luật này do chủ site đặt, không có trong bản đề xuất đầu.

**Hoạt động có nhiều lần thực hiện được xếp lên trên cùng của ngày**, trước mọi
hoạt động thường, bất kể giờ bắt đầu. Đó là việc chính của ngày hôm ấy: nó được
quay lại nhiều lần, và một việc phải quay lại nhiều lần thì đáng đọc trước.

**Giữa các hoạt động nhóm với nhau thì vẫn theo giờ**: cái nào có lần thực hiện
sớm nhất thì đứng trước. Hoạt động thường bên dưới cũng giữ nguyên thứ tự theo
giờ như hiện nay.

```
22 T7                                    ← ngày
   ▸ beanweirdo: web code   3 lần   5h 10m   ← lần sớm nhất 09:00
   ▸ đọc paper lipid        2 lần   1h 30m   ← lần sớm nhất 14:00
     Gaming: Castles        09:10 – 11:00    1h 50m   ← thường, theo giờ
     Luncheon on time!      12:55 – 13:25       30m
```

Lưu ý một hệ quả để chủ site biết trước: cột giờ **không còn tăng dần từ trên
xuống**. Ở ví dụ trên, hàng thường đầu tiên bắt đầu 09:10 trong khi hàng nhóm
ngay trên nó có lần muộn nhất lúc 22:00. Đây là đánh đổi có chủ ý — ưu tiên
theo *tầm quan trọng* thay vì theo *dòng thời gian* — chứ không phải lỗi sắp
xếp. Nếu về sau thấy khó đọc thì đảo lại chỉ là đổi một hàm so sánh.

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

### 1. Thống kê sẽ đếm gấp đôi nếu không xử lý

Mọi con số trong bảng thống kê — theo project, theo loại việc, "tháng này",
"tuần này", tỉ lệ hữu ích — đều tính bằng cách cộng cột `mins` của tất cả các
hàng. Khi một hoạt động có hai lần thực hiện, dữ liệu sẽ có **ba** hàng: hàng
cha và hai hàng con.

Nếu hàng cha cũng mang thời lượng, phép cộng ấy lấy cả ba: 4h20 của cha, cộng
3h của con thứ nhất, cộng 1h20 của con thứ hai — ra 8h40 cho một buổi làm việc
4h20. Sai gấp đôi, ở mọi chỗ.

Trốn được nếu hàng cha lưu `mins = 0`, nhưng cột `mins` đang có ràng buộc
`check (mins > 0)` từ migration đầu tiên, nên phải nới ràng buộc ấy ra.

**Đề xuất: đừng nới.** Để hàng cha lưu đúng tổng của các con, rồi thêm điều
kiện `parent_id is null` vào mọi phép cộng — nghĩa là "chỉ cộng những hàng
không phải là con của ai". Lý do chọn đường này: nếu về sau có ai viết một
truy vấn mới mà **quên** lọc, kết quả sẽ lớn hơn thực tế và đập ngay vào mắt;
còn nếu chọn đường `mins = 0` mà quên thì hoạt động ấy biến mất khỏi thống kê —
sai theo kiểu im lặng, khó phát hiện hơn nhiều.

### 2. Ctrl+Z phải hoàn tác cả cụm, không phải từng hàng

Hệ hoàn tác hiện nay ghi lại **từng thao tác trên từng hàng**: thêm một hàng là
một bước, xoá một hàng là một bước.

Xoá một hoạt động có ba lần thực hiện là xoá bốn hàng cùng lúc. Nếu để nguyên,
người dùng bấm Ctrl+Z sẽ thấy từng con quay về một lần một — bốn lần bấm mới về
được chỗ cũ, và ba trạng thái ở giữa là những cụm dở dang chưa từng tồn tại.

Cần gói cả cụm thành **một** bước hoàn tác.

### 3. Đồng hồ có nên tự gộp vào hoạt động sẵn có không?

Mỗi lần bấm ✓ trên đồng hồ, một hàng mới được tạo cho hôm nay. Nếu hôm nay đã
có một hàng trùng tên và trùng cả hai tag, hệ thống *có thể* tự biến nó thành
lần thực hiện thứ hai của hàng ấy.

**Đề xuất: không tự động.** Trùng tên không có nghĩa là cùng một việc — hai
phiên "đọc paper" trong ngày có thể là hai bài khác nhau. Đoán đúng thì tiết
kiệm một cú bấm; đoán sai thì người dùng phải đi tách ra, tốn hơn nhiều. Để nút
`⇡ gộp vào hàng trên` lo việc đó, khi người dùng thật sự muốn.

## Cần chủ site duyệt

1. Nút `⇡ gộp vào hàng trên` cho hai hàng trùng tên trùng tag — làm luôn trong
   đợt này, hay để sau?
2. Cột giờ không còn tăng dần từ trên xuống (xem mục thứ tự) — chấp nhận chứ?

Ba điểm còn lại đã chốt: bỏ khoảng trải ở hàng cha · nhóm lên đầu ngày · giữa
các nhóm thì theo lần sớm nhất.

## Ước lượng

Sau khi duyệt và có cột `parent_id`: khoảng 3 tiếng — 1h cho dữ liệu và API,
1h cho giao diện hai tầng, 1h cho thống kê, hoàn tác và test.
