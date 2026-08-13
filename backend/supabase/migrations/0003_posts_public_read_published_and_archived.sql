-- 0003: scope public read of posts to 'published' and 'archived' rows only.
--
-- draft/deleted reads go through the admin app's service_role API instead — anon
-- never sees them. 'archived' stays anon-readable here (matching the design spec's
-- status table: draft/deleted have no public read; published shows in listings;
-- archived is public too, but only reachable by direct slug lookup — it's excluded
-- from listings/homepage by a query-level `status = 'published'` filter in the
-- frontend, not by this RLS policy).

drop policy if exists "posts are publicly readable" on posts;

create policy "posts are publicly readable" on posts
  for select using (status in ('published', 'archived'));
