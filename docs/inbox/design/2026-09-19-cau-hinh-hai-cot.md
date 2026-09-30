# Tab Cấu hình: chỉ mục bên trái, toàn bộ nội dung bên phải

- Nhánh: `claude/project-thread-r3z436`
- PR: (điền khi mở)
- Lane: Thiết kế (nút/toast/icon khu quản trị)

Chủ site nhìn bản lưới năm ô vừa lên production rồi bảo: xếp các ô thành một
cột dọc bên trái làm chỉ mục, bên phải hiện luôn một lượt tất cả nội dung; bấm
một mục ở chỉ mục thì phần tương ứng sáng lên và tự cuộn tới, các phần khác mờ
đi.

`Cms.tsx` là tệp của lane Kiến trúc. Coordinator xác nhận lane ấy đã đóng, không
còn nhánh nào mở chạm tệp này, và giao việc cho lane Thiết kế.

## [ĐỔI HÀNH VI] Lưới ô thành chỉ mục dọc

`BoxGrid` → `BoxIndex`.

Trước: `display: grid`, `repeat(auto-fill, minmax(262px, 1fr))`, thẻ cỡ chữ 22,
bấm vào thì `setBox(id)` và **thay** lưới bằng đúng một ô.

Sau: `display: flex`, `flexDirection: column`, thẻ nhỏ lại (17/11.5), và
`position: sticky; top: 16` để chỉ mục không cuộn mất khi cột phải dài.

Mục đang chọn mang `aria-current` chứ không `aria-pressed`: nó không bật cái gì
lên, nó nói người ta đang đứng ở đâu trong một trang dài. Nó cũng đổi nền sang
`paper.hover` và viền sang `ink.border`, để nhìn là thấy chứ không chỉ nghe
được bằng trình đọc màn hình.

## [ĐỔI HÀNH VI] Năm phần nội dung luôn có mặt cùng lúc

Năm điều kiện `{box === 'landing' | 'modules' | 'index' | 'tag' | 'notes' && (<>…</>)}`
bỏ cổng, thành `<Section id="…" active={box}>…</Section>`.

`Section` là component mới trong cùng tệp. Nó mang `id` để cuộn tới, một
`scrollMarginTop: 72` để phần được cuộn tới không nằm khuất dưới thanh tab
dính, và `opacity: 0.34` khi có phần khác đang được chọn.

**Phần mờ vẫn bấm và sửa được.** Mờ là gợi ý nhìn, không phải khoá: người nhảy
tới `Tag` rất có thể sửa luôn dòng ngay phía trên mà không quay lại chỉ mục.

**`null` không còn là một màn riêng.** Trước, `box === null` nghĩa là "đang ở
lưới". Nay nó nghĩa là "chưa ai bấm gì", và lúc ấy **cả năm phần đều rõ như
nhau** — làm mờ bốn phần ngay khi mới mở màn là tự chọn hộ người ta một chỗ để
nhìn.

## [ĐỔI HÀNH VI] `BoxHeader` và `BACK_LABEL` bị xoá

Không còn lưới để quay về, nên thanh "← Tất cả mục" không còn nghĩa. Phần mô tả
của mỗi ô, thứ thanh ấy vẫn hiện, nay nằm ngay dưới tên mục trong chỉ mục.

`BACK_LABEL` là một export, nên xoá nó là đổi API của module — đã sửa
`Cms.sections.test.tsx`, chỗ duy nhất đọc nó.

## [SỬA LỖI] `id` neo chuyển từ tiêu đề sang chính `<section>`

Năm khối vốn có `id` đặt trên `div` tiêu đề (`<div id="landing" style={sectionHead}>`,
và `id="modules"` trên khối tiêu đề của phần module). Nay `<Section>` giữ `id`,
còn các `div` ấy đổi thành `landing-head`, `modules-head`, … và thành nhãn của
section qua `aria-labelledby`.

Phải đổi, không phải cho đẹp: để cả hai cùng mang `id="landing"` là hai phần tử
trùng `id` trong một DOM, và `scrollIntoView` sẽ cuộn tới cái tiêu đề chứ không
tới cả phần.

## [ĐỔI HÀNH VI] Nút "Trả về nội dung gốc…" không còn bị giấu

Trước nó nằm trong `{box === null && …}`, tức là chỉ hiện ở màn lưới. Nay không
có màn lưới nữa, nên nó nằm cuối cột nội dung, ngoài mọi `<Section>`.

Cố ý để nó **ngoài** mọi section: nó xoá chữ của cả năm phần một lúc nên không
thuộc phần nào, và một nút xoá lúc mờ lúc rõ là một nút xoá bấm nhầm.

## [SỬA LỖI] `pickBox` cuộn sau khi trình duyệt vẽ xong

```
const pickBox = useCallback((id: ConfigBox) => {
  setBox(id)
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}, [])
```

`requestAnimationFrame` là bắt buộc: `setBox` làm bốn phần kia mờ đi, và cuộn
trước khi React vẽ xong là cuộn theo bố cục cũ.

## Bảng, cột và endpoint đã đụng

Không có. Bản sửa này chỉ đổi cách bày, không đọc thêm hay ghi thêm gì.

## Đối chiếu ngược với bộ luật

`frontend/src/content/logic.ts`: không luật nào nói về cách bày màn quản trị,
nên không có luật nào bị đụng hay mâu thuẫn.

## Kiểm

- `npm test`: 132 tệp, 1359 bài xanh, 2 bỏ qua.
- `Cms.sections.test.tsx` viết lại, bảy bài. Hai bài trong đó là thứ coordinator
  yêu cầu và cũng là chỗ đã có người vấp: **buộc chỉ mục khớp với các phần**,
  theo cả hai chiều — mỗi mục phải có một `<section>` mang `id` của nó, và
  không `<section id>` nào được thừa ra ngoài chỉ mục.
- Đã xác minh hai bài ấy **không đỗ vống**: đổi `<Section id="tag">` thành
  `id="tags"` thì cả hai đỏ, và báo đúng tên mục lệch.
- `Cms.tags.test.tsx` và `Cms.liveValues.test.tsx` phải sửa: chúng tìm tên ô
  bằng `screen.findByText` trên cả màn, mà nay tên ô có ở hai chỗ — mục ở chỉ
  mục và tiêu đề của phần. Nay tìm trong `within(GRID_LABEL)`. Cả hai cũng phải
  gắn `Element.prototype.scrollIntoView` vì jsdom không cài sẵn.
- Nhìn bằng mắt: dựng bản tĩnh rồi chụp, cách làm ghi ở
  `docs/inbox/design/2026-09-19-nut-lech-cot-va-icon-ghim.md`.

## Đề xuất luật

Không có.

## Chưa ai nhìn tận mắt

Ảnh chụp là bản dựng tĩnh với dữ liệu giả, và cột chỉ mục trong ảnh **không**
chứng minh được `position: sticky` — ảnh tĩnh không cuộn. Ba chỗ chỉ chủ site
kiểm được trên site thật: chỉ mục có dính lại khi cuộn cột phải không, cuộn tới
có dừng đúng chỗ dưới thanh tab không, và hai cột có còn dùng được khi cửa sổ
hẹp không (hiện chưa có điểm gãy cho màn hẹp — cột trái tối thiểu 210px).
