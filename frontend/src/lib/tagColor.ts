/** The colours offered for a node's dot and a tag's badge, in the admin's picker order. */
export const PALETTE = ['#9D9167', '#F0B45C', '#F2A0A5', '#7FB87E', '#6FA8C0', '#C25C7C', '#8A6420', '#5C5745']

/** A tag as a post wears it: its name and the colour of its badge. */
export type Tag = { id: string; label: string; color: string }

/**
 * A tag's badge colour: the one the owner picked, else one from the palette
 * chosen by its id — so a tag nobody coloured still keeps the same colour
 * on every page and every visit, without anything written to the database.
 */
export function tagColor(id: string, picked?: string | null): string {
  if (picked) return picked
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}
