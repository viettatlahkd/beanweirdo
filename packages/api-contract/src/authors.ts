/**
 * Authors and who wrote which post — migration 0030.
 *
 *   GET    /api/authors                  → AuthorListResponse
 *   POST   /api/authors                  AuthorCreateRequest → AuthorResponse   (201)
 *   PATCH  /api/authors/:id              AuthorUpdateRequest → AuthorResponse
 *   DELETE /api/authors/:id              → AuthorDeleteResponse, or 409 `conflict`
 *                                          with `details.post_count` while posts
 *                                          still carry the author
 *   PUT    /api/posts/:id/authors        PostAuthorsRequest → PostAuthorsResponse
 *
 * `GET /api/posts/:id` carries the same ordered list as `authors` on the post.
 */

/** What the public byline needs, and all a post carries about its authors. */
export type AuthorRef = {
  id: string
  name: string
  slug: string
  avatar_url: string | null
}

/** The full profile, as the admin screen edits it. */
export type Author = AuthorRef & {
  bio: string
  /** Off: cannot be picked for a post; old bylines stay. */
  active: boolean
  created_at: string
  /** Posts that name this author, whatever their status. */
  post_count: number
}

export type AuthorListResponse = { authors: Author[] }
export type AuthorResponse = { author: Author }
export type AuthorDeleteResponse = { deleted: string }

export type AuthorCreateRequest = {
  name: string
  /** Derived from `name` when left out. */
  slug?: string
  avatar_url?: string | null
  bio?: string
  active?: boolean
}

/** Any subset of the create fields; at least one must be present. */
export type AuthorUpdateRequest = Partial<AuthorCreateRequest>

/**
 * The whole list, in byline order. It replaces what the post had, so removing
 * a co-author is sending the list without them, and `[]` clears the byline.
 */
export type PostAuthorsRequest = { author_ids: string[] }
export type PostAuthorsResponse = { authors: AuthorRef[] }
