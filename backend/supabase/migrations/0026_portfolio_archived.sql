-- Portfolio pages gain a third status: archived.
--
-- The two sample pages (bibi, bibe) are kept as reference layouts, not as
-- pages anyone should read — they need a state that is neither a live page
-- nor a draft in progress. RLS from 0025 is unchanged: anon still only sees
-- 'published', so an archived page is as invisible publicly as a draft.

alter table public.portfolio_pages drop constraint if exists portfolio_pages_status_check;
alter table public.portfolio_pages add constraint portfolio_pages_status_check
  check (status in ('draft', 'published', 'archived'));
