import { google } from 'googleapis'

export function getSheets() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) throw new Error('Google service account env not set')
  const auth = new google.auth.JWT(
    email,
    undefined,
    key,
    ['https://www.googleapis.com/auth/spreadsheets']
  )
  return google.sheets({ version: 'v4', auth })
}
