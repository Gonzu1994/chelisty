import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSheets } from '@/lib/sheets'

export async function POST(req: Request) {
  try {
    const { area, checklistId, answers } = await req.json()
    const now = new Date()
    const date = now.toISOString().slice(0, 10)
    const userLogin = cookies().get('user_login')?.value || 'unknown'

    const rows = (answers as any[]).map(a => [
      now.toISOString(),
      date,
      area,
      checklistId,
      a.questionId,
      a.questionText,
      String(a.answer ?? ''),
      userLogin
    ])

    const sheets = getSheets()
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      range: 'responses!A:H',
      valueInputOption: 'RAW',
      requestBody: { values: rows }
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, error: 'write_failed' }, { status: 500 })
  }
}
