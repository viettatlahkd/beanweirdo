'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGate } from '../../../components/AuthGate'
import { Stepper } from '../../../components/Stepper'
import { createPost, updatePost } from '../../../lib/apiClient'
import { MetadataStep, type Metadata } from './MetadataStep'
import { TemplateStep } from './TemplateStep'

export default function NewPostPage() {
  const router = useRouter()
  const [step, setStep] = useState<'metadata' | 'template' | 'editor'>('metadata')
  const [postId, setPostId] = useState<string | null>(null)

  async function handleMetadata(m: Metadata) {
    const { id } = await createPost(m)
    setPostId(id)
    setStep('template')
  }

  async function handleTemplate(templateId: string) {
    if (!postId) return
    await updatePost(postId, { templateId })
    router.push(`/posts/${postId}/edit`)
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
