import { useState } from 'react'
import { Stepper } from '../components/Stepper'
import { createPost } from '../lib/apiClient'
import { useNav } from '../../lib/nav'
import { MetadataStep, type Metadata } from './MetadataStep'
import { TemplateStep } from './TemplateStep'

export function NewPostWizard() {
  return (
      <NewPostWizardContent />
  )
}

function NewPostWizardContent() {
  const nav = useNav()
  const [step, setStep] = useState<'metadata' | 'template' | 'editor'>('metadata')
  const [metadata, setMetadata] = useState<Metadata | null>(null)

  function handleMetadata(m: Metadata) {
    setMetadata(m)
    setStep('template')
  }

  async function handleTemplate(templateId: string) {
    if (!metadata) return
    const { id } = await createPost({ ...metadata, templateId })
    nav.editPost(id)
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      <Stepper current={step} />
      {step === 'metadata' && <MetadataStep onContinue={handleMetadata} />}
      {step === 'template' && <TemplateStep onContinue={handleTemplate} />}
    </div>
  )
}
