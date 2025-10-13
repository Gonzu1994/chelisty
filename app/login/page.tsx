'use client'
import { useState } from 'react'

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    })
    setLoading(false)
    if (res.ok) window.location.href = '/'
    else alert('Błędny login lub hasło')
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-sm mx-auto grid gap-3">
      <h2 className="text-xl font-semibold">Zaloguj się</h2>
      <input className="input" placeholder="Login" value={login} onChange={e => setLogin(e.target.value)} />
      <input className="input" type="password" placeholder="Hasło" value={password} onChange={e => setPassword(e.target.value)} />
      <button className="btn" disabled={loading}>{loading ? 'Logowanie…' : 'Zaloguj'}</button>
      <p className="text-xs text-gray-500">Dane logowania ustawisz w pliku <code>.env.local</code>.</p>
    </form>
  )
}
