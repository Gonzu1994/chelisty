// app/dashboard/page.tsx
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

  try {
    const res = await fetch(`${base}/api/weekly`, {
      cache: 'no-store',
    })
    const contentType = res.headers.get('content-type') ?? ''

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return {
        error: `Błąd API /api/weekly: ${res.status} ${res.statusText}. Treść: ${body.slice(0, 300)}`,
      }
    }

    if (!contentType.includes('application/json')) {
      const body = await res.text().catch(() => '')
      return {
        error: `Oczekiwałem JSON, dostałem "${contentType || 'brak content-type'}". Treść: ${body.slice(
          0,
          300,
        )}`,
      }
    }

    return (await res.json()) as WeeklyOk
  } catch (e: any) {
    return { error: `Wyjątek podczas pobierania: ${String(e?.message || e)}` }
  }
}

function SummaryCard({
  title,
  stats,
}: {
  title: string
  stats: AreaStats | undefined
}) {
  if (!stats) {
    return (
      <div className="card">
        <div className="font-semibold mb-1">{title}</div>
        <div className="text-sm text-gray-500">Brak danych</div>
      </div>
    )
  }

  const latest = stats.daily.at(-1)
  const totalDone = stats.daily.reduce((a, d) => a + d.done, 0)
  const totalPlanned = stats.daily.reduce((a, d) => a + d.total, 0)

  return (
    <div className="card">
      <div className="font-semibold mb-2">{title}</div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className="text-xs text-gray-500">Dziś – do zrobienia</div>
          <div className="text-lg font-semibold">
            {latest ? latest.pending : 0}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Dziś – wykonane</div>
          <div className="text-lg font-semibold">
            {latest ? latest.done : 0}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Tydzień – wykonane / plan</div>
          <div className="text-lg font-semibold">
            {totalDone} / {totalPlanned}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Ostatnie 7 dni</div>
        <div className="overflow-x-auto">
          <table className="min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pr-4 py-1">Dzień</th>
                <th className="pr-4 py-1">Plan</th>
                <th className="pr-4 py-1">Wykonane</th>
                <th className="pr-4 py-1">Do zrobienia</th>
              </tr>
            </thead>
            <tbody>
              {stats.daily.map((d) => (
                <tr key={d.date} className="border-t border-gray-100">
                  <td className="pr-4 py-1">{d.date}</td>
                  <td className="pr-4 py-1">{d.total}</td>
                  <td className="pr-4 py-1">{d.done}</td>
                  <td className="pr-4 py-1">{d.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-1">Ranking użytkowników</div>
        {Object.keys(stats.users).length === 0 ? (
          <div className="text-sm text-gray-500">Brak ukończonych checklist</div>
        ) : (
          <ul className="text-sm">
            {Object.entries(stats.users)
              .sort((a, b) => b[1] - a[1])
              .map(([u, cnt]) => (
                <li key={u} className="border-t border-gray-100 py-1">
                  <span className="font-medium">{u}</span> – {cnt}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const weekly = await getWeekly()

  if ('error' in weekly) {
    return (
      <main className="grid gap-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="card">
          <div className="font-semibold mb-2">Nie udało się pobrać danych</div>
          <pre className="text-sm whitespace-pre-wrap">{weekly.error}</pre>
        </div>
      </main>
    )
  }

  const areas = weekly.byArea
  const hotel = areas['Hotel']
  const restauracja = areas['Restauracja']
  const budki = areas['Budki'] || areas['Budki'] // zostawione, jeśli masz inną nazwę – dopasuj

  return (
    <main className="grid gap-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid-tiles">
        <SummaryCard title="Hotel" stats={hotel} />
        <SummaryCard title="Restauracja" stats={restauracja} />
        <SummaryCard title="Budki" stats={budki} />
      </div>
    </main>
  )
}
