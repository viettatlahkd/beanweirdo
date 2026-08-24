# QA-28 · Bàn giao cho lane tài liệu: QA-13 → QA-27

PR: chưa tạo    nhánh: docs/qa-28-ban-giao    commit: điền sau khi merge
Cắt từ: origin/main @ e3338db

Đây **không phải một PR sửa code**. Nó là bản gộp mười lăm ghi chú bàn giao mà
lane tài liệu chưa đọc, viết ra vì đọc tuần tự mười lăm file sẽ dẫn tới chép
nhầm — **nhiều luật trong đó đã bị luật sau thay thế**.

Lượt rà gần nhất của lane tài liệu (`audit-07`) mới chạm tới `qa-01`…`qa-05` và
`qa-11`. Mọi thứ từ `qa-13` trở đi chưa ai đọc.

## Đọc mục này trước: mười luật đã chết

Chúng có trong ghi chú cũ, và **không được chép vào specs**. Cột bên phải là nơi
ghi luật đang có hiệu lực.

| Luật đã chết | Ở đâu | Thay bằng |
|---|---|---|
| Heatmap 26 tuần | qa-13 | **15 tuần** — qa-23 |
| Heatmap 13 tuần | qa-22 | **15 tuần** — qa-23 |
| Heatmap neo vào **lần ghi đầu tiên** | qa-13 §4 | **neo vào ngày mở sổ 20/08** — qa-16 §1 |
| Ô heatmap không quá **14px** | qa-20 §1 | **24px** — qa-22 |
| Bảng thống kê: project trước, loại việc sau | qa-13 §5 | **hai băng**: project trên, heatmap cạnh loại việc — qa-20 §2 |
| Khoảng giữa hai băng 64px kèm đường kẻ | qa-20 | **40px, không kẻ** — qa-22 |
| Giờ bản sao **luôn** là lúc bấm | qa-15 §2 | **tuỳ ngày**: hôm nay lấy giờ bấm, ngày cũ giữ giờ bản gốc — qa-24 |
| Hàng chưa ghi chú hiện dòng mời "ghi chú/link" | qa-21 (bản đầu) | **không hiện gì** — qa-21 §4 đã sửa |
| Tổng: **giữ hàng cha, bỏ các lần** | qa-24 | **cộng các lần, bỏ hàng cha** — qa-25 §4 |
| `khác` là thùng chứa ngầm | trước qa-22 | **một lựa chọn luôn có mặt**, kiêm chỗ rơi mặc định — qa-22 §4 |

Bốn dòng đầu đều là heatmap: nó bị chỉnh năm lần trong hai ngày. Chỉ `qa-23` là
bản cuối.

## Hai chỗ trong tài liệu hiện đang sai

- **`logic.ts` nhóm 14, luật thứ hai**: *"Riêng [[hours]]: sửa hoạt động chỉ hai
  nhánh — đổi thời gian, hoặc xoá. Sửa tên là thao tác phụ."*
  Nay sai hẳn. Sửa một hoạt động có: đổi tên · đổi tag project · đổi tag task ·
  đổi giờ bắt đầu · đổi giờ kết thúc · đổi thời lượng · thêm/sửa ghi chú ·
  tick/bỏ tick · thêm một lần thực hiện · nhân đôi · gộp vào hàng trên · xoá.
  Mười hai nhánh, không phải hai.

- **`logic.ts` nhóm 14 chỉ có bốn luật cho `[[hours]]`.** Màn này đã qua mười
  lăm đợt sửa và giờ là màn phức tạp nhất của site, nhưng bộ luật vẫn mô tả nó
  như hồi chỉ có chuỗi ngày và một cái đồng hồ. Danh sách dưới đây là những gì
  cần thêm.

- **`SPEC.html`** nhắc "Ghi 02" đúng một lần, và chỉ để nói nó là module đặc
  biệt. Không có mục nào mô tả màn này làm được gì.

## Luật đang có hiệu lực, gom theo chủ đề

Đánh số lại theo chủ đề cho dễ đọc; lane tài liệu tự quyết cách đưa vào nhóm.

### Ngày mở sổ và danh sách ngày
1. Nhật ký có ngày mở sổ cố định **20/08/2026**. Không màn hình nào dựng ra ngày
   trước đó — kể cả một hàng trống hay một ô heatmap. *(qa-16)*
