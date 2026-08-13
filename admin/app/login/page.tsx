'use client'
import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { ink, paper, sans, serif } from '../../lib/theme'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await supabase.auth.signInWithOtp({ email })
    setSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 320,
          background: paper.white,
          border: `1px solid ${paper.rule}`,
          borderRadius: 10,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(35,33,26,.04)',
        }}
      >
        <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 18, color: ink.base, marginBottom: 18 }}>
          bean weirdo — admin
        </div>
        <p style={{ fontSize: 13, color: ink.soft, margin: '0 0 14px' }}>Nhập email của bạn</p>
        <input
          id="email"
          aria-label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 10px',
            fontFamily: sans,
            fontWeight: 300,
            fontSize: 14,
            color: ink.base,
            border: `1px solid ${paper.rule}`,
            borderRadius: 6,
            background: paper.white,
          }}
        />
        <button
          type="submit"
          style={{
            width: '100%',
            marginTop: 12,
            padding: '9px 16px',
            fontFamily: sans,
            fontWeight: 500,
            fontSize: 12.5,
            border: 'none',
            borderRadius: 6,
            background: ink.base,
            color: paper.cream,
            cursor: 'pointer',
          }}
        >
          Gửi magic link
        </button>
        {sent && <p style={{ fontSize: 12.5, color: ink.muted, marginTop: 12 }}>Đã gửi — kiểm tra email của bạn.</p>}
      </form>
    </div>
  )
}
