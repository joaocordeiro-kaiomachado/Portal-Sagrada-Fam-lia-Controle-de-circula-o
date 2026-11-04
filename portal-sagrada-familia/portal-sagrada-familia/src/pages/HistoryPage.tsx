import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, FilePlus2, FilterX, SearchX, Search, UserRound } from 'lucide-react';
import { Card, EmptyState, ErrorBanner, PageHeader, Pagination, Spinner } from '../components/ui/Misc';
import { Input, Select } from '../components/ui/Field';
import { AuthorizationTable } from '../components/authorizations/AuthorizationTable';
import { AuthorizationDetails } from '../components/authorizations/AuthorizationDetails';
import { classOptions, listAuthorizations, type AuthorizationFilters } from '../services/authorizations';
import { useRealtimeAuthorizations } from '../hooks/useRealtimeAuthorizations';
import { usePrintAuthorization } from '../hooks/usePrintAuthorization';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../contexts/AuthContext';
import { REASONS, PAGE_SIZE } from '../lib/constants';
import { friendlyError } from '../lib/errors';
import { plural } from '../lib/format';
import type { Authorization } from '../types/database';

const emptyFilters = {
  student: '',
  teacher: '',
  classKey: '',
  dateFrom: '',
  dateTo: '',
  reason: '',
  onlyMine: false,
  sort: 'desc' as 'desc' | 'asc',
};

function FilterLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[12px] font-bold text-label">
      {children}
    </label>
  );
}

