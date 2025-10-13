import { NextResponse } from 'next/server'
import { getSheets } from '@/lib/sheets'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const pass = searchParams.get('pass')
  if (pass !== process.env.DASHBOARD_PASSWORD) return NextResponse.json({ ok: false }, { status: 401 })

  const sheets = getSheets()
  const date = new Date().toISOString().slice(0, 10)
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: 'responses!A:H'
  })
  const values = resp.data.values?.slice(1) || []

  const byArea: Record<string, number> = {}
  const byChecklist: Record<string, number> = {}
  const timeline: string[] = []
  let total = 0

  for (const row of values) {
    const [ts, d, area, checklistId] = row
    if (d !== date) continue
    total++
    byArea[area] = (byArea[area] || 0) + 1
    byChecklist[checklistId] = (byChecklist[checklistId] || 0) + 1
    timeline.push(ts)
  }

  const completedChecklists = Object.keys(byChecklist).length

  return NextResponse.json({
    totalAnswers: total,
    byArea,
    completedChecklists,
    timeline
  })
}
