-- 0026: bỏ ràng buộc `check` trên `layout`, để thêm một dàn trang không còn là
-- một lần DDL trên database thật.
--
-- Dàn trang module trước đây được khai ở chín chỗ: hai bản sao của kiểu union
-- ở frontend, một danh sách ở backend, một chuỗi `if` trên trang module, một
-- chuỗi nữa ở Trang chủ, danh sách `<option>` gõ tay trong CMS, số ô ảnh ở
-- `lib/modulePageImages`, bảng tên ảnh ở `admin/moduleForm` — và hai ràng buộc
-- `check` trong SQL này.
--
-- Tám chỗ đầu nay là một hàng trong `frontend/src/content/layouts.ts`, cộng
-- một dòng trong `backend/lib/modules.ts` mà `layouts.contract.test.ts` đối
-- chiếu. Chỗ thứ chín là ràng buộc ở đây, và nó là chỗ đắt nhất: tám chỗ kia
-- đi cùng một PR, còn nó cần chủ site mở SQL Editor dán tay. Một giá trị mới
-- sẽ bị từ chối ở production trong lúc mã đã lên — đúng kiểu hỏng mà 0010 để
-- lại cho `posts.template`, im lặng hàng tháng.
--
-- Bỏ ràng buộc KHÔNG bỏ việc kiểm. `PATCH /api/modules/:id` đã đối chiếu
-- `MODULE_LAYOUTS` và trả 400 kèm danh sách giá trị hợp lệ
-- (`backend/api/modules/[id]/index.ts`), có test ở `index.test.ts` —
-- 'rejects an unknown layout'. Cái đổi là nơi giữ danh sách: một file mã đi
-- theo bản deploy, thay vì một ràng buộc chỉ đổi được bằng tay.
--
-- Chỉ `layout`. `posts.template` và `templates.renderer` giữ nguyên ràng buộc
-- (0022, 0023): mỗi template là một component React có shape prop riêng, nên
-- thêm một cái vốn đã phải deploy mã — ràng buộc ở đó không cản thêm gì, mà
-- `templateContract.test.ts` đang dựa vào nó để bắt lệch.
--
-- Hai ràng buộc này khai inline trong 0001 và 0002 nên không có tên tự đặt;
-- Postgres gọi chúng là `<bảng>_layout_check`.

alter table public.modules drop constraint if exists modules_layout_check;
alter table public.templates drop constraint if exists templates_layout_check;

comment on column public.modules.layout is
  'Tên dàn trang, đối chiếu với content/layouts.ts qua API. Không ràng buộc ở đây: thêm dàn trang là thêm mã, không phải một migration.';
