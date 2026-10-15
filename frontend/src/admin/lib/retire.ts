import {
  createKeyword,
  createNode,
  deleteKeyword,
  deleteNode,
  getLayout,
  listPosts,
  reorderNodes,
  saveOverride,
  updatePost,
  updateNode,
  type Keyword,
  type LayoutOverride,
  type Node,
} from './apiClient'
import { TAG_PAGE } from '../../lib/routes'

/**
 * Deleting a topic or a tag, with its posts moved somewhere first.
 *
 * This lived in Nội dung, beside the posts it moves. Since 2026-10-13 it is
 * done from the item's ⋮ in Cấu hình, like every other delete (the owner's
 * one-template ask), so it is a plain module both could call.
 */

type Retired = { msg: string; revert: () => Promise<unknown> }

/**
 * The retired node's address (and the ones it already forwarded) become old
 * addresses of the node its posts went to, so a link to the old page lands
 * on the new one instead of nothing — the database drops the override of a
 * deleted node (migration 0028), and with it every alias it held.
 */
async function forward(type: 'topic' | 'keyword', from: string, to: string): Promise<() => Promise<unknown>> {
  const { overrides } = await getLayout()
  const mine = overrides.find((o) => o.node_type === type && o.node_id === from)
  const theirs = overrides.find((o) => o.node_type === type && o.node_id === to)
  const asAlias = type === 'topic' ? from : `${TAG_PAGE}${from}`
  const added = [asAlias, ...(mine?.aliases ?? [])].filter((a) => !(theirs?.aliases ?? []).includes(a))
  if (added.length) await saveOverride({ node_type: type, node_id: to, aliases: [...(theirs?.aliases ?? []), ...added] })
  return async () => {
    if (added.length) await saveOverride({ node_type: type, node_id: to, aliases: theirs?.aliases ?? [] })
    if (mine) await saveOverride(mine as LayoutOverride)
  }
}

/** Posts filed on the topic itself move to `to`; a topic with children is refused before this is offered. */
export async function retireTopic(t: Node, to: { id: string; title: string } | null, topics: Node[]): Promise<Retired> {
  const moved = (await listPosts('all')).filter((p) => p.topic_id === t.id)
  const siblings = topics.filter((x) => x.parent_id === t.parent_id).sort((a, b) => a.sort_order - b.sort_order).map((s) => s.id)
  await Promise.all(moved.map((p) => updatePost(p.id, { topic_id: to?.id ?? null })))
  const unforward = to ? await forward('topic', t.id, to.id) : null
  await deleteNode(t.id)
  return {
    msg: to ? `${moved.length} bài → ${to.title} · đã xoá ${t.title}` : `Đã xoá ${t.title}`,
    revert: async () => {
      const back = await createNode({ site: 'blog', title: t.title, parent_id: t.parent_id })
      await updateNode(back.id, { intro: t.intro, status: t.status, accent: t.accent, on_color: t.on_color, tint: t.tint, tint2: t.tint2, image_url: t.image_url })
      await reorderNodes(siblings.map((s) => (s === t.id ? back.id : s)))
      await Promise.all(moved.map((p) => updatePost(p.id, { topic_id: back.id })))
      await unforward?.()
    },
  }
}

/** The tag goes into `to` on every post that has it, or simply off them. */
export async function retireKeyword(k: Keyword, to: { id: string; label: string } | null): Promise<Retired> {
  const moved = (await listPosts('all')).filter((p) => (p.keywords ?? []).includes(k.id))
  const unforward = to ? await forward('keyword', k.id, to.id) : null
  await deleteKeyword(k.id, to?.id)
  return {
    msg: to ? `${moved.length} bài → ${to.label} · đã xoá ${k.label}` : `Đã gỡ ${k.label} khỏi ${moved.length} bài`,
    revert: async () => {
      const back = await createKeyword(k.label)
      await Promise.all(moved.map((p) => updatePost(p.id, { keywords: (p.keywords ?? []).map((x) => (x === k.id ? back.id : x)) })))
      await unforward?.()
    },
  }
}
