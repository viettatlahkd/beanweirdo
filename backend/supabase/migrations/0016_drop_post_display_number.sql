-- `posts.n` held a display number written at authoring time: the post's place
-- in the module's running order, counted over every post whatever its status.
--
-- That is not a number a reader can count along with. With five of biochem's
-- six posts archived, the one still published introduced itself as "05". Every
-- screen now numbers a post by where it sits in the list being shown, so the
-- stored number had no reader left — and `sort_order` already carries the only
-- thing it encoded.
--
-- ORDER MATTERS: ship the code that stops writing this column first. The
-- reorder endpoint used to write `n` on every drag, and would fail once the
-- column is gone.

alter table public.posts drop column if exists n;
