import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getSheets } from '@/lib/sheets' // jeżeli masz helper – zostaw; jeśli nie, wklej konstrukcję klienta jak niżej

// Jeśli nie masz helpera getSheets, użyj tego:
//
// function getSheets() {
//   const auth = new google.auth.JWT(
//     process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
//     undefined,
//     (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n'),
//     ['https://www.googleapis.com/auth/spreadsheets']
//   )
//   return google.sheets({ version: 'v4', auth })
// }

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!
const TAB = 'responses' // nazwa zakładki w arkuszu

type SinglePayload = {
  area: string
  checklistId: string
  question: { id: string; text: string }
  answer: string
}

type BulkPayload = {
  area: string
  checklistId: string
  answers: { questionId: string; questionText: string; answer: string }[]
}

function todayISODate() {
  // yyyy-mm-dd (bez czasu)
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const sheets = getSheets()

    // Wczytujemy obecne wiersze (A:H) żeby móc zaktualizować (upsert)
    const range = `${TAB}!A:H`
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
      majorDimension: 'ROWS',
    })

    const rows: string[][] = (getRes.data.values || []) as string[][]
    // Ustal indeks kolumn: A ts, B date, C area, D checklistId, E qId, F qText, G answer, H user
    const headerOffset = 0 // jeśli masz nagłówek w 1. wierszu i chcesz go pominąć – zmień na 1
    const baseIndex = headerOffset

    // Pomocnik: upsert jednego rekordu
    async function upsertOne(p: SinglePayload) {
      const date = todayISODate()
      const nowIso = new Date().toISOString()
      const user = 'admin' // jeśli masz auth z cookie, weź stamtąd

      // znajdź istniejący wiersz (po B,C,D,E)
      let rowIndex = -1
      for (let i = baseIndex; i < rows.length; i++) {
        const r = rows[i]
        const [ts, bDate, area, chkId, qId] = [r[0], r[1], r[2], r[3], r[4]]
        if (bDate === date && area === p.area && chkId === p.checklistId && qId === p.question.id) {
          rowIndex = i
          break
        }
      }

      if (rowIndex >= 0) {
        // update (G: answer, A: timestamp)
        rows[rowIndex][0] = nowIso
        rows[rowIndex][6] = p.answer
        // batch update konkretnego wiersza
        const target = `${TAB}!A${rowIndex + 1}:H${rowIndex + 1}`
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: target,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rows[rowIndex]] },
        })
      } else {
        // append nowy rekord
        const row = [
          nowIso, // A
          date, // B
          p.area, // C
          p.checklistId, // D
          p.question.id, // E
          p.question.text, // F
          p.answer, // G
          user, // H
        ]
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [row] },
        })
        rows.push(row)
      }
    }

    // Obsłuż oba formaty payloadu (stary i nowy)
    if (body.question && typeof body.answer === 'string') {
      // tryb „single click”
      const p: SinglePayload = {
        area: body.area,
        checklistId: body.checklistId,
        question: body.question,
        answer: body.answer,
      }
      await upsertOne(p)
    } else if (Array.isArray(body.answers)) {
      // tryb „batch” — jeśli kiedyś wyślesz całość, zrobimy upsert dla wszystkich
      const p0: BulkPayload = body
      for (const a of p0.answers) {
        await upsertOne({
          area: p0.area,
          checklistId: p0.checklistId,
          question: { id: a.questionId, text: a.questionText },
          answer: a.answer,
        })
      }
    } else {
      return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('SUBMIT ERROR', e?.message || e)
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
