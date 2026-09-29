'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ALARM_STATUSES, ALARM_STATUS_LABEL } from '@/lib/constants';
import type { AlarmStatus } from '@/lib/supabase/types';

/** Admin and Technician. Viewers are rejected by requirePermission. */
export async function setAlarmStatus(alarmId: string, status: AlarmStatus) {
  const { role } = await requirePermission('manageAlarms');

  if (!alarmId) return { error: 'ไม่พบ Alarm', ok: null };
  if (!ALARM_STATUSES.includes(status)) return { error: 'สถานะไม่ถูกต้อง', ok: null };

  const supabase = createClient();
  const { error } = await supabase.from('alarms').update({ status }).eq('id', alarmId);

  if (error) {
    console.error('setAlarmStatus failed', error);
    return { error: `อัปเดตไม่สำเร็จ: ${error.message}`, ok: null };
  }

  revalidatePath('/dashboard/alarms');
  revalidatePath('/dashboard');
  return {
    error: null,
    ok: `อัปเดตสถานะเป็น ${ALARM_STATUS_LABEL[status]} แล้ว (${role})`,
  };
}

/** Admin only. Technicians get redirected to /unauthorized by the guard. */
export async function deleteAlarm(alarmId: string) {
  await requirePermission('deleteAlarms');

  if (!alarmId) return { error: 'ไม่พบ Alarm', ok: null };

  const supabase = createClient();
  const { error } = await supabase.from('alarms').delete().eq('id', alarmId);

  if (error) {
    if (error.code === '23503') {
      return { error: 'ลบไม่ได้ Alarm นี้มีงานซ่อมบำรุงผูกอยู่', ok: null };
    }
    console.error('deleteAlarm failed', error);
    return { error: `ลบไม่สำเร็จ: ${error.message}`, ok: null };
  }

  revalidatePath('/dashboard/alarms');
  revalidatePath('/dashboard');
  return { error: null, ok: 'ลบ Alarm แล้ว' };
}

export async function createAlarm(
  _prev: { error: string | null; ok: string | null },
  formData: FormData,
) {
  const { role } = await requirePermission('manageAlarms');

  if (role === 'Technician') {
    return { error: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเปิด Alarm ใหม่ได้', ok: null };
  }

  const machineId = String(formData.get('machine_id') ?? '');
  const alarmCode = String(formData.get('alarm_code') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const cause = String(formData.get('cause') ?? '').trim();
  const status = String(formData.get('status') ?? 'Open') as AlarmStatus;

  if (!machineId || !alarmCode || !description) {
    return { error: 'กรุณากรอกเครื่องจักร รหัส และรายละเอียด', ok: null };
  }
  if (!ALARM_STATUSES.includes(status)) return { error: 'สถานะไม่ถูกต้อง', ok: null };

  const supabase = createClient();
  const { error } = await supabase.from('alarms').insert({
    machine_id: machineId,
    alarm_code: alarmCode,
    description,
    cause: cause || null,
    status,
  });

  if (error) {
    console.error('createAlarm failed', error);
    return { error: `เพิ่มไม่สำเร็จ: ${error.message}`, ok: null };
  }

  revalidatePath('/dashboard/alarms');
  revalidatePath('/dashboard');
  return { error: null, ok: `เปิด Alarm ${alarmCode} แล้ว` };
}
