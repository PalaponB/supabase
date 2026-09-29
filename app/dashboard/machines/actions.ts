'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { MACHINE_STATUSES, MACHINE_STATUS_LABEL } from '@/lib/constants';
import type { MachineStatus } from '@/lib/supabase/types';

/**
 * Every action re-checks the role on the server before touching data. The
 * hidden buttons in the UI are convenience only, never the enforcement point:
 * a crafted request still has to pass both this guard and the RLS policy.
 */
export async function setMachineStatus(machineId: string, status: MachineStatus) {
  await requirePermission('manageMachines');

  if (!machineId) return { error: 'ไม่พบเครื่องจักร', ok: null };
  if (!MACHINE_STATUSES.includes(status)) return { error: 'สถานะไม่ถูกต้อง', ok: null };

  const supabase = createClient();
  const { error } = await supabase.from('machines').update({ status }).eq('id', machineId);

  if (error) {
    console.error('setMachineStatus failed', error);
    return { error: `อัปเดตไม่สำเร็จ: ${error.message}`, ok: null };
  }

  revalidatePath('/dashboard/machines');
  revalidatePath('/dashboard');
  return { error: null, ok: `อัปเดตเป็น ${MACHINE_STATUS_LABEL[status]} แล้ว` };
}

export async function createMachine(
  _prev: { error: string | null; ok: string | null },
  formData: FormData,
) {
  await requirePermission('manageMachines');

  const machineId = String(formData.get('machine_id') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const type = String(formData.get('type') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const status = String(formData.get('status') ?? 'Available') as MachineStatus;

  if (!machineId || !name || !type) {
    return { error: 'กรุณากรอกรหัสเครื่องจักร ชื่อ และประเภท', ok: null };
  }
  if (!MACHINE_STATUSES.includes(status)) return { error: 'สถานะไม่ถูกต้อง', ok: null };

  const supabase = createClient();
  const { error } = await supabase.from('machines').insert({
    machine_id: machineId,
    name,
    type,
    location: location || null,
    status,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: `รหัสเครื่องจักร ${machineId} มีอยู่แล้ว`, ok: null };
    }
    console.error('createMachine failed', error);
    return { error: `เพิ่มไม่สำเร็จ: ${error.message}`, ok: null };
  }

  revalidatePath('/dashboard/machines');
  revalidatePath('/dashboard');
  return { error: null, ok: `เพิ่มเครื่องจักร ${machineId} แล้ว` };
}

export async function deleteMachine(machineId: string) {
  await requirePermission('manageMachines');

  if (!machineId) return { error: 'ไม่พบเครื่องจักร', ok: null };

  const supabase = createClient();
  const { error } = await supabase.from('machines').delete().eq('id', machineId);

  if (error) {
    // alarms reference machines ON DELETE CASCADE, but maintenance_records
    // holds a composite FK to alarms ON DELETE RESTRICT, so a machine that
    // still has alarms cannot be removed. Explain that instead of leaking the
    // raw constraint message.
    if (error.code === '23503') {
      return { error: 'ลบไม่ได้ เครื่องจักรนี้ยังมี Alarm ผูกอยู่ กรุณาลบ Alarm ก่อน', ok: null };
    }
    console.error('deleteMachine failed', error);
    return { error: `ลบไม่สำเร็จ: ${error.message}`, ok: null };
  }

  revalidatePath('/dashboard/machines');
  revalidatePath('/dashboard');
  return { error: null, ok: `ลบเครื่องจักร ${machineId} แล้ว` };
}
