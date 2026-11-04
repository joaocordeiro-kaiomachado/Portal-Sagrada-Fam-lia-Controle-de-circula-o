export type UserRole = 'admin' | 'professor';

export type ExitReason = 'banheiro' | 'biblioteca' | 'setor_pedagogico' | 'outro';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Authorization {
  id: string;
  code: number;
  teacher_name: string;
  student_name: string;
  school_year: string;
  class_group: string;
  authorization_date: string; // AAAA-MM-DD
  exit_time: string; // HH:MM:SS
  reason: ExitReason;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export type AuthorizationInput = Pick<
  Authorization,
  'teacher_name' | 'student_name' | 'school_year' | 'class_group' | 'authorization_date' | 'exit_time' | 'reason'
> & { notes: string | null };

export interface AppSettings {
  id: number;
  professors_see_all: boolean;
  updated_at: string;
}

export interface AuditEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  actor_id: string | null;
  actor_name: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  today: number;
  week: number;
  month: number;
  total: number;
}

export interface ReportItem {
  label: string;
  total: number;
}

export interface ReportSummary {
  total: number;
  by_day: ReportItem[];
  by_class: ReportItem[];
  by_teacher: ReportItem[];
  by_reason: ReportItem[];
}
