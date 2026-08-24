-- One activity, done in several sittings.
--
-- `beanweirdo: web code` on the 21st ran 13:42–16:42 and again 23:10–00:30:
-- one piece of work, two rows, seven hours apart, and no way for the journal to
-- say they were the same thing. Statistics counted two activities and the eye
-- had to add 3h and 1h20 by itself.
--
-- A row with a parent is a sitting of it. Nesting stops at one level: a sitting
-- may not itself be a parent. That rule is enforced in the API rather than by a
-- trigger — one small rule reads more plainly in code than in the schema, and
-- the error it raises can say something useful.
--
-- `on delete cascade` is the point of the foreign key: deleting an activity has
-- to take its sittings with it, or they become rows belonging to nothing that
-- still count towards the day's total.
--
-- Note for anyone reading a total: the minutes live in the *sittings*, and the
-- heading above them holds none of its own. Every sum filters accordingly —
-- see `countable` in the frontend. A heading's own `mins` is left at whatever
-- it was before it became one, and nothing keeps it in step, on purpose: a
-- number kept in step in two places is a number that will disagree with itself.
--
-- Already applied by hand on the hosted database (SQL Editor, 2026-08-23), so
-- this file exists for a database being built from nothing.

alter table public.hour_logs
  add column if not exists parent_id uuid references public.hour_logs(id) on delete cascade;

-- Every draw of a day groups sittings under their heading, and every total
-- filters on this column — both look it up by parent, never by child.
create index if not exists hour_logs_parent_idx on public.hour_logs (parent_id);
