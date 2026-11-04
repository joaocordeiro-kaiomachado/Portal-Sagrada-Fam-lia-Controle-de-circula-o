import { supabase } from '../lib/supabase';
import { AppError } from '../lib/errors';
import type { AppSettings, AuditEntry, Profile, UserRole } from '../types/database';

export async function listProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').order('full_name');
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateProfile(id: string, patch: { full_name?: string; role?: UserRole }) {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError('Você não tem permissão para alterar este usuário.');
  return data as Profile;
}

/** Chama a Edge Function "admin-users" (operações com a chave de serviço). */
async function callAdminFunction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    // Tenta ler a mensagem de erro devolvida pela função.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const payload = await ctx.json();
        if (payload?.error) throw new AppError(payload.error);
      } catch (inner) {
        if (inner instanceof AppError) throw inner;
      }
    }
    if (/Failed to send|FunctionsFetchError|not found|404/i.test(error.message)) {
      throw new AppError(
        'A função "admin-users" não está publicada no Supabase. Veja o passo 4 do manual de publicação.',
      );
    }
    throw error;
  }
  if (data?.error) throw new AppError(data.error);
  return data;
}

export function createUser(input: { full_name: string; email: string; role: UserRole; password: string }) {
  return callAdminFunction({ action: 'create', ...input });
}

export function setUserPassword(userId: string, password: string) {
  return callAdminFunction({ action: 'set_password', user_id: userId, password });
}

export function setUserActive(userId: string, active: boolean) {
  return callAdminFunction({ action: 'set_active', user_id: userId, active });
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  });
  if (error) throw error;
}

export async function getSettings() {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data as AppSettings | null;
}

export async function updateSettings(patch: { professors_see_all: boolean }) {
  const { data, error } = await supabase.from('app_settings').update(patch).eq('id', 1).select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError('Você não tem permissão para alterar as configurações.');
  return data as AppSettings;
}

export async function listAudit(page: number, pageSize: number, table?: string) {
  let q = supabase.from('audit_log').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (table) q = q.eq('table_name', table);
  const from = page * pageSize;
  const { data, error, count } = await q.range(from, from + pageSize - 1);
  if (error) throw error;
  return { rows: (data ?? []) as AuditEntry[], total: count ?? 0 };
}
