/**
 * Notes beside a post — one element with two things inside.
 *
 * A post can carry notes the way it carries a photograph or a table: as part
 * of its content, not as a property of the template. That is why this file is
 * its own module rather than a corner of `types.ts` — the report is the first
 * template to draw notes, and it will not be the last.
 *
 * The two things are not two ways of showing the same list:
 *
 *   Explorations  are consecutive — written or pasted as a run, read top-down,
 *                 and about the post as a whole. Nothing anchors them.
 *   Field notes   are peer to peer — each one belongs beside one block, the way
 *                 a comment belongs beside the line it argues with. Move the
 *                 block and the note goes with it, because the note holds the
 *                 block's `id`, not its position.
 *
 * A post may have neither, one, or both. Both halves exist from the moment the
 * notes element is added; the half with nothing written in it simply does not
 * draw. So there is no "turn on field notes" step to find — you write, and it
 * appears.
 */

/** One bullet in the consecutive run. */
export type Exploration = {
  id: string
  text: string
}

/**
 * One comment, anchored to a block.
 *
 * `anchor` is a block's `id`. An anchor pointing at a block that no longer
 * exists is not an error to repair — see `orphanNotes`, which is how the
 * editor asks where such a note should go instead of deciding for the writer.
 */
export type FieldNote = {
  id: string
  anchor: string
  text: string
}

export type PostNotes = {
  explorations: Exploration[]
  fieldNotes: FieldNote[]
}

export const EMPTY_NOTES: PostNotes = { explorations: [], fieldNotes: [] }

/** Written-in entries only — a bullet holding nothing but spaces is not content. */
const written = <T extends { text: string }>(items: T[]): T[] =>
  items.filter((i) => i.text.trim().length > 0)

export function liveExplorations(notes: PostNotes | undefined): Exploration[] {
  return written(notes?.explorations ?? [])
}

export function liveFieldNotes(notes: PostNotes | undefined): FieldNote[] {
  return written(notes?.fieldNotes ?? [])
}

/** The field notes hanging off one block, in the order they were written. */
export function notesOn(notes: PostNotes | undefined, blockId: string | undefined): FieldNote[] {
  if (!blockId) return []
  return liveFieldNotes(notes).filter((n) => n.anchor === blockId)
}

/** Notes whose block is gone — the editor asks the writer where to put these. */
export function orphanNotes(notes: PostNotes | undefined, blockIds: string[]): FieldNote[] {
  const alive = new Set(blockIds)
  return liveFieldNotes(notes).filter((n) => !alive.has(n.anchor))
}

/** True when anything at all is written — decides whether the column draws. */
export function hasNotes(notes: PostNotes | undefined): boolean {
  return liveExplorations(notes).length > 0 || liveFieldNotes(notes).length > 0
}

/**
 * What this post's field notes are called.
 *
 * The constraint is the writer's: a post belongs to a module, so it wears that
 * module's colour, and it is written on a template, so it takes that template's
 * name. Colour comes from the band the post already carries; the name comes
 * from here. "Explorations" is the same word everywhere — it is the writer
 * thinking aloud, and that does not change shape with the template.
 */
export function fieldNotesLabel(template: string | null | undefined): string {
  switch (template) {
    case 'report':
      return 'Field notes'
    case 'memo':
      return 'Memo notes'
    case 'article':
      return 'Article notes'
    case 'cards':
      return 'Card notes'
    case 'longform':
      return 'Longform notes'
    default:
      return 'Notes'
  }
}

export const EXPLORATIONS_LABEL = 'Explorations'

/**
 * Reads whatever the database holds into the shape above.
 *
 * `body` is jsonb, so a post written before notes existed has none, and a post
 * written by hand may have half of one. Anything unreadable becomes an empty
 * half rather than an exception — a missing note is a note nobody wrote.
 */
export function readNotes(value: unknown): PostNotes {
  const v = value as Partial<PostNotes> | null | undefined
  return {
    explorations: Array.isArray(v?.explorations)
      ? v.explorations.filter(isExploration)
      : [],
    fieldNotes: Array.isArray(v?.fieldNotes) ? v.fieldNotes.filter(isFieldNote) : [],
  }
}

function isExploration(x: unknown): x is Exploration {
  const e = x as Partial<Exploration>
  return typeof e?.id === 'string' && typeof e?.text === 'string'
}

function isFieldNote(x: unknown): x is FieldNote {
  const n = x as Partial<FieldNote>
  return typeof n?.id === 'string' && typeof n?.anchor === 'string' && typeof n?.text === 'string'
}

/**
 * The next free id in a set — `n1`, `n2`, and so on.
 *
 * Ids only have to be unique inside one post, so counting up from what is
 * already there beats a random string: the same edit produces the same id, and
 * a diff of the stored body stays readable to a person.
 */
export function nextId(prefix: string, taken: readonly string[]): string {
  const used = new Set(taken)
  for (let n = 1; ; n += 1) {
    const id = `${prefix}${n}`
    if (!used.has(id)) return id
  }
}
