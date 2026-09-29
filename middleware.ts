/**
 * Route protection.
 *
 * Two jobs, both required for a correct Supabase setup:
 *
 *   1. Refresh the session on every matched request, so a rotating access token
 *      never expires mid session. This is the documented reason middleware has
 *      to exist even when the RLS policies are already correct.
 *   2. Send anonymous visitors away from /dashboard before any server component
 *      runs, so protected markup is never streamed to an unauthenticated user.
 *
 * middleware only checks that a session exists. It cannot read the role, because
 * that would mean a database query on every request including static assets.
 * Role checks therefore live in the server layer (lib/auth.ts) and in the
 * database (02_rls.sql), which is the correct place for them anyway.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = ['/login', '/unauthorized', '/auth/callback'];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, pathname } = await updateSession(request);

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // API routes answer with a status code and a JSON body, not a redirect. The
  // session is still refreshed above, so an API handler reads a live cookie; it
  // just returns 401 itself instead of being bounced to the login form, which
  // would otherwise arrive as HTML the client cannot parse.
  const isApiRoute = pathname.startsWith('/api/');

  // Signed-in users have no reason to see the login form.
  if (user && isPublicRoute && pathname === '/login') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  if (!user && !isPublicRoute && !isApiRoute) {
    // Keep the destination so login can return the user to it, but do not carry
    // the original query string across: it would reappear as a stray filter on
    // the login URL, and the protected page will re-read it from its own params.
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.search = '';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     *   _next/static, _next/image   build output
     *   favicon.ico, common assets   files with an extension
     *   api/auth/callback            the OAuth code exchange
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
