-- 0003: restrict public read of posts to published rows only.
-- draft/archived/deleted reads go through the admin app's service_role API instead.

drop policy "posts are publicly readable" on posts;

create policy "posts are publicly readable" on posts
  for select using (status = 'published');
