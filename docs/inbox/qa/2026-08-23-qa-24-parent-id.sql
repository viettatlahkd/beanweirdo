-- Chuẩn bị cho QA-17 (một hoạt động nhiều lần thực hiện).
-- Đây là DDL, REST API không chạy được — cần dán vào SQL Editor của Supabase.
-- File này để ở lane QA vì nó là thứ tôi chuẩn bị sẵn; thư mục
-- backend/supabase/migrations/ thuộc lane kiến trúc, ai đánh số thì do chủ site
-- phân công.

alter table hour_logs
  add column if not exists parent_id uuid references hour_logs(id) on delete cascade;

-- Mọi truy vấn thống kê đều lọc theo cột này, và mọi lần vẽ một ngày đều gom
-- con theo cha — cả hai đều tra ngược từ parent_id.
create index if not exists hour_logs_parent_idx on hour_logs (parent_id);

-- Hai ràng buộc còn lại — chỉ một tầng, và con cùng ngày với cha — được kiểm ở
-- tầng API (backend/api/hours.ts) chứ không bằng trigger: một luật đơn giản thì
-- dễ đọc trong mã hơn là trong schema, và lỗi trả về cho người dùng cũng rõ hơn.
