import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Server client for React Server Components, Server Actions and Route Handlers.
 *
 * Auth cookies are read from the incoming request and, when Supabase rotates the
 * session (or a server action refreshes the token), the new values are written
 * back onto the outgoing response. Server Components cannot set cookies, so in
 * that context the write is a no-op and the refresh is handled by middleware
 * instead, which is why middleware.ts calls updateSession on every request.
 *
 * This function must not be imported from a "use client" file.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component. Safe to ignore: middleware
            // refreshes the session cookie on the next navigation.
          }
        },
      },
    },
  );
}
