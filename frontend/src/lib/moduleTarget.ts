import type { ModuleRow } from '../data/useModules'
import type { Nav } from './nav'

/**
 * A special module already has a screen written for it — Ghi 01 is the notes
 * page, Ghi 02 the practice journal — so opening one goes there rather than to
 * the generic module page.
 *
 * Only the id → screen link lives here. Everything a reader sees (title,
 * colour, order) comes from the database, so renaming Ghi 01 in the CMS
 * renames it everywhere without touching this file.
 */
const SPECIAL_SCREEN: Record<string, (nav: Nav) => void> = {
  ghi01: (nav) => nav.goNotes(),
  ghi02: (nav) => nav.goHours(),
}

const SCREEN: Record<'notes' | 'hours', (nav: Nav) => void> = {
  notes: (nav) => nav.goNotes(),
  hours: (nav) => nav.goHours(),
}

export function openModule(nav: Nav, m: ModuleRow & { screen?: 'notes' | 'hours' }): void {
  // A page says which screen it has (migration 0028); a bare module row still
  // goes by its id.
  const special = m.screen ? SCREEN[m.screen] : SPECIAL_SCREEN[m.id]
  if (special) special(nav)
  else nav.openModule(m.id)
}
