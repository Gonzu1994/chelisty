import { google } from 'googleapis'

export function getSheets() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  let rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!rawKey) throw new Error('Env GOOGLE_SERVICE_ACCOUNT_KEY not set')

  // usuń ewentualne otaczające cudzysłowy
  rawKey = rawKey.trim()
  if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
    rawKey = rawKey.slice(1, -1)
  }

  // zamień dosłowne \\n na prawdziwe nowe linie
  rawKey = rawKey.replace(/\\n/g, '\n').trim()

  let privateKey = rawKey

  // Spróbuj potraktować jako JSON – jeśli się nie uda, przyjmij że to PEM
  try {
    if (rawKey.startsWith('{')) {
      const obj = JSON.parse(rawKey)
      privateKey = String(obj.private_key || '').replace(/\\n/g, '\n').trim()
      if (!email && obj.client_email) email = obj.client_email
    }
  } catch {
    // ignorujemy – wtedy rawKey zostaje traktowany jako PEM
  }

  if (!email) throw new Error('Google service account email not set')
  if (!privateKey.startsWith('-----BEGIN')) {
    throw new Error('Invalid service account private key format')
  }

  const auth = new google.auth.JWT(
    email,
    undefined,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  )
  return google.sheets({ version: 'v4', auth })
}
