import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from './supabase/server';
import type { Profile, Role } from './supabase/types';
import { can, type Permission } from './permissions';

export type AuthContext = {
  user: User;
  profile: Profile;
  role: Role;
};

/**
 * Reads the signed-in user. Wrapped in React cache() so a page that calls it
 * several times still performs a single round trip per request.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Reads the profile row that the on_auth_user_created trigger created.
 * The role is never taken from user metadata, only from the database, so a user
 * cannot grant themselves Admin by editing a JWT or a signUp payload.
 */
export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to load profile for', userId, error);
    return null;
  }
  return data;
});

/** Resolves the full auth context, or null when there is no valid session. */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const user = await getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile) return null;

  return { user, profile, role: profile.role };
});

/**
 * Guard for Server Components and Server Actions: bounces anonymous visitors to
 * the login page. Remember to call it before any data access, not after.
 */
export async function requireUser(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) redirect('/login');
  return context;
}

/** Guard for pages and actions that need a specific role. */
export async function requireRole(allowed: readonly Role[]): Promise<AuthContext> {
  const context = await requireUser();
  if (!allowed.includes(context.role)) redirect('/unauthorized');
  return context;
}

/** Guard for a specific permission from the matrix in lib/permissions.ts. */
export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const context = await requireUser();
  if (!can(context.role, permission)) redirect('/unauthorized');
  return context;
}
