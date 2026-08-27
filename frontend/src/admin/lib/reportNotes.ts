/**
 * What happens to the blocks and their notes when the writer moves things.
 *
 * All of it is here rather than inside the editor component because these are
 * the decisions worth being sure about — where a note goes when its block is
 * deleted, whether an emptied block disappears — and a decision inside a
 * component can only be checked by driving the screen.
 */
import { nextId, type FieldNote, type PostNotes, type ReportBlock } from 'post-renderer'

/** Blocks and their notes always travel together; nothing here changes one alone. */
export type ReportContent = {
  blocks: ReportBlock[]
  notes: PostNotes
}

/**
 * Gives every block an id.
 *
 * A note anchors to an id, so a post written before notes existed has nothing
 * to hang one on. Rather than make the writer repair old posts, the editor
 * names the blocks the first time it opens one — ids already there are kept, so
 * existing notes stay attached.
 */
export function ensureIds(blocks: ReportBlock[]): ReportBlock[] {
  const taken = blocks.map((b) => b.id).filter((id): id is string => typeof id === 'string')
  return blocks.map((b) => {
    if (b.id) return b
    const id = nextId('b', taken)
    taken.push(id)
    return { ...b, id }
  })
}

/**
 * Blocks that vanish when the writer empties them.
 *
 * A paragraph with no text in it is not a paragraph waiting to be written —
 * it is the absence of a paragraph, and the writer already said so by deleting
 * the words. Everything else keeps its place: emptying a heading almost always
 * means rewriting the heading, and losing the slot would be a second, unasked
 * deletion.
 */
export function vanishesWhenEmpty(block: ReportBlock): boolean {
  return block.type === 'paragraph'
}

/** Where the writer can send the notes of a block being deleted. */
export type KeepChoice = 'up' | 'down' | 'explorations' | 'delete'

/**
 * Removes a block, and does with its notes whatever the writer chose.
 *
 * Deleting a block is not by itself an instruction about the writing beside it,
 * which is why the editor asks. 'up' and 'down' re-anchor to the neighbouring
 * block; with no neighbour on that side the note would have nothing to hold, so
 * it goes to the explorations rather than quietly disappearing.
 */
export function removeBlock(content: ReportContent, index: number, choice: KeepChoice): ReportContent {
  const { blocks, notes } = content
  const target = blocks[index]
  if (!target) return content

  const moving = target.id ? notes.fieldNotes.filter((n) => n.anchor === target.id) : []
  const staying = notes.fieldNotes.filter((n) => !moving.includes(n))
  const remaining = blocks.filter((_, i) => i !== index)

  if (choice === 'delete' || moving.length === 0) {
    return { blocks: remaining, notes: { ...notes, fieldNotes: staying } }
  }

  const neighbour = choice === 'up' ? blocks[index - 1] : blocks[index + 1]
  if (choice !== 'explorations' && neighbour?.id) {
    const anchor = neighbour.id
    return {
      blocks: remaining,
      notes: { ...notes, fieldNotes: [...staying, ...moving.map((n) => ({ ...n, anchor }))] },
    }
  }

  const taken = notes.explorations.map((e) => e.id)
  const carried = moving.map((n) => {
    const id = nextId('n', taken)
    taken.push(id)
    return { id, text: n.text }
  })
  return {
    blocks: remaining,
    notes: { explorations: [...notes.explorations, ...carried], fieldNotes: staying },
  }
}

/** Two blocks swap places; the notes do not move, because they hold ids. */
export function moveBlock(blocks: ReportBlock[], from: number, to: number): ReportBlock[] {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return blocks
  const next = [...blocks]
  const [lifted] = next.splice(from, 1)
  next.splice(to, 0, lifted)
  return next
}

/**
 * Copies a block and its notes in beneath it.
 *
 * The notes come along: a copy is made to be edited into something new, and
 * the writing beside the original is the best starting point there is for it.
 */
export function cloneBlock(content: ReportContent, index: number): ReportContent {
  const { blocks, notes } = content
  const source = blocks[index]
  if (!source) return content

  const takenBlocks = blocks.map((b) => b.id).filter((id): id is string => typeof id === 'string')
  const id = nextId('b', takenBlocks)
  const copy: ReportBlock = { ...source, id }
  const next = [...blocks]
  next.splice(index + 1, 0, copy)

  const takenNotes = [...notes.explorations, ...notes.fieldNotes].map((n) => n.id)
  const carried: FieldNote[] = (source.id ? notes.fieldNotes.filter((n) => n.anchor === source.id) : []).map((n) => {
    const noteId = nextId('n', takenNotes)
    takenNotes.push(noteId)
    return { id: noteId, anchor: id, text: n.text }
  })

  return { blocks: next, notes: { ...notes, fieldNotes: [...notes.fieldNotes, ...carried] } }
}

/** The block a deleted one merges into — the nearest text above it, if any. */
export function mergeTarget(blocks: ReportBlock[], index: number): number | null {
  for (let i = index - 1; i >= 0; i -= 1) {
    const t = blocks[i].type
    if (t === 'paragraph' || t === 'heading' || t === 'meta') return i
  }
  return null
}

/**
 * The stored `body`: the blocks, then the notes element beside them.
 *
 * Notes ride in `body` so they travel with the post when it is cloned and need
 * no column of their own. They are written last and read by key, never by
 * position, so a hand-edited body cannot put the notes where a block should be.
 */
export function toBody(content: ReportContent): unknown[] {
  const { blocks, notes } = content
  const empty = notes.explorations.length === 0 && notes.fieldNotes.length === 0
  return empty ? [...blocks] : [...blocks, { type: 'notes', ...notes }]
}
