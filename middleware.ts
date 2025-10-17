// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const session = req.cookies.get('session')?.value
  const { pathname } = req.nextUrl

  // 1) Pomiń całe API i zasoby systemowe/statyczne — nie dotykamy ich
  if (
    pathname.startsWith('/api') ||           // wszystkie route handlers
    pathname.startsWith('/_next') ||         // bundlowane zasoby Next.js
    pathname.startsWith('/static') ||        // jeśli używasz /static
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // 2) Ścieżki autoryzacyjne
  const isAuthRoute =
    pathname === '/login' || pathname.startsWith('/login/')

  // 3) Brak sesji → przekieruj na /login (tylko dla stron)
  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 4) Mamy sesję i ktoś wchodzi na /login → przenieś na stronę główną
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

// Matcher obejmuje tylko strony (nie api, nie zasoby)
export const config = {
  matcher: [
    // wszystko poza: api, _next, static i plikami statycznymi (kropka w nazwie)
    '/((?!api|_next|static|.*\\..*).*)',
  ],
}
