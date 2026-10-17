import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * A dialog, drawer or menu drawn on document.body.
 *
 * Cấu hình's detail column is `position: sticky`, which makes its own stacking
 * context: a dialog inside it, z-index or not, was painted under the preview
 * column beside it and cut off at the column's edge (owner, 2026-10-17). Drawn
 * here it covers the whole window. The `cfg-detail` wrapper keeps the field
 * styles that DETAIL_CSS scopes to that class.
 */
export function Overlay({ children }: { children: ReactNode }) {
  return createPortal(<div className="cfg-detail">{children}</div>, document.body)
}
