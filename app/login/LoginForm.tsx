'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login, type LoginState } from './actions';

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="submit" disabled={pending}>
      {pending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <form action={formAction} className="card">
      <input type="hidden" name="next" value={next} />

      <label htmlFor="email">อีเมล</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="admin@evchargeops.co.th"
        required
      />

      <label htmlFor="password">รหัสผ่าน</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
      />

      {state.error ? (
        <p role="alert" className="error">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
