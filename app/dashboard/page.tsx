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

async function getWeekly(): Promise<WeeklyOk> {
  const hdrs = headers()
  const proto =
    hdrs.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const host = hdrs.get('host')!
  const cookie = hdrs.get('cookie') ?? ''
  const base = `${proto}://${host}`

  const res = await fetch(`${base}/api/weekly`, {
    cache: 'no-store',
    headers: { cookie },
  })

  const ct = res.headers.get('content-type') ?? ''
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `Błąd API /api/weekly: ${res.status} ${res.statusText}. Treść: ${body.slice(
        0,
        300
      )}`
    )
  }
  if (!ct.includes('application/json')) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `Oczekiwałem JSON, dostałem "${ct || 'brak content-type'}". Treść: ${body.slice(
        0,
        300
      )}`
    )
  }

  return (await res.json()) as WeeklyOk
}

export default async function DashboardPage() {
  let weekly: WeeklyOk | null = null
  try {
    weekly = await getWeekly()
  } catch (e: any) {
    return (
      <main className="container grid gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="card">
          <div className="font-semibold mb-2">Nie udało się pobrać danych</div>
          <pre className="whitespace-pre-wrap text-sm">
            {e?.message || String(e)}
          </pre>
        </div>
      </main>
    )
  }

  // render prostych kafelków + tabela
  const areas = Object.keys(weekly.byArea)

  return (
    <main className="container grid gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid-tiles">
        {areas.map((area) => {
          const a = weekly!.byArea[area]
          const sumTotal = a.daily.reduce((s, d) => s + d.total, 0)
          const sumDone = a.daily.reduce((s, d) => s + d.done, 0)
          const sumPending = a.daily.reduce((s, d) => s + d.pending, 0)
          return (
            <div key={area} className="card">
              <div className="font-semibold mb-2">{area}</div>
              <div className="text-sm">Do wykonania: {sumTotal}</div>
              <div className="text-sm">Wykonane: {sumDone}</div>
              <div className="text-sm">Pozostało: {sumPending}</div>
            </div>
          )
        })}
      </div>

      {areas.map((area) => {
        const a = weekly!.byArea[area]
        return (
          <div key={area} className="card">
            <div className="font-semibold mb-3">{area} — tydzień</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 pr-3">Dzień</th>
                    <th className="py-2 pr-3">Do wyk.</th>
                    <th className="py-2 pr-3">Wykonane</th>
                    <th className="py-2 pr-3">Pozostało</th>
                  </tr>
                </thead>
                <tbody>
                  {a.daily.map((d) => (
                    <tr key={d.date} className="border-t">
                      <td className="py-2 pr-3">{d.date}</td>
                      <td className="py-2 pr-3">{d.total}</td>
                      <td className="py-2 pr-3">{d.done}</td>
                      <td className="py-2 pr-3">{d.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <div className="font-medium mb-2">Kto wykonał (liczba checklist):</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(a.users).map(([user, cnt]) => (
                  <span key={user} className="px-3 py-1 rounded-2xl bg-gray-100">
                    {user}: {cnt}
                  </span>
                ))}
                {Object.keys(a.users).length === 0 && (
                  <span className="text-gray-500">Brak wpisów</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </main>
  )
}
