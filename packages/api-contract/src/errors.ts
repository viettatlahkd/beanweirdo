/**
 * Every non-2xx answer from an endpoint built on this contract.
 *
 * `error` is for a person to read. `code` is for code to branch on, so the
 * admin app never has to match on wording; `field` names the input at fault
 * when there is one, so a form can put the message next to it.
 */
export type ApiErrorCode =
  | 'unauthorized'
  | 'not_found'
  | 'method_not_allowed'
  | 'invalid'
  | 'conflict'
  | 'server'

export type ApiErrorBody = {
  error: string
  code: ApiErrorCode
  field?: string
  /** Extra facts a caller may act on, such as how many posts still hold an author. */
  details?: Record<string, unknown>
}
