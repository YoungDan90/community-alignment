import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = [
  '/dashboard', '/selah', '/word-to-walk', '/prayer-wall',
  '/pastor', '/onboarding', '/rotas', '/my-rota', '/groups',
  '/members', '/inbox', '/announcements', '/documents',
  '/worship', '/profile', '/discipleship', '/one-to-one', '/calendar',
]

// Signed-in users land on /login (e.g. the native app's entry point, or a
// stale bookmark) should go straight to the dashboard instead of seeing
// the form again.
const signedInRedirects = ['/login', '/signup']

// Public marketing/visitor routes that make no sense inside the native
// app shell — a member opening the app should never land on the church
// website or the public join form.
const marketingRoutes = ['/', '/join']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // capacitor.config.ts tags every native-app request with this UA suffix
  // so it can be told apart from someone just visiting the site in Safari.
  const isNativeApp = request.headers.get('user-agent')?.includes('AlignmentChurchNativeApp') ?? false

  // Supabase stores the session as sb-<project-ref>-auth-token
  // @supabase/ssr chunks the token: sb-<ref>-auth-token, sb-<ref>-auth-token.0, .1 …
  const hasSession = request.cookies.getAll().some(
    ({ name }) => name.startsWith('sb-') && name.includes('-auth-token')
  )

  if (isNativeApp && marketingRoutes.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = hasSession ? '/dashboard' : '/login'
    return NextResponse.redirect(url)
  }

  if (hasSession && signedInRedirects.some(route => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))
  if (!isProtected) return NextResponse.next()

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
