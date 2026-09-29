import type { Role } from './supabase/types';

/**
 * Single source of truth for what each role may do in the UI.
 *
 * This matrix is a UX layer only. It hides buttons and disables fields so users
 * do not see actions that would be rejected. It is deliberately NOT a security
 * boundary: every check is mirrored by an RLS policy in 02_rls.sql, and a
 * modified client cannot get past the database. Keep the two in sync when roles
 * change, and treat 02_rls.sql as the authoritative one.
 */
export const PERMISSIONS = {
  /** Anyone signed in can read machines, alarms and maintenance history. */
  read: ['Admin', 'Technician', 'Viewer'] as const,

  /** Create, edit and delete machines. */
  manageMachines: ['Admin'] as const,

  /** Acknowledge or close an alarm. Technicians cannot delete alarms. */
  manageAlarms: ['Admin', 'Technician'] as const,
  deleteAlarms: ['Admin'] as const,

  /**
   * Rewriting an alarm's machine, code, description or cause, as opposed to
   * moving it through its states. Split out from manageAlarms so a Technician
   * works the queue without being able to rewrite history.
   *
   * RLS cannot restrict this by column, so the policy still lets a Technician
   * update any alarm column; this flag is the application-layer half of the
   * control.
   */
  editAlarmDetails: ['Admin'] as const,

  /** Log maintenance work. Technicians may edit only their own entries. */
  manageMaintenance: ['Admin', 'Technician'] as const,
  deleteMaintenance: ['Admin'] as const,

  /** Only an Admin may change a role. */
  manageRoles: ['Admin'] as const,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const ROLE_LABEL: Record<Role, string> = {
  Admin: 'ผู้ดูแลระบบ',
  Technician: 'ช่างซ่อมบำรุง',
  Viewer: 'ผู้ดูข้อมูล',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  Admin: 'เข้าถึงทุกหน้า เพิ่ม แก้ไข และลบข้อมูลได้ครบถ้วน',
  Technician: 'ดูเครื่องจักร เปลี่ยนสถานะ Alarm และบันทึกงานซ่อมบำรุงของตนเอง',
  Viewer: 'ดูข้อมูลอย่างเดียว แก้ไขไม่ได้',
};