2. Ngày từ ngày mở sổ tới hôm nay mà không có hoạt động là **ngày bỏ lỡ**; ngày
   ngoài khoảng đó **không thuộc về nhật ký**. Hai thứ không được vẽ giống nhau.
   *(qa-16)*
3. Mọi tỉ lệ "x/y ngày" lấy y là số ngày nhật ký thật sự có, không phải hằng số.
   *(qa-16)*
4. Danh sách ngày đọc theo ba tầng: **tháng → tuần → ngày**. *(qa-18)*
5. Tuần tính từ thứ Hai tới Chủ nhật; tuần vắt qua hai tháng được đọc tách theo
   từng tháng, nhãn ghi đúng khoảng ngày thuộc nhóm. *(qa-18)*
6. Từ hai tuần trở lên trong một tháng: tuần mới nhất mở, tuần cũ gom. Một tuần
   thì không hiện heading tuần. *(qa-18)*
7. Từ hai tháng trở lên: tháng hiện tại mở, tháng cũ gom. *(qa-18)*
8. Nhóm đang gom vẫn hiện khoảng thời gian, số ngày có ghi và tổng thời lượng.
   *(qa-18)*
9. Màn hình đọc "hôm nay" theo đồng hồ **tại thời điểm hỏi**, không phải lúc mở
   trang. Tab để qua đêm phải tự sang ngày mới. *(qa-23)*

### Một hoạt động
10. Hàng mới bắt đầu tại **thời điểm bấm** "thêm hoạt động". *(qa-19)*
11. Hàng mới không có ngữ cảnh nào khác thì mang loại **`khác`**. *(qa-22)*
12. `khác` là lựa chọn **luôn có mặt** trong hệ tag task, đồng thời là chỗ rơi
    mặc định. Không đổi tên và không xoá được. *(qa-22)*
13. Giờ bắt đầu, giờ kết thúc, thời lượng: **hai ô sửa gần nhất giữ nguyên, ô
    còn lại được tính ra**. Mới sửa một ô thì giờ bắt đầu được giữ yên. *(qa-26)*
14. Tab đi dọc ba ô theo thứ tự bắt đầu → kết thúc → thời lượng. *(qa-26)*
15. Một hoạt động có thể mang một **ghi chú**; không có thì không hiện gì.
    *(qa-21)*
16. Ghi chú nhập cùng lần với tên, không phải thao tác riêng. *(qa-21)*
17. Ghi chú là địa chỉ web thì hiển thị bằng **tên miền**, kèm dấu hiệu cho biết
    nó trỏ vào trong site. Không bao giờ hiện địa chỉ đầy đủ. *(qa-21)*
18. **Nhân đôi** giữ tên, cả hai tag và thời lượng; bản sao **luôn chưa tick**.
    *(qa-15)*
19. Giờ của bản sao: hàng **hôm nay** lấy giờ lúc bấm; hàng **ngày cũ** giữ giờ
    bản gốc và nằm ngay dưới nó. *(qa-24)*

### Một hoạt động nhiều lần
20. Tên và hai tag nằm ở hoạt động; giờ, thời lượng và trạng thái xong nằm ở
    **từng lần**. *(qa-25)*
21. Thời lượng của hoạt động nhiều lần là **tổng thời lượng các lần**, không
    phải hiệu giữa giờ cuối và giờ đầu. Hoạt động không hiển thị cặp giờ.
    *(qa-25)*
22. Ô tick của hoạt động nhiều lần là xong khi **mọi** lần đều xong; bấm vào thì
    đóng hoặc mở tất cả. *(qa-25)*
23. Mọi phép cộng thời lượng đếm **các lần** và bỏ qua hoạt động chứa chúng.
    *(qa-25)*
24. Xoá một hoạt động thì xoá cả các lần của nó, và đó là **một** hành động —
    một lần Ctrl+Z đưa cả cụm trở lại. *(qa-25, qa-26)*
25. Hoạt động nhiều lần xếp **lên đầu ngày**, trước mọi hoạt động thường; giữa
    chúng thì theo lần sớm nhất. Hệ quả có chủ ý: cột giờ không còn tăng dần từ
    trên xuống. *(qa-25)*
26. Nút gộp chỉ xuất hiện khi hàng phía trên **cùng ngày** trùng cả tên, tag
    project và tag task. *(qa-26)*
