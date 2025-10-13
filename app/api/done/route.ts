import { NextResponse } from 'next/server'
import { getSheets } from '@/lib/sheets'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const area = searchParams.get('area')!
  const date = new Date().toISOString().slice(0, 10)

  const sheets = getSheets()
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: 'responses!A:H'
  })
  const values = resp.data.values?.slice(1) || []

  const doneIds = new Set<string>()
  for (const row of values) {
    const [, d, a, checklistId] = row
    if (d === date && a === area) doneIds.add(checklistId)
  }

  return NextResponse.json({ checklistIds: [...doneIds] })
}
