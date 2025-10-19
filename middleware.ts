import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const session = req.cookies.get('session')?.value
  const { pathname } = req.nextUrl

  // Publiczne ścieżki (poza logowaniem)
  const PUBLIC_PATHS = [
    '/login',
    '/api/login',
    '/api/weekly',
    '/api/done',
    '/api/public',
    '/_next', // assets Next.js
    '/favicon.ico',
  ]

  // publiczne prefiksy
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p)) ||
    pathname.startsWith('/api/public')

  if (!session && !isPublic) {
    const url = new URL('/login', req.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
