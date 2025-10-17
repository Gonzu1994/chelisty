// app/area/[area]/page.tsx
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { headers } from 'next/headers'
import data from '@/data/checklists.json'

async function fetchDoneToday(area: string) {
  const hdrs = headers()
  const proto =
    hdrs.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const host = hdrs.get('host')!
  const cookie = hdrs.get('cookie') ?? ''
  const base = `${proto}://${host}`

  const res = await fetch(`${base}/api/done?area=${encodeURIComponent(area)}`, {
    cache: 'no-store',
    headers: { cookie },
  })

  const contentType = res.headers.get('content-type') ?? ''

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `Błąd API /api/done: ${res.status} ${res.statusText}. ` +
        `Treść: ${body.slice(0, 300)}`
    )
  }

  if (!contentType.includes('application/json')) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `Oczekiwałem JSON, dostałem "${contentType || 'brak content-type'}". ` +
        `Treść: ${body.slice(0, 300)}`
    )
  }

  return (await res.json()) as { checklistIds: string[] }
}

export default async function AreaPage({
  params,
}: {
  params: { area: string }
}) {
  const area = decodeURIComponent(params.area)

  try {
    const done = await fetchDoneToday(area)
    const lists = (data as any)[area] as { id: string; title: string }[]
    const visible = lists.filter((l) => !done.checklistIds.includes(l.id))

    return (
      <main className="grid gap-4">
        <h2 className="text-xl font-semibold">{area}</h2>
        {visible.map((l) => (
          <a key={l.id} href={`/area/${area}/${l.id}`} className="card">
            <div className="font-semibold">{l.title}</div>
          </a>
        ))}
        {visible.length === 0 && (
          <p className="card">Wszystko zrobione na dziś 🎉</p>
        )}
      </main>
    )
  } catch (e: any) {
    console.error('AREA PAGE ERROR:', e)
    return (
      <main className="grid gap-4">
        <h2 className="text-xl font-semibold">{area}</h2>
        <div className="card">
          <div className="font-semibold mb-2">Błąd ładowania</div>
          <pre className="whitespace-pre-wrap text-sm">
            {e?.message || String(e)}
          </pre>
          <p className="text-xs text-gray-500 mt-2">
            Sprawdź, czy jesteś zalogowany, oraz czy API /api/done działa.
          </p>
        </div>
      </main>
    )
  }
}
