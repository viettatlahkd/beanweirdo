# Nhiều tác giả: hồ sơ, đồng tác giả, dòng tác giả

PR: #56    nhánh: claude/project-thread-tkjhw7
Nguồn: chủ site, 2026-09-30: "bổ sung thêm 1 module logic nữa là cho nhiều author … 1 bài có thể có nhiều co authored … cần 1 màn quản lý authored", rồi "làm kiểu chuẩn chỉnh api skeleton payload các thứ nhé".

Tác giả không có tài khoản riêng. Chủ site, 2026-09-30: "không cần đâu nhé vì làm gì có login cái gì tài khoản phức tạp đâu chỉ có 1 mã code để đăng nhập thôi mà". Khu quản trị vẫn một mã chung (`api/login.ts`), không đổi gì.

## Đã làm

- [ĐỔI HÀNH VI] Thêm tab **Tác giả** trong Content management, địa chỉ `/ad-authors` (`routes.ts:cmsTabs`, `routeWords.ts` thêm `adAuthors`). Thêm, sửa tên, slug, ảnh, tiểu sử trong hộp thoại có nút Lưu; bật/tắt và xoá nằm trong menu ba chấm (`admin/components/AuthorsPanel.tsx`). Trước: CMS có hai tab.
- [ĐỔI HÀNH VI] Màn sửa bài có dòng "Tác giả:" dưới dòng Template (`admin/components/AuthorPicker.tsx`). Thêm, bỏ, đưa lên trước. Mỗi lần đổi là ghi ngay, kể cả bài đã đăng, giống module và ghim; không chờ "Đăng thay đổi". Tôi chọn vậy, chủ site chưa được hỏi riêng.
- [ĐỔI HÀNH VI] Trang bài công khai và trang xem trước vẽ "Viết bởi …" ngay dưới dải đường dẫn, ở cả sáu khuôn (`components/Byline.tsx`, gọi từ `screens/Article.tsx` và `admin/screens/Preview.tsx` qua prop `breadcrumb`). Bài chưa ai đứng tên thì không vẽ gì, nên mọi bài hiện có trông y như cũ. Không sửa tệp nào trong `packages/post-renderer`.
- [ĐỔI HÀNH VI] Tác giả đã tắt vẫn giữ tên trên bài cũ, nhưng không thêm được vào bài mới (`api/posts/[id]/authors.ts`). Xoá tác giả còn đứng tên bài bị từ chối 409, `details.post_count` (`api/authors/[id]/index.ts`).
- Gói mới `packages/api-contract`: kiểu dữ liệu request/response và lỗi, dùng chung cho FE và BE. Chỉ có kiểu, mọi chỗ import bằng `import type`, nên cả hai bản build không phải đóng gói nó. Backend đọc qua `paths` trong `backend/tsconfig.json`; `knip.json` bỏ qua nó ở workspace backend vì lý do đó. Endpoint cũ vẫn dùng kiểu riêng của chúng.
- `backend/lib/http.ts`: `fail` trả lỗi theo đúng hình `ApiErrorBody` (`error`, `code`, `field`, `details`), mã HTTP suy từ `code`. Chỉ các endpoint tác giả dùng.
- `RowMenu` tách khỏi `PostCard.tsx` sang tệp riêng, generic theo kiểu mục, để thẻ tác giả dùng lại. Hành vi không đổi.

## Đã đụng

- Bảng mới (migration `0030_authors.sql`, chủ site chạy tay): `authors`, `post_authors`.
- Endpoint mới: `GET/POST /api/authors`, `PATCH/DELETE /api/authors/:id`, `PUT /api/posts/:id/authors`. Không thêm động từ HTTP nào ngoài `ALLOWED_METHODS` sẵn có.
- `GET /api/posts/:id` đọc thêm `post_authors` nối `authors`, trả thêm `authors`. Chưa chạy 0030 thì trả `authors: []` chứ không lỗi (`lib/authors.ts:isMissingAuthorTables`).
- Trang công khai đọc `post_authors` nối `authors` bằng khoá anon (`data/usePostAuthors.ts`). Policy của 0030 chỉ cho anon thấy tác giả của bài anon đọc được.

## Chưa làm

- Trang riêng của từng tác giả trên site công khai. Chủ site chưa yêu cầu.

## Kiểm

- `npm test` xanh. Test mới: `backend/api/authors/index.test.ts` (tạo, trùng slug, trường lạ, xoá khi còn bài, ghi đồng tác giả và bỏ người rời). `backend/api/posts/[id]/index.test.ts` thêm kiểm thứ tự dòng tác giả.
- Tab Tác giả đã mở bằng `cms-harness.html?tab=authors` (máy chủ giả), thêm một người qua hộp thoại. Ô chọn đồng tác giả trong màn sửa và dòng tác giả trên trang thật chưa xem bằng mắt: cần 0030 chạy trên database và chủ site đăng nhập.
