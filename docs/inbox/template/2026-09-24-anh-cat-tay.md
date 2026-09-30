# PR #35 · nhánh `claude/project-thread-2j8wz9` — ảnh trong bài

## [ĐỔI HÀNH VI] Khối ảnh trong thân bài cắt tay được
- Trước: ô ảnh cao cứng (sửa 160px, trang 250px), khung căn khoá dải ngang.
- Sau: tải lên / dán link / "đặt vào khung" mở `CropPicker` (`frontend/src/admin/components/CropPicker.tsx`, qua `useCropping` trong `framing.tsx`). Kết quả ghi lên URL: `#crop=x,y,w,h,ratio` (`withCrop`, `readCrop`, `cropStyle` trong `packages/post-renderer/src/focus.ts`). `elements/media.tsx` vẽ theo `cropStyle`; ảnh không có `#crop` giữ 250px.
- `stripFocus` nay bỏ cả `#crop`; `readFocus` đổi crop thành điểm căn gần đúng khi ảnh rơi vào ô cố định.

## [ĐỔI HÀNH VI] Gỡ ảnh ở khối ảnh
- `ImageBlockEditor` (`Editor.tsx`) có bốn nút `PlateUpload`. Gỡ ảnh thay khối bằng `{ type: 'paragraph', text: '' }`.

## [ĐỔI HÀNH VI] Article · khung ảnh hồng (`heroPlate`)
- `toArticleData`: `imageUrl = plate_images.hero ?? hero_image_url`. Màn sửa có nút cho khóa `hero`, và không còn bỏ ảnh bìa khỏi bản vẽ của `ArticleEditor`.

## [ĐỔI HÀNH VI] Bitesize · ô phương tiện
- `BitesizeEditor` nhận `onHeroDrop`, `hero` từ `EditorCanvas`; ô `hero` có nút đi đường `setHero`/`heroActions`. Clip thêm nút "tải ảnh thumbnail" ghi `body.poster`. Màn sửa vẽ ảnh bìa trong ô (trước dùng `withoutHero`).

## Bảng, cột, endpoint đã đụng
- `posts.plate_images` (khóa mới `hero`), `posts.body` (`poster`, ảnh trong `elements`/sections), `posts.hero_image_url`. `PATCH /api/posts/:id`, `POST` upload ảnh. Không migration.

## Đề xuất luật
- Điều "ảnh bìa chỉ hiện một chỗ trong màn sửa" (ghi ở `CoverBand.tsx`) nay không còn đúng cho Article và Bitesize.
