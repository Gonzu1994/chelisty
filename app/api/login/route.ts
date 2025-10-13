import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { login, password } = await req.json()
  if (login === process.env.ADMIN_LOGIN && password === process.env.ADMIN_PASSWORD) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set('session', 'ok', { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
    res.cookies.set('user_login', login, { httpOnly: false, sameSite: 'lax', path: '/' })
    return res
  }
  return NextResponse.json({ ok: false }, { status: 401 })
}
