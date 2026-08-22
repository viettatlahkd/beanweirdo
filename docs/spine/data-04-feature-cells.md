# spine/data-04-feature-cells · Lưới batch của Ghi 01

nhánh: spine/data-04-feature-cells   base: origin/main

## Schema
**Migration 0018** — chủ site đã chạy 2026-08-22:
`modules.feature_cells jsonb not null default '[]'`. Cột còn rỗng; **chưa dùng**
— việc 3 (CMS) sẽ nạp nội dung vào. Ghi ở đây để lịch sử migration khớp.

## Đã đổi — việc 4
- [ĐỔI HÀNH VI] Lưới Ghi 01 dựng theo **batch 8 bài + 7 ô feature = 15 ô**,
  năm hàng mỗi hàng ba ô. Quá tám bài thì mở batch mới, lặp lại nhịp cũ.
- [ĐỔI HÀNH VI] Ô feature **chỉ hiện khi hàng của nó đã có bài**. Chưa bài nào
  thì không ô nào — không trang trí quanh chỗ trống.
- [ĐỔI HÀNH VI] Ghi chú rời thôi kéo ô feature. Ô feature thuộc lưới bài.

## Luật, đúng như chủ site chốt
| Số bài | Ô feature hiện |
|---|---|
| 0 | không ô nào |
| 3 | F1, F2 — F3 chưa, vì hàng của nó chưa có bài |
| 7 | thêm F4, F6 — hai ô cạnh nhau, chấp nhận |
| 8 | đủ 7 ô; bài 8 kéo theo **cả F5 và F7** cùng hàng |
| 9 | batch 2 mở, F1 của batch mới hiện theo bài 9 |

## Cấu trúc một batch
```
hàng 1   BÀI1·5   BÀI2·4   F1·3
hàng 2   BÀI3·4   F2·3     BÀI4·5
hàng 3   BÀI5·5   F3·3     BÀI6·4
hàng 4   F4·3     F6·3     BÀI7·4
hàng 5   F5·4     BÀI8·4   F7·3
```

## Tách khỏi màn hình
Việc xếp lưới nằm ở `lib/notesGrid.ts`, không nằm trong `Notes.tsx` — đọc và
kiểm được riêng. **Ô feature đi qua một cửa duy nhất**, nên việc 3 chỉ cần đổi
nguồn dữ liệu ở đó, không đụng lưới.

## Kiểm chứng
`notesGrid.test.ts` — 7 test, mỗi luật một test. Đo trên trang thật:
`3 bài → BÀI BÀI F1 BÀI F2` · `8 bài → 15 ô` · `9 bài → 17 ô (9 bài + 8 ô)`.
320 test xanh.

## Còn nợ
Việc 3 (CMS) và việc 5 (ghim ở mọi trang module). Chủ site muốn xem giao diện
CMS trước khi tôi dựng, nên việc 3 để cuối.
