import type { AlarmStatus, MachineStatus, MaintenanceStatus } from './supabase/types';

export const MACHINE_STATUSES: MachineStatus[] = [
  'Available',
  'Charging',
  'Fault',
  'Under Service',
];

export const MACHINE_STATUS_LABEL: Record<MachineStatus, string> = {
  Available: 'พร้อมใช้งาน',
  Charging: 'กำลังชาร์จ',
  Fault: 'มีความผิดปกติ',
  'Under Service': 'อยู่ระหว่างซ่อม',
};

export const ALARM_STATUSES: AlarmStatus[] = ['Open', 'In Progress', 'Closed'];

export const ALARM_STATUS_LABEL: Record<AlarmStatus, string> = {
  Open: 'เปิด',
  'In Progress': 'กำลังดำเนินการ',
  Closed: 'ปิด',
};

export const MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  'In Progress',
  'Completed',
  'Waiting Part',
];

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  'In Progress': 'กำลังดำเนินการ',
  Completed: 'เสร็จสิ้น',
  'Waiting Part': 'รออะไหล่',
};
