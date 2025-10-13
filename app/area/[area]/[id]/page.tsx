'use client'
import data from '@/data/checklists.json'
import { useState } from 'react'

export default function ChecklistPage({ params }: { params: { area: string; id: string } }) {
  const area = decodeURIComponent(params.area)
  const list = (data as any)[area].find((x: any) => x.id === params.id)

  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setLoading(true)
    const payload = {
      area,
      checklistId: list.id,
      answers: list.questions.map((q: any) => ({
        questionId: q.id,
        questionText: q.text,
        answer: formData.get(q.id)
      }))
    }
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    setLoading(false)
    if (res.ok) window.location.href = `/area/${area}`
    else alert('Błąd zapisu')
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <h1 className="text-xl font-semibold">{list.title}</h1>
      {list.questions.map((q: any) => (
        <label key={q.id} className="grid gap-2 card">
          <span>{q.text}</span>
          {q.type === 'boolean' && (
            <select name={q.id} required className="input">
              <option value="">— wybierz —</option>
              <option value="TAK">TAK</option>
              <option value="NIE">NIE</option>
            </select>
          )}
          {q.type === 'number' && <input type="number" name={q.id} required className="input" />}
          {q.type === 'text' && <input type="text" name={q.id} required className="input" />}
        </label>
      ))}
      <button disabled={loading} className="btn">{loading ? 'Zapisywanie…' : 'Zapisz'}</button>
    </form>
  )
}
