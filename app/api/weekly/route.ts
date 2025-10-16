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
    // 1) Daty tygodnia (ostatnie 7 dni, włącznie z dziś)
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 6)
    const days: string[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(ymd(d))
    }

    // 2) Oczekiwana liczba pytań/checlist (na podstawie pliku lokalnego)
    //    data[area] -> [{ id, title, questions:[...] }]
    const expectedQuestions: Record<string, Record<string, number>> = {}
    const totalChecklistsPerArea: Record<string, number> = {}
    Object.entries(data as any).forEach(([area, lists]: any) => {
      expectedQuestions[area] = {}
      totalChecklistsPerArea[area] = lists.length
      for (const l of lists) expectedQuestions[area][l.id] = l.questions.length
    })

    // 3) Autoryzacja Google Sheets
    const jwt = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth: jwt })

    // 4) Pobierz wszystkie dane z zakładki "responses"
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'responses!A:H', // A: ts, B: date, C: area, D: listId, E: qId, F: text, G: answer, H: user
    })
    const values = resp.data.values || []

    // 5) Parsowanie tylko z ostatnich 7 dni
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

    // 6) Grupowanie i liczenie ukończeń
    //    Zliczamy distinct Q w danym (date, area, listId).
    //    Jeśli liczba odpowiedzi == oczekiwana liczba pytań -> DONE.
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

    // 7) Dzienna statystyka per area i „kto dokończył”
    const areas = Object.keys(totalChecklistsPerArea)
    type Daily = { date: string; total: number; done: number; pending: number }
    type UsersAgg = Record<string, number>
    const byArea: Record<string, { daily: Daily[]; users: UsersAgg }> = {}
    for (const area of areas) {
      byArea[area] = { daily: [], users: {} }
      for (const d of days) {
        const total = totalChecklistsPerArea[area] || 0
        let done = 0

        // znajdź listy tego dnia dla tej strefy i oceń czy komplet
        if (expectedQuestions[area]) {
          const listIds = Object.keys(expectedQuestions[area])
          for (const listId of listIds) {
            const key = normKey(d, area, listId)
            const group = answered[key]
            const expected = expectedQuestions[area][listId]
            if (group && group.qs.size >= expected) {
              done++

              // przypisz checklistę użytkownikowi, który „domknął” ją jako ostatni
              // (bierzemy najpóźniejszy timestamp w ramach tej checklisty)
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
    console.error('WEEKLY API ERROR:', e?.message || e)
    return NextResponse.json({ error: 'weekly_failed', detail: String(e?.message || e) }, { status: 500 })
  }
}
