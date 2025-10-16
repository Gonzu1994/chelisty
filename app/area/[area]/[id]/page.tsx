'use client'

import data from '@/data/checklists.json'
import { useMemo, useState } from 'react'

type YesNo = 'TAK' | 'NIE' | ''
type QuestionType = 'yesno' | 'boolean' | 'number' | 'text'

type Question = {
  id: string
  text: string
  type: QuestionType
}

type Checklist = {
  id: string
  title: string
  questions: Question[]
}

type Dataset = Record<string, Checklist[]>

function pickAreaList(ds: Dataset, rawArea: string): Checklist[] | undefined {
  if (!rawArea) return undefined
  if (rawArea in ds) return ds[rawArea]
  const key = Object.keys(ds).find(k => k.toLowerCase() === rawArea.toLowerCase())
  return key ? ds[key] : undefined
}

export default function ChecklistPage({
  params,
}: {
  params: { area: string; id: string }
}) {
  const area = decodeURIComponent(params.area)

  // Znajdź checklistę bezpiecznie
  const list: Checklist | undefined = useMemo(() => {
    const arr = pickAreaList(data as Dataset, area)
    return arr?.find(x => x.id === params.id)
  }, [area, params.id])

  // Wczesny powrót, jeśli brak listy
  if (!list) {
    return (
      <main className="container">
        <div className="card">Nie znaleziono checklisty.</div>
      </main>
    )
  }

  // --- OD TEGO MIEJSCA MAMY PEWNĄ LISTĘ ---
  // Wyciągamy stałe, żeby TS nie marudził w zamknięciach funkcji:
  const listId = list.id
  const listTitle = list.title
  const listQuestions = list.questions

  const [answers, setAnswers] = useState<Record<string, YesNo>>(
    Object.fromEntries(
      listQuestions
        .filter(q => q.type === 'yesno' || q.type === 'boolean')
        .map(q => [q.id, ''])
    ) as Record<string, YesNo>
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [savedOk, setSavedOk] = useState<Record<string, boolean>>({})

  // Auto-zapis jednego pytania (1 wiersz / klik)
  async function onAnswer(q: Question, val: Exclude<YesNo, ''>) {
    setAnswers(prev => ({ ...prev, [q.id]: val }))
    setSaving(prev => ({ ...prev, [q.id]: true }))
    setSavedOk(prev => ({ ...prev, [q.id]: false }))

    const payload = {
      area,
      checklistId: listId,
      question: { id: q.id, text: q.text },
      answer: val,
    }

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Błąd API')
      setSavedOk(prev => ({ ...prev, [q.id]: true }))
    } catch {
      setSavedOk(prev => ({ ...prev, [q.id]: false }))
      alert('Błąd zapisu do arkusza. Spróbuj ponownie.')
    } finally {
      setSaving(prev => ({ ...prev, [q.id]: false }))
    }
  }

  function YesNoButtons({ q }: { q: Question }) {
    const val = answers[q.id] ?? ''
    const isSaving = saving[q.id]
    const ok = savedOk[q.id]

    const base = 'px-4 py-2 rounded-2xl border transition hover:shadow-sm disabled:opacity-60'
    const yesCls = `${base} ${val === 'TAK' ? 'ring-2 ring-green-500 bg-green-600 text-white' : 'bg-white text-green-700 border-green-500'}`
    const noCls  = `${base} ${val === 'NIE' ? 'ring-2 ring-red-500 bg-red-600 text-white' : 'bg-white text-red-700 border-red-500'}`

    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={yesCls}
          onClick={() => onAnswer(q, 'TAK')}
          disabled={isSaving}
          aria-pressed={val === 'TAK'}
        >
          TAK
        </button>
        <button
          type="button"
          className={noCls}
          onClick={() => onAnswer(q, 'NIE')}
          disabled={isSaving}
          aria-pressed={val === 'NIE'}
        >
          NIE
        </button>
        {isSaving && <span className="text-sm text-gray-500">Zapisywanie…</span>}
        {!isSaving && ok && <span className="text-sm text-green-600">Zapisano ✔</span>}
      </div>
    )
  }

  return (
    <main className="container">
      <div className="grid gap-4">
        <h1 className="text-xl font-semibold">{listTitle}</h1>

        {listQuestions.map(q => (
          <div key={q.id} className="card grid gap-2">
            <div className="font-medium">{q.text}</div>

            {(q.type === 'yesno' || q.type === 'boolean') && <YesNoButtons q={q} />}

            {q.type === 'number' && (
              <div className="text-sm text-gray-500">
                Ten typ (liczba) nie ma jeszcze autozapisu.
              </div>
            )}
            {q.type === 'text' && (
              <div className="text-sm text-gray-500">
                Ten typ (tekst) nie ma jeszcze autozapisu.
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
