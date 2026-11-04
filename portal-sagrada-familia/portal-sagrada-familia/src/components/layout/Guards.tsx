import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BrandMark } from './Brand';
import { LoaderCircle } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <BrandMark className="h-14 w-14" />
      <p className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Carregando o portal…
      </p>
    </div>
  );
}

/** Só usuários autenticados e ativos entram nas rotas internas. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading, refreshProfile, signOut } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  if (!profile)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <BrandMark className="h-14 w-14" />
        <p className="max-w-sm text-sm leading-6 text-soft">
          Não foi possível carregar o seu perfil. Verifique a conexão com a internet.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => void refreshProfile()} className="h-10 rounded-[10px] bg-brand px-4 text-[13px] font-bold text-white">
            Tentar novamente
          </button>
          <button type="button" onClick={() => void signOut()} className="h-10 rounded-[10px] border border-line bg-white px-4 text-[13px] font-bold text-body">
            Sair
          </button>
        </div>
      </div>
    );
  return <>{children}</>;
}

/** Rotas exclusivas de administradores. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
