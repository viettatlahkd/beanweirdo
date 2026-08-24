-- A line the owner attaches to an activity — most often a URL: the paper that
-- was read, the repo that was worked on.
--
-- It lives on the activity rather than in its name because a name is what the
-- work was, and a link is where the work is. Squeezing an address into the name
-- made the day list unreadable: a full URL runs thirty to a hundred characters
-- of query string and hash, says nothing about where it leads, and drowns the
-- one thing the row is for.
--
-- Null and empty both mean "no note" — nothing displays a note field on a row
-- that has none, so the two states are the same to every screen.
--
-- Already applied by hand on the hosted database (SQL Editor, 2026-08-23), so
-- this file exists for a database being built from nothing. `if not exists`
-- keeps it safe to run against either.

alter table public.hour_logs
  add column if not exists note text;
