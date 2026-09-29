'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type LoginState = {
  error: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Maps Supabase Auth error codes to Thai messages, so the UI never leaks English internals. */
function translateError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  }
  if (normalized.includes('email not confirmed')) {
    return 'อีเมลนี้ยังไม่ได้ยืนยัน กรุณากดยืนยันจากอีเมลที่ได้รับ';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  }
  if (normalized.includes('fetch failed') || normalized.includes('network')) {
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  }
  return 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
}

/**
 * Only allow same-site relative paths back, so the `next` parameter cannot be
 * used as an open redirect to an attacker controlled host.
 */
function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  return value;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNextPath(formData.get('next'));

  if (!EMAIL_PATTERN.test(email)) {
    return { error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  if (password.length === 0) {
    return { error: 'กรุณากรอกรหัสผ่าน' };
  }

  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('signInWithPassword failed:', error.message);
    return { error: translateError(error.message) };
  }

  // The session cookie was set inside the server action, so revalidateServer
  // lets the server components behind the redirect read the new session.
  revalidatePath('/', 'layout');
  redirect(next);
}

export async function logout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
