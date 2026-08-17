'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGate } from '../../../components/AuthGate'
import { Stepper } from '../../../components/Stepper'
import { createPost, type PostTemplate } from '../../../lib/apiClient'
import { MetadataStep, type Metadata } from './MetadataStep'
import { TemplateStep } from './TemplateStep'

export default function NewPostPage() {
  const router = useRouter()
  const [step, setStep] = useState<'metadata' | 'template' | 'editor'>('metadata')
  const [metadata, setMetadata] = useState<Metadata | null>(null)

  function handleMetadata(m: Metadata) {
    setMetadata(m)
    setStep('template')
  }

  async function handleTemplate(template: PostTemplate) {
    if (!metadata) return
    const { id } = await createPost({ ...metadata, template })
    router.push(`/posts/${id}/edit`)
  }

  return (
    <AuthGate>
      <div style={{ padding: '32px 40px' }}>
        <Stepper current={step} />
        {step === 'metadata' && <MetadataStep onContinue={handleMetadata} />}
        {step === 'template' && <TemplateStep onContinue={handleTemplate} />}
      </div>
    </AuthGate>
  )
}
