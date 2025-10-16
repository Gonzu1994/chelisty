'use client'

import data from '@/data/checklists.json'
import { useMemo, useState } from 'react'

type YesNo = 'TAK' | 'NIE' | ''
type Q = { id: string; text: string; type: 'yesno' | 'boolean' | 'text' | 'number' }
type List = { id: string; title: string; questions: Q[] }

export default function ChecklistPage({
  params,
}: {
  params: { area: string; id: string }
}) {
  const area = decodeURIComponent(params.area)

  // Bezpieczne pobranie listy
  const list: List | undefined = useMemo(() => {
    const lists = (data as any)[area] as List[] | undefined
    return lists?.find((x) => x.id === params.id)
  }, [area, params.id])

  // Jeśli ktoś wejdzie w nieistniejący adres
  if (!list) {
    return (
      <main className="grid gap-4">
        <h1 className="text-xl font-semibold">{area}</h1>
        <p className="card text-red-600">
          Nie znaleziono checklisty o ID: <b>{params.id}</b>.
        </p>
      </main>
    )
  }

  // Stan odpowiedzi oraz "mini-statusów" zapisu dla każdej odpowiedzi
  const [answers, setAnswers] = useState<Record<string, YesNo>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [savedOk, setSavedOk] = useState<Record<string, boolean>>({})

  // Wywoływane przy kliknięciu TAK/NIE
  async function onAnswer(qid: string, val: YesNo) {
    // optymistycznie zaznacz od razu
    setAnswers((prev) => ({ ...prev, [qid]: val }))
    setSaving((prev) => ({ ...prev, [qid]: true }))
    setSavedOk((prev) => ({ ...prev, [qid]: false }))

    // budujemy ładunek: cała lista z aktualnymi (częściowymi) odpowiedziami
    const current = { ...answers, [qid]: val }
    const payload = {
      area,
      checklistId: list.id,
      answers: list.questions.map((q) => ({
        questionId: q.id,
        questionText: q.text,
        answer: current[q.id] ?? '',
      })),
    }

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Błąd API')

      // sukces: zielony „ptaszek”
      setSavedOk((prev) => ({ ...prev, [qid]: true }))
    } catch (e) {
      // niepowodzenie: cofnij mini-sukces i pokaż alert
      setSavedOk((prev) => ({ ...prev, [qid]: false }))
      alert('Błąd zapisu do arkusza. Spróbuj ponownie.')
    } finally {
      setSaving((prev) => ({ ...prev, [qid]: false }))
    }
  }

  // Komponent przycisków TAK/NIE z kolorowaniem
  function YesNoButtons({ qid }: { qid: string }) {
    const val = answers[qid] ?? ''
    const isSaving = saving[qid]
    const ok = savedOk[qid]

    const baseBtn =
      'px-4 py-2 rounded-xl border transition hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed'
    const yesCls =
      baseBtn +
      ' ' +
      (val === 'TAK'
        ? 'bg-green-600 text-white border-green-700'
        : 'bg-white text-green-700 border-green-500')
    const noCls =
      baseBtn +
      ' ' +
      (val === 'NIE'
        ? 'bg-red-600 text-white border-red-700'
        : 'bg-white text-red-700 border-red-500')

    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={yesCls}
          onClick={() => onAnswer(qid, 'TAK')}
          disabled={isSaving}
        >
          TAK
        </button>
        <button
          type="button"
          className={noCls}
          onClick={() => onAnswer(qid, 'NIE')}
          disabled={isSaving}
        >
          NIE
        </button>

        {/* mini-status zapisu */}
        {isSaving && <span className="text-sm text-gray-500">Zapisywanie…</span>}
        {!isSaving && ok && <span className="text-sm text-green-600">Zapisano ✔</span>}
      </div>
    )
  }

  return (
    <main className="grid gap-4">
      <h1 className="text-xl font-semibold">{list.title}</h1>

      {list.questions.map((q) => (
        <div key={q.id} className="card grid gap-2">
          <div className="font-medium">{q.text}</div>

          {/* dla naszych testów używamy yes/no */}
          {(q.type === 'yesno' || q.type === 'boolean') && <YesNoButtons qid={q.id} />}

          {/* fallback dla innych typów – w razie gdyby pojawiły się kiedyś w JSONie */}
          {q.type !== 'yesno' && q.type !== 'boolean' && (
            <div className="text-sm text-gray-500">
              Ten typ pytania nie ma jeszcze autozapisu: <b>{q.type}</b>
            </div>
          )}
        </div>
      ))}

      {/* Brak przycisku „Zapisz” – wszystko leci automatycznie */}
    </main>
  )
}
