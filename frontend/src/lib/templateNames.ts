/**
 * What a post is, said by its template. Dạng bài (`posts.kind`) used to say
 * it; once every post had become a `note` it said nothing, and the owner
 * retired it: the template a post is written in is its kind now — on the site
 * (the eyebrow, the lists) and in the CMS.
 */
const NAMES: Record<string, string> = {
  article: 'article',
  cards: 'cards',
  report: 'report',
  longform: 'long-form',
  memo: 'memo',
  bitesize: 'bitesize',
}

export const TEMPLATE_KEYS = Object.keys(NAMES)

export function templateName(template: string | null | undefined): string {
  return template ? NAMES[template] ?? template : ''
}
