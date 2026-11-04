import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CalendarRange, ChartColumn, ClipboardCheck, FilePlus2, History, Inbox, Sun, Users } from 'lucide-react';
import { Card, CardHeader, ErrorBanner, PageHeader, Spinner, EmptyState } from '../components/ui/Misc';
import { AuthorizationTable } from '../components/authorizations/AuthorizationTable';
import { AuthorizationDetails } from '../components/authorizations/AuthorizationDetails';
import { dashboardStats, recentAuthorizations } from '../services/authorizations';
import { useRealtimeAuthorizations } from '../hooks/useRealtimeAuthorizations';
import { usePrintAuthorization } from '../hooks/usePrintAuthorization';
import { useAuth } from '../contexts/AuthContext';
import { friendlyError } from '../lib/errors';
import type { Authorization, DashboardStats } from '../types/database';

function greeting() {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date()));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number | undefined; highlight?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border px-6 py-5 ${
        highlight ? 'border-transparent bg-brand text-white shadow-[var(--shadow-button)]' : 'border-white/80 bg-white shadow-[var(--shadow-soft)]'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-[13px] font-semibold ${highlight ? 'text-white/80' : 'text-soft'}`}>{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${highlight ? 'bg-white/12 text-accent' : 'bg-canvas text-muted'}`}>{icon}</span>
      </div>
      <p className={`mt-3 text-[36px] leading-none font-bold tracking-[-0.03em] tabular-nums ${highlight ? 'text-white' : 'text-ink'}`}>
        {value === undefined ? <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-current opacity-10" /> : value.toLocaleString('pt-BR')}
      </p>
      {highlight && <div className="absolute -right-6 -bottom-10 h-28 w-28 rounded-full bg-white/5" aria-hidden />}
    </div>
  );
}

function Shortcut({ to, icon, title, text }: { to: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-divider bg-white px-4 py-3.5 transition hover:border-line hover:shadow-[var(--shadow-soft)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-brand transition group-hover:bg-brand group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-ink">{title}</span>
        <span className="block truncate text-[12.5px] text-soft">{text}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}

export function DashboardPage() {
  const { profile, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>();
  const [recent, setRecent] = useState<Authorization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Authorization | null>(null);
  const { print, node: printNode } = usePrintAuthorization();

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([dashboardStats(), recentAuthorizations(8)]);
      setStats(s);
      setRecent(r);
      setError(null);
    } catch (err) {
      setError(friendlyError(err, 'Não foi possível carregar o painel.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeAuthorizations(load);

  const firstName = profile?.full_name.split(' ')[0] ?? '';
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date());

  return (
    <>
      <PageHeader
        eyebrow={today}
        title={`${greeting()}, ${firstName}`}
        description={
          isAdmin
            ? 'Resumo das saídas registradas por toda a escola.'
            : 'Resumo das autorizações que você pode consultar.'
        }
        actions={
          <Link
            to="/nova"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-[var(--shadow-button)] transition hover:bg-brand-dark"
          >
            <FilePlus2 className="h-4 w-4" /> Nova autorização
          </Link>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <StatCard highlight icon={<Sun className="h-[18px] w-[18px]" />} label="Saídas hoje" value={stats?.today} />
        <StatCard icon={<CalendarDays className="h-[18px] w-[18px]" />} label="Nesta semana" value={stats?.week} />
        <StatCard icon={<CalendarRange className="h-[18px] w-[18px]" />} label="Neste mês" value={stats?.month} />
        <StatCard icon={<ClipboardCheck className="h-[18px] w-[18px]" />} label="Total registrado" value={stats?.total} />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-7 min-[1440px]:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Últimas autorizações"
            subtitle="Atualizado automaticamente quando houver novos registros"
            actions={
              <Link to="/historico" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-focus hover:underline">
                Ver histórico <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {recent === null ? (
            <Spinner />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title="Nenhuma autorização registrada"
              description="Quando uma saída for registrada, ela aparecerá aqui."
            />
          ) : (
            <AuthorizationTable rows={recent} onOpen={setSelected} onPrint={print} compact />
          )}
        </Card>

        <Card className="h-fit p-6">
          <h2 className="text-[17px] font-bold text-ink">Atalhos</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 min-[1440px]:grid-cols-1">
            <Shortcut to="/nova" icon={<FilePlus2 className="h-[18px] w-[18px]" />} title="Nova autorização" text="Registrar a saída de um aluno" />
            <Shortcut to="/historico" icon={<History className="h-[18px] w-[18px]" />} title="Histórico" text="Pesquisar, filtrar e imprimir" />
            {isAdmin && (
              <>
                <Shortcut to="/relatorios" icon={<ChartColumn className="h-[18px] w-[18px]" />} title="Relatórios" text="Totais por dia, turma e motivo" />
                <Shortcut to="/usuarios" icon={<Users className="h-[18px] w-[18px]" />} title="Usuários" text="Contas e permissões de acesso" />
              </>
            )}
          </div>
        </Card>
      </div>

      <AuthorizationDetails item={selected} onClose={() => setSelected(null)} onPrint={print} onChanged={load} />
      {printNode}
    </>
  );
}
