-- 0010: two more templates, and what Ghi 01 needs to carry one.
--
-- 0005 fixed `posts.template` at three values because three were all the
-- prototype had. The v4 design adds two more (merge notes §5):
--
--   long-form — the very long translated piece, headings that fold, a floating
--               table of contents. Lipids in Beans is written on it.
--   memo      — the tasting note. Unlike the other four this one does not live
--               under a module: it belongs to Ghi 01, so it is `notes` that
--               gains the ability to be one, not `posts`.

alter table posts drop constraint if exists posts_template_check;
alter table posts
  add constraint posts_template_check
  check (template in ('article', 'cards', 'report', 'longform', 'memo'));

-- ── Ghi 01 carries memos now ────────────────────────────────────────────────

-- Which template a note is read with. Plain notes stay 'note'; a memo is a
-- tasting write-up with its own layout.
alter table notes add column if not exists template text not null default 'note'
  check (template in ('note', 'memo'));

-- Pinned notes lead the list regardless of date — Ghi 01 orders by pinned
-- first, then newest (merge notes §6).
alter table notes add column if not exists pinned boolean not null default false;

-- A memo leads with a photograph rather than a caption placeholder.
alter table notes add column if not exists img text;

create index if not exists notes_pinned_d_idx on notes (pinned desc, d desc);

-- 'cảm nhận' is already among the allowed kinds, so the tasting memo needs no
-- change there — but the four fixed kinds are the design's, not a law, and a
-- memo may not fit them. Drop the constraint rather than guess at new values.
alter table notes drop constraint if exists notes_k_check;
