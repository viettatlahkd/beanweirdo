-- Two ways a post can be ordered, and they are not the same thing.
--
-- `published_at` is the order posts fall into by themselves. `sort_order` is
-- the order someone chose by hand, and until someone does choose it stays
-- null — that is what tells the two apart. Before this, every post carried a
-- number the system had assigned, so there was no way to know whether an order
-- was meant or merely inherited, and two sensory posts had both ended up as 1.
--
-- `pinned` sits above both: a pinned post leads its module however the rest
-- are sorted.

alter table public.posts add column if not exists pinned boolean not null default false;
alter table public.posts alter column sort_order drop not null;

-- Clear the numbers the system assigned; nobody chose them.
update public.posts set sort_order = null;

create index if not exists posts_module_order_idx
  on public.posts (module_id, pinned desc, sort_order, published_at desc);

comment on column public.posts.pinned is
  'Leads its module regardless of the rest of the ordering.';
comment on column public.posts.sort_order is
  'A hand-picked position. Null means nobody has picked one — fall back to published_at.';
