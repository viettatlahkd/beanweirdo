-- A module is classified two ways, and the two are independent.
--
--   kind        normal   — a reading module, one of the gallery on the homepage
--               special  — extended content that already has a page of its own
--                          (Ghi 01, Ghi 02)
--
--   visibility  public   — anyone may see it listed
--               private  — only visible inside a signed-in area
--
-- Before this column the two ideas were collapsed into one: every `special`
-- module was hidden from the homepage, the index and the sidebar alike. That
-- hid Ghi 01, which is public and belongs in the index — being special is not
-- the same as being hidden.

alter table public.modules
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private'));

-- Ghi 02 is the practice journal; it lives behind the login.
update public.modules set visibility = 'private' where id = 'ghi02';

comment on column public.modules.visibility is
  'public — listed wherever its kind allows; private — never listed outside a signed-in area.';
