'use client'

import data from '@/data/checklists.json'
import { useMemo, useState } from 'react'

type QType = 'yesno' | 'boolean' | 'number' | 'text'

type Question = {
  id: string
  text: string
  type: QType
}

type Checklist = {
  id: string
  title: string
  questions: Question[]
}

export default function ChecklistPage({
  params,
}: {
  params: { area: string; id: string }
}) {
  const area = decodeURIComponent(params.area)

  // Szukamy listy tylko raz (memo) — i zawsze bezpiecznie zawężamy typ.
  const list: Checklist | undefined = useMemo(() => {
    const src = (data as Record<string, Checklist[] | undefined>)[area]
    return src?.find((x) => x.id === params.id)
  }, [area, params.id])

  // Jeżeli nie ma takiej listy — pokazujemy czytelny komunikat
  if (!list) {
    return (
      <main className="container">
        <div className="card">Nie znaleziono checklisty.</div>
      </main>
    )
  }

  // Od tego miejsca używamy już tylko "safeList" – TS wie, że to nie-undefined
  const safeList: Checklist = list

  // Stan odpowiedzi TAK/NIE (oraz ewentualnych pól liczbowych/tekstowych)
  const [ynAnswers, setYnAnswers] = useState<Record<string, 'TAK' | 'NIE' | ''>>(
    Object.fromEntries(safeList.questions.map((q) => [q.id, '']))
  )
  const [freeAnswers, setFreeAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Wysyłka JEDNEJ odpowiedzi (klik w TAK/NIE)
  async function sendYesNo(q: Question, val: 'TAK' | 'NIE') {
    setYnAnswers((s) => ({ ...s, [q.id]: val }))

    // budujemy payload tylko z jednym pytaniem
    const payload = {
      area,
      checklistId: safeList.id, // <- Używamy safeList
      question: { id: q.id, text: q.text },
      answer: val,
    }

    try {
      setLoading(true)
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Błąd API: ${res.status} ${res.statusText}\n${t}`)
      }
    } catch (e) {
      console.error(e)
      alert('Nie udało się zapisać odpowiedzi')
      // cofamy zmianę tylko tego jednego pola
      setYnAnswers((s) => ({ ...s, [q.id]: '' }))
    } finally {
      setLoading(false)
    }
  }

  // Wysyłka całości (dla pól liczbowych/tekstowych i ewentualnie domknięcia listy)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    const answers = safeList.questions.map((q) => {
      if (q.type === 'yesno' || q.type === 'boolean') {
        return {
          questionId: q.id,
          questionText: q.text,
          answer: ynAnswers[q.id] ?? '',
        }
      }
      return {
        questionId: q.id,
        questionText: q.text,
        answer: freeAnswers[q.id] ?? '',
      }
    })

    try {
      setLoading(true)
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area,
          checklistId: safeList.id, // <- Używamy safeList
          answers,
        }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Błąd API: ${res.status} ${res.statusText}\n${t}`)
      }
      // po zapisie wracamy na listę checklist danej strefy
      window.location.href = `/area/${area}`
    } catch (err) {
      console.error(err)
      alert('Błąd zapisu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 container">
      <h1 className="text-xl font-semibold">{safeList.title}</h1>

      {safeList.questions.map((q) => (
        <label key={q.id} className="grid gap-2 card">
          <span>{q.text}</span>

          {(q.type === 'yesno' || q.type === 'boolean') && (
            <div className="flex gap-2">
              <button
                type="button"
                className={`btn ${
                  ynAnswers[q.id] === 'TAK' ? 'ring-2 ring-green-500' : ''
                }`}
                onClick={() => sendYesNo(q, 'TAK')}
                disabled={loading}
              >
                TAK
              </button>
              <button
                type="button"
                className={`btn ${
                  ynAnswers[q.id] === 'NIE' ? 'ring-2 ring-red-500' : ''
                }`}
                onClick={() => sendYesNo(q, 'NIE')}
                disabled={loading}
              >
                NIE
              </button>
            </div>
          )}

          {q.type === 'number' && (
            <input
              type="number"
              className="input"
              value={freeAnswers[q.id] ?? ''}
              onChange={(e) =>
                setFreeAnswers((s) => ({ ...s, [q.id]: e.target.value }))
              }
            />
          )}

          {q.type === 'text' && (
            <input
              type="text"
              className="input"
              value={freeAnswers[q.id] ?? ''}
              onChange={(e) =>
                setFreeAnswers((s) => ({ ...s, [q.id]: e.target.value }))
              }
            />
          )}
        </label>
      ))}

      <button disabled={loading} className="btn">
        {loading ? 'Zapisywanie…' : 'Zapisz'}
      </button>
    </form>
  )
}
