-- Sửa 0028: bảng nháp chưa cấp quyền, và gộp lưu nháp / đăng thành một lượt.
--
-- 1. Quyền. Dự án này không có default privileges (xem 0006): bảng mới tạo
--    bằng SQL Editor thì `service_role` cũng không đọc ghi được, dù nó vượt
--    RLS. 0028 quên câu `grant`, nên mọi lần API đụng `post_drafts` đều nhận
--    `permission denied for table post_drafts` — và API cũ đọc lỗi ấy là
--    "bảng chưa có", lùi về ghi thẳng vào `posts`. Tức là sửa bài đã đăng vẫn
--    lên trang ngay, đúng cái 0028 định chặn.
--
-- 2. Hai hàm, mỗi hàm một lượt gọi thay cho ba bốn lượt. Máy chủ API chạy ở
--    Mỹ, database ở Tokyo: mỗi lượt đi về là một khoảng chờ thấy được, và
--    Publish từng xếp năm lượt nối đuôi nhau.
--
--    `stage_post_draft`  — PATCH của màn sửa: bài đã đăng thì gộp các ô vào
--                          bản nháp (jsonb `||`), trả về trạng thái của bài.
--    `fold_post_draft`   — Publish / gỡ đăng: chép bản nháp vào `posts` rồi
--                          xoá nó, trả về trạng thái và có chép gì không.
--
-- Số hiệu 0029: 0028 là migration cuối đã chạy.

grant all on public.post_drafts to service_role;

create or replace function public.stage_post_draft(p_id uuid, p_content jsonb, p_now timestamptz)
returns text
language plpgsql
set search_path = public
as $$
declare
  s text;
begin
  select status into s from posts where id = p_id;
  if s is null or s <> 'published' then
    -- null: không có bài ấy. Trạng thái khác: bài chưa lên trang, API ghi thẳng.
    return s;
  end if;
  insert into post_drafts (post_id, data, updated_at)
  values (p_id, p_content, p_now)
  on conflict (post_id) do update
    set data = post_drafts.data || excluded.data,
        updated_at = excluded.updated_at;
  return s;
end
$$;

create or replace function public.fold_post_draft(p_id uuid, p_now timestamptz)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  s text;
  d jsonb;
begin
  select status into s from posts where id = p_id for update;
  if s is null then
    return null;
  end if;
  delete from post_drafts where post_id = p_id returning data into d;
  if d is not null and d <> '{}'::jsonb then
    -- jsonb_populate_record lấy hàng hiện tại làm nền: ô nào bản nháp không
    -- nhắc tới thì giữ nguyên giá trị đang đăng.
    update posts p
       set (en, vi, body, theme_color, hero_image_url, hero_caption, plate_images,
            lead, pull_quote, further_reading, date_label, thumbnail_url)
         = (select r.en, r.vi, r.body, r.theme_color, r.hero_image_url, r.hero_caption, r.plate_images,
                   r.lead, r.pull_quote, r.further_reading, r.date_label, r.thumbnail_url
              from jsonb_populate_record(p, d) r),
           updated_at = p_now
     where p.id = p_id;
  end if;
  return jsonb_build_object('status', s, 'applied', d is not null and d <> '{}'::jsonb);
end
$$;

revoke all on function public.stage_post_draft(uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.fold_post_draft(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.stage_post_draft(uuid, jsonb, timestamptz) to service_role;
grant execute on function public.fold_post_draft(uuid, timestamptz) to service_role;

-- Kiểm: phải ra 3 dòng — quyền của service_role trên bảng, và hai hàm.
select 'grant' as what, count(*)::text as n
  from information_schema.role_table_grants
 where table_name = 'post_drafts' and grantee = 'service_role'
union all
select proname, 'ok' from pg_proc where proname in ('stage_post_draft', 'fold_post_draft');
