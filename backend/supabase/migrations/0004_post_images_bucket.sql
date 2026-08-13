-- 0004: storage bucket for post hero + inline images.
-- Public read (site needs to display images to signed-out visitors).
-- No insert/update/delete policy for anon or authenticated — uploads go through
-- the admin app's API routes using the service_role key, same pattern as posts writes.

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "post images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'post-images');
