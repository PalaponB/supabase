'use client';

import { useTransition, useState } from 'react';
import { changeUserRole } from './actions';
import type { Role } from '@/lib/supabase/types';

const ROLES: Role[] = ['Admin', 'Technician', 'Viewer'];

export function RoleSelect({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: Role;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="row-form">
      <select
        defaultValue={currentRole}
        disabled={pending}
        aria-label="เปลี่ยนบทบาท"
        onChange={(event) => {
          const next = event.target.value as Role;
          if (
            !window.confirm(
              `เปลี่ยนบทบาทเป็น ${next} หรือไม่?\nการเปลี่ยนแปลงจะมีผลทันที`,
            )
          ) {
            event.target.value = currentRole;
            return;
          }
          startTransition(async () => {
            const result = await changeUserRole(userId, next);
            setError(result.error);
          });
        }}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
      {isSelf ? <span className="muted">บัญชีของคุณ</span> : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
