import type { AlarmStatus, MachineStatus, MaintenanceStatus } from './supabase/types';

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  });
}

export function machineStatusClass(status: MachineStatus): string {
  return `status ${status.toLowerCase().replace(/\s+/g, '-')}`;
}

export function alarmStatusClass(status: AlarmStatus): string {
  return `status ${status.toLowerCase().replace(/\s+/g, '-')}`;
}

export function maintenanceStatusClass(status: MaintenanceStatus): string {
  return `status ${status.toLowerCase().replace(/\s+/g, '-')}`;
}
