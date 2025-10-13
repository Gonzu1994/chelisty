'use client'
import { useState } from 'react'

export default function Dashboard() {
  const [granted, setGranted] = useState(false)
  const [data, setData] = useState<any>(null)

  async function open(pass: string) {
    const res = await fetch('/api/dashboard?pass=' + encodeURIComponent(pass))
    if (res.ok) {
      setGranted(true)
      setData(await res.json())
    } else alert('Złe hasło do dashboardu')
  }

  if (!granted) {
    return (
      <div className="card max-w-sm mx-auto grid gap-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <input type="password" placeholder="Hasło" id="p" className="input" />
        <button className="btn" onClick={() => open((document.getElementById('p') as HTMLInputElement).value)}>Wejdź</button>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Dzisiejsze wyniki</h1>
      {data && (
        <div className="grid gap-2">
          <div className="card">Wszystkich odpowiedzi: <b>{data.totalAnswers}</b></div>
          <div className="card">Checklist zakończonych: <b>{data.completedChecklists}</b></div>
          <div className="card">Po obszarach: <pre className="whitespace-pre-wrap">{JSON.stringify(data.byArea, null, 2)}</pre></div>
          <div className="card">Godziny wypełnień: <pre className="whitespace-pre-wrap">{data.timeline.join('\n')}</pre></div>
        </div>
      )}
    </div>
  )
}
