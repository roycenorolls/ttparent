import { NextResponse } from 'next/server';

/**
 * Gate every page on the auth_token cookie.
 *
 * The original build assumed a Flutter shell would inject this token before
 * load. The shell is now a plain WebView, so the web app owns sign-in and an
 * unauthenticated request must be sent to /login rather than waved through.
 *
 * Only the auth endpoints and demo photos are public — /api/parent/* must stay gated.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    // Stock demo photos; the app shell downloads these without the cookie to save them.
    pathname.startsWith('/demo/') ||
    pathname === '/favicon.ico';

  if (isPublic) return NextResponse.next();

  if (request.cookies.get('auth_token')?.value) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search   = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
