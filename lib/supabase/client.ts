import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Browser client. Safe to expose publicly: it only ever holds the anon key and
 * every query is filtered by Row Level Security using the signed-in user's JWT.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
