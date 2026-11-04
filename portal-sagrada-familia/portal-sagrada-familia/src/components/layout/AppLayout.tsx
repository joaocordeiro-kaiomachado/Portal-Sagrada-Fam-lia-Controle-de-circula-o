import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ChartColumn, ClipboardList, FilePlus2, History, LayoutDashboard, LogOut, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { initials } from '../../lib/format';
import { Brand } from './Brand';
import { ConfirmDialog } from '../ui/Modal';

const baseItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/nova', label: 'Nova autorização', icon: FilePlus2 },
  { to: '/historico', label: 'Histórico', icon: History },
];

const adminItems = [
  { to: '/relatorios', label: 'Relatórios', icon: ChartColumn },
  { to: '/usuarios', label: 'Usuários', icon: Users },
  { to: '/auditoria', label: 'Auditoria', icon: ClipboardList },
];

function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof History; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex h-11 items-center gap-3 rounded-xl px-3.5 text-[14px] font-semibold transition ${
          isActive ? 'bg-brand text-white shadow-[var(--shadow-button)]' : 'text-body hover:bg-white hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-white' : 'text-muted group-hover:text-ink'}`} aria-hidden />
          {label}
          {isActive && <span className="absolute top-1/2 right-3 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent" />}
        </>
      )}
    </NavLink>
  );
}

export function AppLayout() {
  const { profile, isAdmin, signOut } = useAuth();
  const [confirmOut, setConfirmOut] = useState(false);
  const [leaving, setLeaving] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 flex h-screen w-[288px] shrink-0 flex-col border-r border-white/70 bg-white/45 px-5 py-6 backdrop-blur-md max-[1100px]:w-[260px]">
        <div className="px-1">
          <Brand compact />
        </div>

        <nav className="mt-9 flex flex-col gap-1.5" aria-label="Menu principal">
          <p className="mb-1 px-3.5 text-[10.5px] font-bold tracking-[0.16em] text-faint uppercase">Registros</p>
          {baseItems.map((i) => (
            <NavItem key={i.to} {...i} />
          ))}
          {isAdmin && (
            <>
              <p className="mt-5 mb-1 px-3.5 text-[10.5px] font-bold tracking-[0.16em] text-faint uppercase">Administração</p>
              {adminItems.map((i) => (
                <NavItem key={i.to} {...i} />
              ))}
            </>
          )}
        </nav>

        <div className="mt-auto">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-3.5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-[13px] font-bold text-brand">
                {initials(profile?.full_name ?? '')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-ink" title={profile?.full_name}>
                  {profile?.full_name}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted">
                  {isAdmin && <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden />}
                  {isAdmin ? 'Administrador' : 'Professor(a)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmOut(true)}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-line bg-white text-[13px] font-bold text-body transition hover:border-hover-line hover:bg-surface"
            >
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>
          </div>
          <p className="mt-3 px-1 text-center text-[11px] leading-4 text-faint">Uso interno · dados protegidos (LGPD)</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-8 max-[1100px]:px-6 xl:px-11 xl:py-10">
        <div className="mx-auto max-w-[1440px]">
          <Outlet />
        </div>
      </main>

      <ConfirmDialog
        open={confirmOut}
        title="Sair da conta?"
        message="Você precisará entrar novamente com e-mail e senha para acessar o portal."
        confirmLabel="Sair"
        tone="primary"
        loading={leaving}
        onCancel={() => setConfirmOut(false)}
        onConfirm={async () => {
          setLeaving(true);
          await signOut();
          setLeaving(false);
          setConfirmOut(false);
        }}
      />
    </div>
  );
}