export function HistoryPage() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Authorization[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<{ school_year: string; class_group: string }[]>([]);
  const [selected, setSelected] = useState<Authorization | null>(null);
  const { print, node: printNode } = usePrintAuthorization();

  const student = useDebounce(filters.student);
  const teacher = useDebounce(filters.teacher);

  const query: AuthorizationFilters = useMemo(
    () => ({
      student,
      teacher,
      classKey: filters.classKey,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      reason: filters.reason,
      onlyMine: filters.onlyMine,
      userId: profile?.id,
      sort: filters.sort,
    }),
    [student, teacher, filters.classKey, filters.dateFrom, filters.dateTo, filters.reason, filters.onlyMine, filters.sort, profile?.id],
  );

  const requestId = useRef(0);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const res = await listAuthorizations(query, page, PAGE_SIZE);
      if (id !== requestId.current) return; // resposta antiga: ignora
      setRows(res.rows);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      setError(friendlyError(err, 'Não foi possível carregar o histórico.'));
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  const loadClasses = useCallback(() => {
    classOptions().then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(loadClasses, [loadClasses]);
  useEffect(() => setPage(0), [query]);

  useRealtimeAuthorizations(() => {
    void load();
    loadClasses();
  });

  const set = <K extends keyof typeof emptyFilters>(k: K, v: (typeof emptyFilters)[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const hasFilters =
    filters.student || filters.teacher || filters.classKey || filters.dateFrom || filters.dateTo || filters.reason || filters.onlyMine;

  return (
    <>
      <PageHeader
        eyebrow="Consulta"
        title="Histórico de autorizações"
        description="Pesquise, filtre, veja detalhes e imprima as autorizações registradas."
        actions={
          <Link
            to="/nova"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-[var(--shadow-button)] transition hover:bg-brand-dark"
          >
            <FilePlus2 className="h-4 w-4" /> Nova autorização
          </Link>
        }
      />

      <Card className="mb-6 px-7 py-6">
        <div className="grid grid-cols-12 gap-x-5 gap-y-4">
          <div className="col-span-12 md:col-span-6 xl:col-span-3">
            <FilterLabel htmlFor="f-student">Aluno(a)</FilterLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input id="f-student" small placeholder="Buscar por nome do aluno" className="pl-10" value={filters.student} onChange={(e) => set('student', e.target.value)} />
            </div>
          </div>
          <div className="col-span-12 md:col-span-6 xl:col-span-3">
            <FilterLabel htmlFor="f-teacher">Professor(a)</FilterLabel>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input id="f-teacher" small placeholder="Buscar por professor" className="pl-10" value={filters.teacher} onChange={(e) => set('teacher', e.target.value)} />
            </div>
          </div>
          <div className="col-span-6 md:col-span-4 xl:col-span-2">
            <FilterLabel htmlFor="f-class">Turma</FilterLabel>
            <Select id="f-class" small value={filters.classKey} onChange={(e) => set('classKey', e.target.value)}>
              <option value="">Todas</option>
              {classes.map((c) => (
                <option key={`${c.school_year}|${c.class_group}`} value={`${c.school_year}|${c.class_group}`}>
                  {c.school_year} {c.class_group}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-6 md:col-span-4 xl:col-span-2">
            <FilterLabel htmlFor="f-reason">Motivo</FilterLabel>
            <Select id="f-reason" small value={filters.reason} onChange={(e) => set('reason', e.target.value)}>
              <option value="">Todos</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-12 md:col-span-4 xl:col-span-2">
            <FilterLabel htmlFor="f-sort">Ordenação</FilterLabel>
            <button
              id="f-sort"
              type="button"
              onClick={() => set('sort', filters.sort === 'desc' ? 'asc' : 'desc')}
              className="field-control field-control-sm flex items-center justify-between text-left text-body"
            >
              {filters.sort === 'desc' ? 'Mais recentes' : 'Mais antigas'}
              {filters.sort === 'desc' ? <ArrowDownWideNarrow className="h-4 w-4 text-muted" /> : <ArrowUpNarrowWide className="h-4 w-4 text-muted" />}
            </button>
          </div>
          <div className="col-span-6 md:col-span-3 xl:col-span-2">
            <FilterLabel htmlFor="f-from">Data inicial</FilterLabel>
            <Input id="f-from" small type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(e) => set('dateFrom', e.target.value)} />
          </div>
          <div className="col-span-6 md:col-span-3 xl:col-span-2">
            <FilterLabel htmlFor="f-to">Data final</FilterLabel>
            <Input id="f-to" small type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(e) => set('dateTo', e.target.value)} />
          </div>
          <div className="col-span-12 flex items-end justify-between gap-4 md:col-span-6 xl:col-span-8">
            <label className="flex h-10 cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-body select-none">
              <input
                type="checkbox"
                checked={filters.onlyMine}
                onChange={(e) => set('onlyMine', e.target.checked)}
                className="h-[18px] w-[18px] cursor-pointer rounded accent-brand"
              />
              Somente registros feitos por mim
            </label>
            <button
              type="button"
              onClick={() => setFilters(emptyFilters)}
              disabled={!hasFilters}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-[13px] font-bold text-body transition hover:bg-surface disabled:opacity-40"
            >
              <FilterX className="h-4 w-4" /> Limpar filtros
            </button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-divider px-7 py-4">
          <p className="text-[14px] font-bold text-ink">
            {rows === null ? 'Carregando…' : plural(total, 'autorização encontrada', 'autorizações encontradas')}
          </p>
          {loading && rows !== null && <span className="text-[12.5px] text-muted">Atualizando…</span>}
        </div>
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-6 w-6" />}
            title={hasFilters ? 'Nenhum resultado para os filtros' : 'Nenhuma autorização registrada'}
            description={hasFilters ? 'Ajuste ou limpe os filtros para ver mais registros.' : 'As autorizações registradas aparecerão aqui.'}
          />
        ) : (
          <>
            <div className={loading ? 'opacity-60 transition' : 'transition'}>
              <AuthorizationTable rows={rows} onOpen={setSelected} onPrint={print} />
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </>
        )}
      </Card>

      <AuthorizationDetails item={selected} onClose={() => setSelected(null)} onPrint={print} onChanged={load} />
      {printNode}
    </>
  );
}
