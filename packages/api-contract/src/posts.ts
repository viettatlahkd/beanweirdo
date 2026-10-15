/**
 * The sites whose home a post can appear on (migration 0038). One store of
 * posts for every site: a post is never copied per site, it is only shown on
 * the homes it names.
 */
export type PostSite = 'biz' | 'bean' | 'blog'
