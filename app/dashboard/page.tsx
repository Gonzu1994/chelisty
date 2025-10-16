import { Suspense } from 'react'

export const dynamic = 'force-dynamic'
export const revalidate = 0


type Weekly = {
  week: { start: string; end: string; days: string[] }
  byArea: Record<
    string,
    {
      daily: { date: string; total: number; done: number; pending: number }[]
      users: Record<string, number>
    }
  >
}

import { headers } from 'next/headers'

// ...

async function getWeekly(): Promise<Weekly> {
  const hdrs = headers()
  const proto =
    hdrs.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const host = hdrs.get('host')!
  const cookie = hdrs.get('cookie') ?? '' // jeśli /api/weekly sprawdza sesję
  const base = `${proto}://${host}`

  const res = await fetch(`${base}/api/weekly`, {
    cache: 'no-store',
    headers: { cookie },
  })

  if (!res.ok) {
    throw new Error('Nie udało się pobrać danych tygodnia.')
  }
  return res.json()
}


function Bar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="w-full h-2 bg-gray-200 rounded">
      <div
        className="h-2 bg-green-500 rounded"
        style={{ width: `${pct}%`, transition: 'width .2s ease' }}
        title={`${pct}%`}
      />
    </div>
  )
}

function AreaCard({ name, daily, users }: { name: string; daily: Weekly['byArea'][string]['daily']; users: Weekly['byArea'][string]['users'] }) {
  const sumTotal = daily.reduce((a, d) => a + d.total, 0)
  const sumDone = daily.reduce((a, d) => a + d.done, 0)
  const sumPending = daily.reduce((a, d) => a + d.pending, 0)

  const usersSorted = Object.entries(users)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  return (
    <div className="card grid gap-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">{name}</h3>
        <div className="text-sm text-gray-500">
          Wykonane: <b>{sumDone}</b> / {sumTotal} &nbsp;•&nbsp; Do zrobienia: <b>{sumPending}</b>
        </div>
      </div>

      <div className="grid gap-2">
        {daily.map((d) => (
          <div key={d.date} className="grid gap-1">
            <div className="flex justify-between text-sm">
              <span>{d.date}</span>
              <span>
                <b>{d.done}</b>/<span className="text-gray-500">{d.total}</span>
              </span>
            </div>
            <Bar done={d.done} total={d.total} />
          </div>
        ))}
      </div>

      <div>
        <h4 className="font-medium mb-2">Kto dokończył najwięcej</h4>
        {usersSorted.length === 0 ? (
          <p className="text-sm text-gray-500">Brak danych w tym tygodniu.</p>
        ) : (
          <ul className="text-sm grid gap-1">
            {usersSorted.map(([u, c]) => (
              <li key={u} className="flex justify-between">
                <span className="truncate">{u}</span>
                <span className="font-medium">{c}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

async function DashboardInner() {
  const weekly = await getWeekly()
  const areas = Object.keys(weekly.byArea) // np. ["Restauracja", "Hotel", "Budki"]

  return (
    <main className="grid gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Dashboard tygodniowy</h1>
        <div className="text-sm text-gray-500">
          {weekly.week.start} — {weekly.week.end}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {areas.map((a) => (
          <AreaCard key={a} name={a} daily={weekly.byArea[a].daily} users={weekly.byArea[a].users} />
        ))}
      </div>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="card">Ładowanie…</div>}>
            <DashboardInner />
    </Suspense>
  )
}