27. Gộp vào một hàng thường thì phần việc hàng đó đang giữ trở thành **lần thứ
    nhất**. *(qa-26)*
28. Một lần vừa được tạo **mở sẵn ô giờ bắt đầu**. *(qa-26)*

### Đồng hồ
29. Một phiên đồng hồ có hai hành động kết thúc khác nhau: **làm lại từ đầu**
    (về 0, giữ tên và cả hai tag) và **đặt lại** (kết thúc phiên, xoá tên, giữ
    tag). *(qa-14)*
30. Làm lại một phiên hẹn giờ đã báo hết giờ thì lần hết giờ sau **vẫn được
    báo**. *(qa-14)*
31. Một phiên bấm giờ được ghi vào **ngày nó bắt đầu**, không phải ngày bấm
    hoàn thành. Phiên chạy qua nửa đêm thuộc về buổi tối trước. *(qa-23)*

### Bảng thống kê
32. Ba mốc thời gian là **Tháng này · Tuần này · 7 ngày qua**. Tuần bắt đầu từ
    thứ Hai. Không dùng cửa sổ lấy theo số ngày mà giao diện tình cờ tải về.
    *(qa-13)*
33. Tỉ lệ **Hữu ích / Thực tế** = tổng thời lượng việc đã xong ÷ độ dài khoảng
    thời gian thật đã trôi qua, trong đó **khoảng chồng nhau chỉ tính một lần**.
    Mẫu số chỉ gồm ngày có ghi. *(qa-13)*
34. Bảng đọc theo **hai băng**: bảng theo project trải hết bề ngang ở trên,
    heatmap đứng cạnh danh sách theo loại việc ở dưới. *(qa-20)*
35. Heatmap hiển thị **15 tuần**, ô rộng tối đa **24px**, neo vào **ngày mở
    sổ**. *(qa-23, qa-22, qa-16)*
36. Ô heatmap có **ba trạng thái**: có hoạt động (bốn mức đậm) · trong khoảng ghi
    nhưng không hoạt động · ngoài khoảng nhật ký từng tồn tại. Trạng thái thứ ba
    không dùng chung màu với thứ hai. *(qa-13)*
37. Danh sách theo loại việc hiện **7 dòng đầu**; phần còn lại mở bằng một cú
    bấm. *(qa-22)*
38. Project từng dùng mà không có hoạt động nào trong **7 ngày** trở lại được xếp
    vào "lâu chưa đụng tới". *(qa-13)*
39. Bảng thống kê dùng **thang khoảng cách của hệ thiết kế** (8 / 20 / 40 / 64),
    không dùng số riêng. *(qa-22)*

## Schema đã đổi

`hour_logs` có thêm hai cột, migration đã viết trong QA-27:

- `note text` — ghi chú của một hoạt động *(0018)*
- `parent_id uuid references hour_logs(id) on delete cascade` — hàng này là một
  lần của hoạt động kia *(0019)*

Điều dễ hiểu nhầm khi đọc số liệu: **số phút nằm ở các lần, hàng cha không giữ
phút nào của riêng nó.** Cột `mins` của hàng cha vẫn là giá trị cũ từ trước khi
nó thành hàng cha, và không có gì giữ nó cho khớp — cố ý.

## Việc lane tài liệu cần quyết

1. Nhóm 14 `[[hours]]` hiện có bốn luật; danh sách trên có ba mươi chín. Tách
   thành mấy nhóm, hay để chung một nhóm phình to?
2. Luật *"sửa hoạt động chỉ hai nhánh"* nên **sửa lại** hay **bỏ hẳn**?
3. `SPEC.html` có cần một mục riêng mô tả Ghi 02 không? Hiện nó chỉ được nhắc
   như một module đặc biệt không có phần trình bày.

## Còn nợ, không thuộc lane tài liệu

- **Hai file migration cùng mang số 0017** (`0017_pinned_and_optional_order.sql`
  và `0017_unclassified_lowercase.sql`). Nên đổi tên một cái — việc của lane
  kiến trúc.
- `docs/spine/SO-BAN-GIAO.md` tự nhận là nơi duy nhất theo dõi nợ tài liệu nhưng
  **chưa có mục nào của lane QA**. Tôi không sửa được file đó.
