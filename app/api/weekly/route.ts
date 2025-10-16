// app/api/weekly/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import data from '@/data/checklists.json'

type Row = {
  ts: Date
  date: string
  area: string
  checklistId: string
  questionId: string
  questionText: string
  answer: string
  user: string
}

function normKey(date: string, area: string, list: string) {
  return `${date}|${area}|${list}`
}

function ymd(d: Date) {
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export async function GET() {
  try {
    // 1) Ostatnie 7 dni (łącznie z dziś)
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 6)
    const days: string[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(ymd(d))
    }

    // 2) Oczekiwana liczba pytań na checklistę (z pliku lokalnego)
    const expectedQuestions: Record<string, Record<string, number>> = {}
    const totalChecklistsPerArea: Record<string, number> = {}
    Object.entries(data as any).forEach(([area, lists]: any) => {
      expectedQuestions[area] = {}
      totalChecklistsPerArea[area] = Array.isArray(lists) ? lists.length : 0
      for (const l of (lists as any[] ?? [])) {
        expectedQuestions[area][l.id] = Array.isArray(l.questions) ? l.questions.length : 0
      }
    })

    // 3) Google Sheets auth
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const key = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n')

    if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID')
    if (!clientEmail)   throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL')
    if (!key)           throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_KEY')

    const jwt = new google.auth.JWT({
      email: clientEmail,
      key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth: jwt })

    // 4) Pobierz dane z arkusza
    // Zakres dopasuj do swojego układu kolumn
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'responses!A:H', // A:ts B:date C:area D:listId E:qId F:text G:answer H:user
    })
    const values = resp.data.values ?? []

    // 5) Parsuj tylko w oknie 7 dni
    const rows: Row[] = []
    for (let i = 1; i < values.length; i++) {
      const r = values[i]
      if (!r || r.length < 8) continue
      const [ts, d, area, listId, qId, qText, answer, user] = r
      if (!d) continue
      if (d < ymd(start) || d > ymd(end)) continue
      rows.push({
        ts: new Date(ts || d),
        date: d,
        area,
        checklistId: listId,
        questionId: qId,
        questionText: qText,
        answer: answer || '',
        user: user || 'unknown',
      })
    }

    // 6) Grupowanie – które pytania w danej (data, area, listId) zostały już odpowiedziane
    type QSet = { qs: Set<string>; latestByQ: Map<string, { ts: number; user: string }> }
    const answered: Record<string, QSet> = {}
    for (const r of rows) {
      const key = normKey(r.date, r.area, r.checklistId)
      if (!answered[key]) answered[key] = { qs: new Set(), latestByQ: new Map() }
      answered[key].qs.add(r.questionId)
      const prev = answered[key].latestByQ.get(r.questionId)
      const now = r.ts.getTime()
      if (!prev || now > prev.ts) {
        answered[key].latestByQ.set(r.questionId, { ts: now, user: r.user })
      }
    }

    // 7) Dzienna statystyka: ile checklist zrobiono / ile czeka; kto „domykał”
    const areas = Object.keys(totalChecklistsPerArea)
    type Daily = { date: string; total: number; done: number; pending: number }
    type UsersAgg = Record<string, number>
    const byArea: Record<string, { daily: Daily[]; users: UsersAgg }> = {}

    for (const area of areas) {
      byArea[area] = { daily: [], users: {} }
      for (const d of days) {
        const total = totalChecklistsPerArea[area] || 0
        let done = 0

        const listIds = expectedQuestions[area] ? Object.keys(expectedQuestions[area]) : []
        for (const listId of listIds) {
          const group = answered[normKey(d, area, listId)]
          const expected = expectedQuestions[area]?.[listId] ?? 0
          if (group && group.qs.size >= expected) {
            done++

            // użytkownik, który „zamknął” checklistę (ostatnia odpowiedź)
            let winner = 'unknown'
            let best = 0
            for (const { ts, user } of group.latestByQ.values()) {
              if (ts > best) {
                best = ts
                winner = user || 'unknown'
              }
            }
            byArea[area].users[winner] = (byArea[area].users[winner] || 0) + 1
          }
        }

        byArea[area].daily.push({
          date: d,
          total,
          done,
          pending: Math.max(total - done, 0),
        })
      }
    }

    return NextResponse.json({
      week: { start: ymd(start), end: ymd(end), days },
      byArea,
    })
  } catch (err: any) {
    console.error('WEEKLY API ERROR:', err?.stack || err)
    return NextResponse.json(
      { error: 'weekly_failed', detail: String(err?.message || err) },
      { status: 500 }
    )
  }
}
