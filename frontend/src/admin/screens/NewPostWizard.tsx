import { useState } from 'react'
import { createPost } from '../lib/apiClient'
import { useNav } from '../../lib/nav'
import { MetadataStep, type Metadata } from './MetadataStep'

/**
 * Starting a post.
 *
 * It was three steps: metadata, then template, then the editor. The template
 * step is folded into the first — choosing the shape of a piece belongs beside
 * choosing what it is about, not on a page of its own — so this is one form and
 * then the editor.
 */
export function NewPostWizard() {
  const nav = useNav()
  const [error, setError] = useState<string | null>(null)

  async function start(m: Metadata) {
    try {
      const { id } = await createPost(m)
      nav.editPost(id)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      {error && <p role="alert">{error}</p>}
      <MetadataStep onContinue={(m) => void start(m)} />
    </div>
  )
}
