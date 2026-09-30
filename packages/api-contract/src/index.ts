/**
 * The shapes that cross the wire between the admin app and the API.
 *
 * Types only, on purpose. Both sides import them with `import type`, so the
 * compiler erases every import and neither deployment has to bundle this
 * package: the backend is a separate Vercel project whose functions are built
 * from `backend/` alone, and a runtime import from outside it is a deploy
 * nobody can check from here. What stays shared is the part that drifts — the
 * field names and which of them are optional.
 *
 * Endpoints that predate this package keep their own local types; new ones
 * start here.
 */
export type * from './authors'
export type * from './errors'
