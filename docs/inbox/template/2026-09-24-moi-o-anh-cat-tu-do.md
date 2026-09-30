# PR #42 · nhánh `claude/project-thread-2j8wz9` — mọi ô ảnh cắt tự do, ảnh bấm được

## [ĐỔI HÀNH VI] Ô ảnh cố định của mọi template mở hộp cắt tay thay cho khung căn
- Trước: nút ở góc ô ảnh (Article, Bitesize, Long-form, ảnh bìa) mở `FocusPicker`: khung khoá theo hình ô, chỉ dời được điểm căn.
- Sau: cùng `CropPicker` với khối ảnh trong thân bài. Có thêm lựa chọn "Vừa ô" (đúng hình ô cũ) đứng đầu và chọn sẵn; chọn Gốc, Tự do, 16:9… thì ô đổi hình theo.
- Chỗ: `FramingProvider` trong `admin/components/framing.tsx` (cả `frame` lẫn `crop` nay vẽ `CropPicker`); prop `cell` và hằng `FIT` trong `CropPicker.tsx`.
- Chủ site: "sửa hết thành freesize, 16:9 hoặc gì gì bạn mới sửa đi. sửa hết rà tất cả các chỗ ảnh".
- Chưa đổi: ảnh module, ô trang chủ (`ModuleImages.tsx`, `FeatureCellsEditor.tsx`) và ảnh đại diện ở `Cms.tsx` vẫn dùng `FocusPicker`. Những ô ấy có hình do trang quyết, nhiều hình khác nhau cho cùng một ảnh.

## [ĐỔI HÀNH VI] Ô ảnh trên trang lấy hình của khung đã cắt
- `fillStyle` (`post-renderer/src/focus.ts`): địa chỉ có `#crop=` thì trả `cropStyle` kèm `height: 'auto'`, nên `aspectRatio` của khung cắt thắng chiều cao khuôn đặt. Địa chỉ không có `#crop=` (mọi ảnh đăng trước đây) vẽ y như cũ.
- `cropStyle`: `backgroundSize` đổi từ `W% H%` sang `W% auto`. Khi ô đúng hình khung cắt thì hai cách như nhau; khi khuôn vẫn ghim hình ô (khung hồng Article trên desktop cao bằng băng màu) thì ảnh không bị bóp méo, phần thừa là màu nền ô.
- Long-form `fig` (`Longform.tsx`, hai chỗ): có `#crop=` thì dùng `cropStyle` thay cho `contain`.
- Memo (`Memo.tsx`): ô ảnh features đổi từ `<img objectFit=cover>` sang `fillStyle`. `<img>` bỏ qua cả `#focus=` lẫn `#crop=`.

## [ĐỔI HÀNH VI] Memo: ô ảnh features có nút và hiện ảnh trong khung sửa
- `MemoEditor` (`admin/screens/Editor.tsx`) truyền `renderPlateAction` ghi `hero_image_url`. Bỏ hàm `withoutHero`, chỗ gọi cuối cùng. Trước đây ô này không có nút và giấu ảnh bìa trong khung sửa ("hiện 1 chỗ thôi chứ?").
- Sửa hai test cũ ghi hành vi trước: `Editor.mount.test.tsx`, `Editor.plates.test.tsx`.

## [ĐỔI HÀNH VI] Ảnh trong thân bài bấm được
- `ImageAttrs.href` (`post-renderer/src/elements/media.tsx`): có link thì ảnh bọc trong `<a target="_blank" rel="noopener noreferrer">`. `safeHref` chỉ cho `http(s):`, `mailto:`, đường dẫn bắt đầu bằng `/`; địa chỉ thiếu giao thức được thêm `https://`; `javascript:` và giao thức lạ bị bỏ.
- Markdown: `bodyToMarkdown` (`elements/write.ts`) viết `[![chú thích](ảnh)](link)`; `pastedToBlocks` (`elements/paste.ts`, `LINKED_IMAGE`) đọc lại.
- Màn sửa: `ImageBlockEditor` có ô "link khi bấm vào ảnh (tuỳ chọn)" dưới chú thích, chỉ hiện khi đã có ảnh.
- Chủ site chưa bấm thẻ chọn nghĩa của "lưu hyperlink"; tôi làm theo phương án đề xuất ("ảnh bấm được") và đã báo trong luồng.

## Bảng, cột, endpoint
- Không đụng cột mới. Khung cắt ghi trên địa chỉ ảnh (`#crop=`) trong `posts.hero_image_url`, `posts.plate_images`, `posts.body`; link đích nằm trong `posts.body` (khối ảnh).

## Kiểm
- `npm test` 1500 xanh, `vite build` xanh.
- Chromium, trang thử dựng tạm (đã xoá): Article ô chính 1:1 (308→452px cao), ô ảnh trong phần 16:9 (284→123px), khung hồng 16:9; Long-form fig 16:9 (426→360px); Memo features 16:9 (423→555px); Bitesize ô phụ 4:5.
