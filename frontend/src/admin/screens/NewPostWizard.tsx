import { useState } from 'react'
import { PasswordGate } from '../PasswordGate'
import { Stepper } from '../components/Stepper'
import { createPost, type PostTemplate } from '../lib/apiClient'
import { useAdminNav } from '../lib/nav'
import { MetadataStep, type Metadata } from './MetadataStep'
import { TemplateStep } from './TemplateStep'

export function NewPostWizard() {
  return (
    <PasswordGate>
      <NewPostWizardContent />
    </PasswordGate>
  )
}

function NewPostWizardContent() {
  const nav = useAdminNav()
  const [step, setStep] = useState<'metadata' | 'template' | 'editor'>('metadata')
  const [metadata, setMetadata] = useState<Metadata | null>(null)

  function handleMetadata(m: Metadata) {
    setMetadata(m)
    setStep('template')
  }

  async function handleTemplate(template: PostTemplate) {
    if (!metadata) return
    const { id } = await createPost({ ...metadata, template })
    nav.goEdit(id)
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      <Stepper current={step} />
      {step === 'metadata' && <MetadataStep onContinue={handleMetadata} />}
      {step === 'template' && <TemplateStep onContinue={handleTemplate} />}
    </div>
  )
}
