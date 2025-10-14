// app/api/submit/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSheets } from '@/lib/sheets'

export async function POST(req: Request) {
  try {
    const { area, checklistId, answers } = await req.json()

    if (!area || !checklistId || !Array.isArray(answers)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payload' },
        { status: 400 }
      )
    }

    const now = new Date()
    const date = now.toISOString().slice(0, 10)
    const userLogin = cookies().get('user_login')?.value || 'unknown'

    // każdy wiersz: [timestamp, data, obszar, checklistId, pytanieId, pytanie, odpowiedź, kto]
    const rows = answers.map((a: any) => [
      now.toISOString(),
      date,
      area,
      String(checklistId),
      String(a.questionId ?? ''),
      String(a.questionText ?? ''),
      String(a.answer ?? ''),
      userLogin,
    ])

    const sheets = getSheets()
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      range: 'responses!A:H',
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('SUBMIT ERROR:', e)
    const msg = e?.message || String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

// (opcjonalnie) szybki health-check GET – przyda się do testów ręcznych
export async function GET() {
  return NextResponse.json({ ok: true, hint: 'Use POST to submit' })
}
