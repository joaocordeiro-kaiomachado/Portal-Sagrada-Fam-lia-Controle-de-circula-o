import { supabase } from '../lib/supabase';
import { AppError } from '../lib/errors';
import type { Authorization, AuthorizationInput, DashboardStats, ReportSummary } from '../types/database';

export interface AuthorizationFilters {
  student?: string;
  teacher?: string;
  classKey?: string; // "school_year|class_group"
  dateFrom?: string;
  dateTo?: string;
  reason?: string;
  onlyMine?: boolean;
  userId?: string;
  sort?: 'desc' | 'asc';
}

/** Escapa curingas do ILIKE para buscar o texto literalmente. */
const likeValue = (v: string) => `%${v.trim().replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

function buildQuery(filters: AuthorizationFilters, withCount: boolean) {
  let q = supabase.from('authorizations').select('*', withCount ? { count: 'exact' } : undefined);

  if (filters.student?.trim()) q = q.ilike('student_name', likeValue(filters.student));
  if (filters.teacher?.trim()) q = q.ilike('teacher_name', likeValue(filters.teacher));
  if (filters.classKey) {
    const [year, group] = filters.classKey.split('|');
    q = q.eq('school_year', year).eq('class_group', group);
  }
  if (filters.dateFrom) q = q.gte('authorization_date', filters.dateFrom);
  if (filters.dateTo) q = q.lte('authorization_date', filters.dateTo);
  if (filters.reason) q = q.eq('reason', filters.reason);
  if (filters.onlyMine && filters.userId) q = q.eq('created_by', filters.userId);

  const ascending = filters.sort === 'asc';
  return q
    .order('authorization_date', { ascending })
    .order('exit_time', { ascending })
    .order('code', { ascending });
}

export async function listAuthorizations(filters: AuthorizationFilters, page: number, pageSize: number) {
  const from = page * pageSize;
  const { data, error, count } = await buildQuery(filters, true).range(from, from + pageSize - 1);
  if (error) throw error;
  return { rows: (data ?? []) as Authorization[], total: count ?? 0 };
}

/** Busca todos os registros do filtro (em blocos de 1000) — usado nas exportações. */
export async function listAllAuthorizations(filters: AuthorizationFilters): Promise<Authorization[]> {
  const all: Authorization[] = [];
  const chunk = 1000;
  for (let from = 0; ; from += chunk) {
    const { data, error } = await buildQuery(filters, false).range(from, from + chunk - 1);
    if (error) throw error;
    all.push(...((data ?? []) as Authorization[]));
    if (!data || data.length < chunk) break;
  }
  return all;
}

export async function getAuthorization(id: string) {
  const { data, error } = await supabase.from('authorizations').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Authorization | null;
}

export async function createAuthorization(input: AuthorizationInput) {
  const { data, error } = await supabase.from('authorizations').insert(input).select('*').single();
  if (error) throw error;
  return data as Authorization;
}

export async function updateAuthorization(id: string, input: AuthorizationInput) {
  const { data, error } = await supabase.from('authorizations').update(input).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError('Você não tem permissão para editar este registro.');
  return data as Authorization;
}

export async function deleteAuthorization(id: string) {
  const { data, error } = await supabase.from('authorizations').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new AppError('Você não tem permissão para excluir este registro.');
}

export async function recentAuthorizations(limit = 6) {
  const { data, error } = await supabase
    .from('authorizations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Authorization[];
}

export async function dashboardStats() {
  const { data, error } = await supabase.rpc('dashboard_stats');
  if (error) throw error;
  return data as DashboardStats;
}

export async function reportSummary(start: string, end: string) {
  const { data, error } = await supabase.rpc('report_summary', { p_start: start, p_end: end });
  if (error) throw error;
  return data as ReportSummary;
}

export async function classOptions() {
  const { data, error } = await supabase.rpc('class_options');
  if (error) throw error;
  return (data ?? []) as { school_year: string; class_group: string }[];
}
