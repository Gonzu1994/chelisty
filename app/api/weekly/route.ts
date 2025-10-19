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

function ymd(d: Date) {
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
function normKey(date: string, area: string, list: string) {
  return `${date}|${area}|${list}`
}

// --- pobranie klucza w sposób „odporny” na środowisko Vercel ---
function readServiceKey(): string {
  const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64
  if (base64 && base64.trim() !== '') {
    return Buffer.from(base64, 'base64').toString('utf8')
  }
  // fallback: zwykła zmienna z \n
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || ''
  return raw.replace(/\\n/g, '\n')
}

export async function GET() {
  try {
    // zakres 7 dni
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 6)
    const days: string[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(ymd(d))
    }

    // Oczekiwana liczba pytań w każdej liście (z lokalnego pliku)
    const expectedQuestions: Record<string, Record<string, number>> = {}
    const totalChecklistsPerArea: Record<string, number> = {}
    Object.entries(data as any).forEach(([area, lists]: any) => {
      expectedQuestions[area] = {}
      totalChecklistsPerArea[area] = lists.length
      for (const l of lists) expectedQuestions[area][l.id] = l.questions.length
    })

    // Google Sheets — autoryzacja
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const key = readServiceKey()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    if (!email) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL')
    if (!key) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_KEY/BASE64')
    if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID')

    const jwt = new google.auth.JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth: jwt })

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'responses!A:H', // A: ts, B: date, C: area, D: listId, E: qId, F: text, G: answer, H: user
    })
    const values = resp.data.values || []

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

    // grupowanie odpowiedzi po (dzień, area, lista)
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

    // statystyka dzienna + kto najczęściej „domyka”
    const areas = Object.keys(totalChecklistsPerArea)
    type Daily = { date: string; total: number; done: number; pending: number }
    type UsersAgg = Record<string, number>
    const byArea: Record<string, { daily: Daily[]; users: UsersAgg }> = {}

    for (const area of areas) {
      byArea[area] = { daily: [], users: {} }
      for (const d of days) {
        const total = totalChecklistsPerArea[area] || 0
        let done = 0
        if (expectedQuestions[area]) {
          const listIds = Object.keys(expectedQuestions[area])
          for (const listId of listIds) {
            const key = normKey(d, area, listId)
            const group = answered[key]
            const expected = expectedQuestions[area][listId]
            if (group && group.qs.size >= expected) {
              done++
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
  } catch (e: any) {
    console.error('WEEKLY API ERROR:', e?.stack || e)
    return NextResponse.json(
      { error: 'weekly_failed', detail: String(e?.message || e) },
      { status: 500 }
    )
  }
}
