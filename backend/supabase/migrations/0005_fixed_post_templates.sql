-- 0005: replace the free-mix "templates" library (layout + 4 colors, admin-
-- creatable) with a fixed 3-value enum directly on posts.
--
-- Design changed after reviewing the project's own Claude Design source
-- (Coffee Study Blog v4.dc.html): the site already has 3 real, structurally
-- distinct post templates baked into the prototype — 'article' (essay, 2-col
-- + sticky rail), 'cards' (expandable glossary-style card list), 'report'
-- (block-based editable document with metrics/chart/table blocks). These are
-- not a color-mix system on top of one shape; each is its own component with
-- its own fixed header color. So the admin-manageable `templates` table (and
-- the arbitrary layout+color combinations it implied) no longer matches
-- reality — drop it.

alter table posts drop constraint if exists posts_template_id_fkey;
alter table posts drop column if exists template_id;
drop table if exists templates;

alter table posts
  add column template text not null default 'article'
    check (template in ('article', 'cards', 'report'));
