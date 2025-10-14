'use client'
import data from '@/data/checklists.json'
import { useMemo, useState } from 'react'

type Question = {
  id: string
  text: string
  type: 'yesno' | 'boolean' | 'number' | 'text'
}

export default function ChecklistPage({ params }: { params: { area: string; id: string } }) {
  const area = decodeURIComponent(params.area)

  // znajdź checklistę; bezpieczne guardy
  const list = useMemo(() => {
    const byArea = (data as any)[area] as Array<{ id: string; title: string; questions: Question[] }> | undefined
    return byArea?.find((x) => x.id === params.id)
  }, [area, params.id])

  const [loading, setLoading] = useState(false)
  // odpowiedzi dla pól Tak/Nie (checkboxy)
  const [ynAnswers, setYnAnswers] = useState<Record<string, 'TAK' | 'NIE' | ''>>({})

  if (!list) {
    return (
      <main className="card">
        <h1 className="text-lg font-semibold">Brak checklisty</h1>
        <p>Nie znaleziono listy „{params.id}” w obszarze „{area}”.</p>
      </main>
    )
  }

  function setYesNo(id: string, checked: boolean) {
    setYnAnswers((prev) => ({ ...prev, [id]: checked ? 'TAK' : 'NIE' }))
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Walidacja checkboxów (wymagane)
    const yesNoRequired = list.questions.filter((q) => q.type === 'yesno' || q.type === 'boolean')
    const anyMissing = yesNoRequired.some((q) => !ynAnswers[q.id] || ynAnswers[q.id] === '')
    if (anyMissing) {
      alert('Zaznacz wszystkie pola Tak/Nie.')
      return
    }

    const formData = new FormData(e.currentTarget)
    setLoading(true)

    const payload = {
      area,
      checklistId: list.id,
      answers: list.questions.map((q) => ({
        questionId: q.id,
        questionText: q.text,
        // dla yesno/bool bierzemy wartość z ynAnswers,
        // dla pozostałych z FormData
        answer:
          q.type === 'yesno' || q.type === 'boolean'
            ? ynAnswers[q.id]
            : formData.get(q.id)
      }))
    }

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    setLoading(false)
    if (res.ok) {
      window.location.href = `/area/${encodeURIComponent(area)}`
    } else {
      alert('Błąd zapisu')
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <h1 className="text-xl font-semibold">{list.title}</h1>

      {list.questions.map((q: Question) => {
        const isYesNo = q.type === 'yesno' || q.type === 'boolean'
        return (
          <label key={q.id} className="grid gap-2 card">
            <span className="font-medium">{q.text}</span>

            {/* YES/NO → checkbox */}
            {isYesNo && (
              <div className="flex items-center gap-3">
                <input
                  id={q.id}
                  type="checkbox"
                  onChange={(e) => setYesNo(q.id, e.currentTarget.checked)}
                />
                <span>Tak / Nie</span>
                {/* Ukryty input — zawsze wyśle wartość do FormData */}
                <input
                  type="hidden"
                  name={q.id}
                  value={ynAnswers[q.id] ?? ''}
                  required
                />
              </div>
            )}

            {/* number */}
            {q.type === 'number' && (
              <input
                type="number"
                name={q.id}
                required
                className="input"
              />
            )}

            {/* text */}
            {q.type === 'text' && (
              <input
                type="text"
                name={q.id}
                required
                className="input"
              />
            )}
          </label>
        )
      })}

      <button disabled={loading} className="btn">
        {loading ? 'Zapisywanie…' : 'Zapisz'}
      </button>
    </form>
  )
}
