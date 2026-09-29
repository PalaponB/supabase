'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { MAINTENANCE_STATUSES, MAINTENANCE_STATUS_LABEL } from '@/lib/constants';
import type { MaintenanceStatus } from '@/lib/supabase/types';

/**
 * technician_id is always taken from the signed-in user, never from the form.
 * A Technician could otherwise submit someone else's id and the RLS check in
 * maintenance_records_update would let them edit another technician's record.
 */
export async function saveMaintenance(
  _prev: { error: string | null; ok: string | null },
  formData: FormData,
) {
  const { user, role } = await requirePermission('manageMaintenance');

  const recordId = String(formData.get('record_id') ?? '');
  const machineId = String(formData.get('machine_id') ?? '');
  const actionTaken = String(formData.get('action_taken') ?? '').trim();
  const status = String(formData.get('status') ?? 'In Progress') as MaintenanceStatus;

  if (!actionTaken) return { error: 'กรุณากรอกรายละเอียดงานที่ดำเนินการ', ok: null };
  if (!MAINTENANCE_STATUSES.includes(status)) return { error: 'สถานะไม่ถูกต้อง', ok: null };

  const supabase = createClient();

  if (recordId) {
    const { error } = await supabase
      .from('maintenance_records')
      .update({ action_taken: actionTaken, status })
      .eq('id', recordId);

    if (error) {
      // RLS rejects a Technician editing somebody else's row with 42501.
      if (error.code === '42501') {
        return { error: 'คุณสามารถแก้ไขได้เฉพาะงานของตัวเองเท่านั้น', ok: null };
      }
      console.error('saveMaintenance update failed', error);
      return { error: `บันทึกไม่สำเร็จ: ${error.message}`, ok: null };
    }

    revalidatePath('/dashboard/maintenance');
    revalidatePath('/dashboard');
    return { error: null, ok: 'อัปเดตงานซ่อมบำรุงแล้ว' };
  }

  if (!machineId) return { error: 'กรุณาเลือกเครื่องจักร', ok: null };

  const alarmId = String(formData.get('alarm_id') ?? '') || null;

  const { error } = await supabase.from('maintenance_records').insert({
    machine_id: machineId,
    alarm_id: alarmId,
    technician_id: user.id,
    action_taken: actionTaken,
    status,
  });

  if (error) {
    if (error.code === '23503') {
      return { error: 'Alarm ที่เลือกไม่ถูกต้องกับเครื่องจักรนี้', ok: null };
    }
    console.error('saveMaintenance insert failed', error);
    return { error: `บันทึกไม่สำเร็จ: ${error.message}`, ok: null };
  }

  revalidatePath('/dashboard/maintenance');
  revalidatePath('/dashboard');
  return { error: null, ok: `บันทึกงานซ่อมบำรุงแล้ว (${role})` };
}

export async function deleteMaintenance(recordId: string) {
  await requirePermission('deleteMaintenance');

  if (!recordId) return { error: 'ไม่พบรายการ', ok: null };

  const supabase = createClient();
  const { error } = await supabase.from('maintenance_records').delete().eq('id', recordId);

  if (error) {
    console.error('deleteMaintenance failed', error);
    return { error: `ลบไม่สำเร็จ: ${error.message}`, ok: null };
  }

  revalidatePath('/dashboard/maintenance');
  revalidatePath('/dashboard');
  return { error: null, ok: 'ลบรายการงานซ่อมบำรุงแล้ว' };
}
