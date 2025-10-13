import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const session = req.cookies.get('session')?.value
  const pathname = req.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/api/login')
  const isPublicApi = pathname.startsWith('/api/public')
  if (!session && !isAuthRoute && !isPublicApi) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next|favicon.ico).*)'] }
