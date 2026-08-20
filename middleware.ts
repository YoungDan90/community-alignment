import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = [
  '/dashboard', '/selah', '/word-to-walk', '/prayer-wall',
  '/pastor', '/onboarding', '/rotas', '/my-rota', '/groups',
  '/members', '/inbox', '/announcements', '/documents',
  '/worship', '/profile', '/discipleship',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))
  if (!isProtected) return NextResponse.next()

  // Supabase stores the session as sb-<project-ref>-auth-token
  // @supabase/ssr chunks the token: sb-<ref>-auth-token, sb-<ref>-auth-token.0, .1 …
  const hasSession = request.cookies.getAll().some(
    ({ name }) => name.startsWith('sb-') && name.includes('-auth-token')
  )

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox|worker|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)',
  ],
}
