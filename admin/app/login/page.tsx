'use client'
import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await supabase.auth.signInWithOtp({ email })
    setSent(true)
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 280, margin: '80px auto', textAlign: 'center' }}>
      <p>Nhập email của bạn</p>
      <input
        id="email"
        aria-label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: 8 }}
      />
      <button type="submit" style={{ width: '100%', marginTop: 10, padding: 8 }}>Gửi magic link</button>
      {sent && <p>Đã gửi — kiểm tra email của bạn.</p>}
    </form>
  )
}
