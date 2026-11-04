import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { IDLE_TIMEOUT_MINUTES } from '../lib/constants';
import { AppError } from '../lib/errors';
import type { Profile } from '../types/database';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  /** Mensagem exibida na tela de login (ex.: sessão encerrada por inatividade). */
  notice: string | null;
  clearNotice: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: (notice?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const signOut = useCallback(async (message?: string) => {
    if (message) setNotice(message);
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const loadProfile = useCallback(
    async (s: Session | null) => {
      if (!s) {
        setProfile(null);
        return;
      }
      try {
        const p = await fetchProfile(s.user.id);
        if (!p || !p.active) {
          await signOut('Sua conta está desativada ou sem perfil. Procure a coordenação.');
          return;
        }
        setProfile(p);
      } catch {
        setProfile(null);
      }
    },
    [signOut],
  );

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Evita chamadas ao Supabase dentro do callback (recomendação da biblioteca).
        setTimeout(() => void loadProfile(s), 0);
      }
      if (event === 'SIGNED_OUT') setProfile(null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Encerra a sessão após um período sem uso.
  const idleTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!session) return;
    const reset = () => {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(
        () => void signOut(`Por segurança, a sessão foi encerrada após ${IDLE_TIMEOUT_MINUTES} minutos sem uso.`),
        IDLE_TIMEOUT_MINUTES * 60_000,
      );
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [session, signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    setNotice(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
    const p = await fetchProfile(data.user.id);
    if (!p || !p.active) {
      await supabase.auth.signOut();
      throw new AppError('Esta conta está desativada. Procure a coordenação.');
    }
    setSession(data.session);
    setProfile(p);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session);
  }, [loadProfile, session]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      isAdmin: profile?.role === 'admin' && profile.active,
      notice,
      clearNotice: () => setNotice(null),
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, notice, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
