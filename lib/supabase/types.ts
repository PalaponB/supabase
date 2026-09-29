// Mirrors the SQL objects created by 01_schema.sql.
// Consumed by SupabaseClient<Database> so every query is type checked against
// the real column names and role values.

export type Role = 'Admin' | 'Technician' | 'Viewer';

export type MachineStatus = 'Available' | 'Charging' | 'Fault' | 'Under Service';
export type AlarmStatus = 'Open' | 'In Progress' | 'Closed';
export type MaintenanceStatus = 'In Progress' | 'Completed' | 'Waiting Part';

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
};

export type Machine = {
  id: string;
  machine_id: string;
  name: string;
  type: string;
  location: string | null;
  status: MachineStatus;
  created_at: string;
  updated_at: string;
};

export type Alarm = {
  id: string;
  machine_id: string;
  alarm_code: string;
  description: string;
  cause: string | null;
  status: AlarmStatus;
  created_at: string;
  updated_at: string;
};

export type MaintenanceRecord = {
  id: string;
  alarm_id: string | null;
  machine_id: string;
  technician_id: string | null;
  action_taken: string;
  status: MaintenanceStatus;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        { id: string; full_name?: string | null; role?: Role },
        { full_name?: string | null; role?: Role }
      >;
      machines: Table<
        Machine,
        {
          machine_id: string;
          name: string;
          type: string;
          location?: string | null;
          status?: MachineStatus;
        },
        {
          machine_id?: string;
          name?: string;
          type?: string;
          location?: string | null;
          status?: MachineStatus;
        }
      >;
      alarms: Table<
        Alarm,
        {
          machine_id: string;
          alarm_code: string;
          description: string;
          cause?: string | null;
          status?: AlarmStatus;
          created_at?: string;
        },
        { description?: string; cause?: string | null; status?: AlarmStatus }
      >;
      maintenance_records: Table<
        MaintenanceRecord,
        {
          alarm_id?: string | null;
          machine_id: string;
          technician_id?: string | null;
          action_taken: string;
          status?: MaintenanceStatus;
          created_at?: string;
        },
        { action_taken?: string; status?: MaintenanceStatus }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      current_role: { Args: Record<PropertyKey, never>; Returns: string };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type { Json };
