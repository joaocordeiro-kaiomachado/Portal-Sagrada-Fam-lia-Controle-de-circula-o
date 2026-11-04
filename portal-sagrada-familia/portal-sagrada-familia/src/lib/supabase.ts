import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true quando as variáveis de ambiente foram configuradas. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // "implicit": o link de recuperação de senha funciona mesmo quando o
    // e-mail é aberto em outra aba ou outro navegador.
    flowType: 'implicit',
    // sessionStorage: a sessão termina ao fechar o navegador — mais seguro
    // em computadores compartilhados da escola.
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
  },
});
