-- 0012: modules come in two kinds, and the journals are the second kind.
--
-- `posts.module_id` says where a piece of writing belongs, but only the three
-- reading modules existed — so anything belonging to Ghi 01 had nowhere to
-- point. The tasting memo ended up in `notes` with a screen and a body shape of
-- its own: three special cases for one post, when Sensory Lexicon and Lipid are
-- ordinary rows differing by `template` alone.
--
-- Ghi 01 and Ghi 02 become modules so posts can be filed under them — but
-- marked as what they are. A normal module is a reading collection: it has a
-- colour block, a layout, image slots, and it is pulled onto the landing page
-- and the index. A special module is a place to file something. It has a page
-- already, of its own design, and none of that presentation applies.
--
-- Hence the flag rather than inventing a layout and three shot captions for
-- rows that will never render as a module page.

alter table modules add column if not exists kind text not null default 'normal'
  check (kind in ('normal', 'special'));

comment on column modules.kind is
  'normal = reading module, listed on the landing page and index. special = a journal that already has its own page; a valid module_id, never listed as a module.';

-- The presentation columns are NOT NULL, so they are filled with empty strings
-- rather than invented values — empty is honest here, since nothing reads them
-- for a special module. `accent` carries the colour the sidebar already uses.
insert into modules (
  id, title, accent, on_color, tint, tint2, layout, concept, blurb,
  long_desc, treatment, layout_note, shot1, shot2, shot3, sort_order, kind
) values
  ('ghi01', 'Ghi 01', '#6FA8C0', '#0E2C38', '', '', 'band', '', '', '', '', '', '', '', '', 101, 'special'),
  ('ghi02', 'Ghi 02', '#C25C7C', '#3B2A2B', '', '', 'band', '', '', '', '', '', '', '', '', 102, 'special')
on conflict (id) do nothing;
