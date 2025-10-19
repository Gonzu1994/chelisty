export const dynamic = 'force-dynamic'
export const revalidate = 0

import { headers } from 'next/headers'

type Daily = { date: string; total: number; done: number; pending: number }
type UsersAgg = Record<string, number>
type AreaStats = { daily: Daily[]; users: UsersAgg }

type WeeklyOk = {
  week: { start: string; end: string; days: string[] }
  byArea: Record<string, AreaStats>
}

type WeeklyErr = { error: string; detail?: string }

async function getWeekly(): Promise<WeeklyOk | WeeklyErr> {
  const hdrs = headers()
  const proto =
    hdrs.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const host = hdrs.get('host')!
  const base = `${proto}://${host}`

  const res = await fetch(`${base}/api/weekly`, { cache: 'no-store' })

  // twarde sprawdzenie typu
  const ct = res.headers.get('content-type') ?? ''
  const text = await res.text()
  if (!res.ok) {
    return { error: `Błąd API /api/weekly: ${res.status} ${res.statusText}. Treść: ${text}` }
  }
  if (!ct.includes('application/json')) {
    return { error: `Oczekiwałem JSON, dostałem "${ct || 'brak content-type'}". Treść: ${text.slice(0, 300)}` }
  }

  try {
    return JSON.parse(text) as WeeklyOk
  } catch {
    return { error: `Nie mogłem sparsować JSON-a. Treść: ${text.slice(0, 300)}` }
  }
}

export default async function DashboardPage() {
  const weekly = await getWeekly()

  if ('error' in weekly) {
    return (
      <main className="container">
        <h1 className="text-xl font-semibold mb-4">Dashboard</h1>
        <div className="card">
          <div className="font-semibold mb-2">Nie udało się pobrać danych</div>
          <pre className="whitespace-pre-wrap text-sm">{weekly.error}</pre>
        </div>
      </main>
    )
  }

  const { week, byArea } = weekly
  const areas = Object.keys(byArea)

  return (
    <main className="container grid gap-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-sm text-gray-600">
        Zakres: {week.start} – {week.end}
      </p>

      {areas.map((area) => {
        const stats = byArea[area]
        const sums = stats.daily.reduce(
          (acc, d) => {
            acc.total += d.total
            acc.done += d.done
            acc.pending += d.pending
            return acc
          },
          { total: 0, done: 0, pending: 0 }
        )

        return (
          <section key={area} className="card">
            <h2 className="font-semibold mb-2">{area}</h2>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="card">
                <div className="text-xs text-gray-500">Do zrobienia (suma)</div>
                <div className="text-lg font-semibold">{sums.total}</div>
              </div>
              <div className="card">
                <div className="text-xs text-gray-500">Zrobione (suma)</div>
                <div className="text-lg font-semibold text-green-600">{sums.done}</div>
              </div>
              <div className="card">
                <div className="text-xs text-gray-500">Pozostało</div>
                <div className="text-lg font-semibold text-red-600">{sums.pending}</div>
              </div>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pr-3 py-1">Dzień</th>
                    <th className="pr-3 py-1">Plan</th>
                    <th className="pr-3 py-1">Wykonane</th>
                    <th className="pr-3 py-1">Do zrobienia</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.daily.map((d) => (
                    <tr key={d.date} className="border-t">
                      <td className="pr-3 py-1">{d.date}</td>
                      <td className="pr-3 py-1">{d.total}</td>
                      <td className="pr-3 py-1 text-green-600">{d.done}</td>
                      <td className="pr-3 py-1 text-red-600">{d.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Kto domyka checklisty</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(stats.users).map(([u, cnt]) => (
                  <div key={u} className="card flex items-center justify-between">
                    <span>{u}</span>
                    <span className="font-semibold">{cnt}</span>
                  </div>
                ))}
                {Object.keys(stats.users).length === 0 && (
                  <div className="text-sm text-gray-500">Brak danych</div>
                )}
              </div>
            </div>
          </section>
        )
      })}
    </main>
  )
}
