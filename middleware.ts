import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isMainRoute = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/selah') ||
    pathname.startsWith('/word-to-walk') ||
    pathname.startsWith('/prayer-wall') ||
    pathname.startsWith('/pastor') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/rotas') ||
    pathname.startsWith('/my-rota') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/members') ||
    pathname.startsWith('/inbox') ||
    pathname.startsWith('/announcements') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/worship') ||
    pathname.startsWith('/profile');

  if (isMainRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox|worker|api).*)',
  ],
};
