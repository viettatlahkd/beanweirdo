-- A module may sit inside another module.
--
-- The table of contents was a flat list: `modules` had no way to say that
-- Roasting belongs under bean weirdo, so the site could only ever draw two
-- levels — module, then post. Every surface that walks the site (breadcrumbs,
-- sidebar, the CMS site map, the address bar) hard-coded that depth of two
-- independently, because there was nothing in the data to read it from.
--
-- One self-referencing column is the whole change. Depth stops being a number
-- written into six files and becomes a fact about a row.
--
-- `on delete restrict`, not `cascade`: `posts` cascades from its module
-- because a post cannot outlive the module it was filed under, but a module
-- holding other modules holds published writing further down. Deleting a
-- branch must not quietly take a subtree of readable pages with it — empty it
-- first, deliberately.
--
-- There is no `path` or `depth` column on purpose. Every surface already loads
-- the whole `modules` table in one query, so an ancestor walk is done in memory
-- from `parent_id` alone. A second column saying the same thing is a value
-- kept in step in two places, which is a value that will eventually disagree
-- with itself — the same reasoning that left `hour_logs` without one.
--
-- Cycles (a module that is its own ancestor) are refused by the API rather
-- than by a trigger, following 0019: one small rule reads more plainly in code
-- than in the schema, and the error it raises can say something useful.

alter table public.modules
  add column if not exists parent_id text references public.modules(id) on delete restrict;

-- Every read of the tree asks "which modules have this parent", never the
-- other way round.
create index if not exists modules_parent_idx on public.modules (parent_id);

comment on column public.modules.parent_id is
  'The module this one sits inside; null means it is a top-level entry. Depth is not limited.';
