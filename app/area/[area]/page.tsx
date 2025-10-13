import data from '@/data/checklists.json'

async function fetchDoneToday(area: string) {
  const res = await fetch(`/api/done?area=${encodeURIComponent(area)}`, { cache: 'no-store' })
  if (!res.ok) return { checklistIds: [] as string[] }
  return res.json() as Promise<{ checklistIds: string[] }>
}

export default async function AreaPage({ params }: { params: { area: string } }) {
  const area = decodeURIComponent(params.area)
  const done = await fetchDoneToday(area)
  const lists = (data as any)[area] as { id: string; title: string }[]
  const visible = lists.filter(l => !done.checklistIds.includes(l.id))
  return (
    <main className="grid gap-4">
      <h2 className="text-xl font-semibold">{area}</h2>
      {visible.map(l => (
        <a key={l.id} href={`/area/${area}/${l.id}`} className="card">
          <div className="font-semibold">{l.title}</div>
        </a>
      ))}
      {visible.length === 0 && <p className="card">Wszystko zrobione na dziś 🎉</p>}
    </main>
  )
}
