/**
 * The post templates, and the name each one goes by on screen.
 *
 * The list was written out four times: `TEMPLATES` in `admin/lib/apiClient`,
 * `PostTemplate` in `data/usePublishedPosts`, and two separate
 * `TEMPLATE_LABEL` tables — one in `admin/components/PostCard`, one in
 * `admin/screens/Editor`, the second typed `Record<string, string>` so a
 * template missing from it was not a compile error, only a dropdown with one
 * fewer option in it.
 *
 * That is the shape that has already failed here: migration 0010 added
 * `longform` and `memo`, one of the copies was not updated, and creating
 * either through the admin answered `400` for months while two such posts sat
 * published on the live site. `packages/post-renderer/src/templateContract.test.ts`
 * was written after that, and covers the backend, the database and the
 * renderer; this file covers the four frontend copies, which that test never
 * looked at.
 *
 * What is NOT here: the renderer. `PostRenderer` dispatches on a discriminated
 * union because each template takes a different `post` shape, and that switch
 * is the thing making TypeScript check the shapes against each other. Folding
 * it into a lookup table would trade a checked switch for an unchecked one.
 * A layout is interchangeable markup over one shape; a template is not.
 */

type TemplateSpec = {
  key: string
  /** What the CMS calls it — the editor's dropdown and the post card's badge. */
  label: string
}

export const POST_TEMPLATES = [
  { key: 'article', label: 'Article' },
  { key: 'cards', label: 'Cards' },
  { key: 'report', label: 'Report' },
  { key: 'longform', label: 'Long-form' },
  { key: 'memo', label: 'Memo' },
  { key: 'bitesize', label: 'Bitesize note' },
] as const satisfies readonly TemplateSpec[]

export type PostTemplate = (typeof POST_TEMPLATES)[number]['key']

/** Just the keys — what the database stores, and what the API validates against. */
export const POST_TEMPLATE_KEYS: readonly PostTemplate[] = POST_TEMPLATES.map((t) => t.key)

/**
 * Name by key.
 *
 * `Record<PostTemplate, string>` rather than `Record<string, string>`: adding
 * a template without naming it should stop the build, not ship a dropdown
 * that quietly omits it.
 */
export const TEMPLATE_LABEL: Record<PostTemplate, string> = Object.fromEntries(
  POST_TEMPLATES.map((t) => [t.key, t.label]),
) as Record<PostTemplate, string>
