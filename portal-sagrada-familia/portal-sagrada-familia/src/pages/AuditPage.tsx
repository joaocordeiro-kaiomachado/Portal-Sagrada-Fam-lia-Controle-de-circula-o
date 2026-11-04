import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ClipboardList } from 'lucide-react';
import { Card, EmptyState, ErrorBanner, PageHeader, Pagination, Pill, Spinner } from '../components/ui/Misc';
import { Select } from '../components/ui/Field';
import { listAudit } from '../services/users';
import { REASON_LABEL } from '../lib/constants';
import { friendlyError } from '../lib/errors';
import { formatCode, formatDate, formatDateTime, formatTime } from '../lib/format';
import type { AuditEntry } from '../types/database';

const PAGE = 25;

const TABLES: Record<string, string> = {
  authorizations: 'Autorização',
  profiles: 'Usuário',
  app_settings: 'Configuração',
};

const ACTIONS: Record<string, { label: string; tone: 'ok' | 'brand' | 'err' }> = {
  INSERT: { label: 'Criação', tone: 'ok' },
  UPDATE: { label: 'Alteração', tone: 'brand' },
  DELETE: { label: 'Exclusão', tone: 'err' },
};

const FIELD_LABELS: Record<string, string> = {
  teacher_name: 'Professor(a)',
  student_name: 'Aluno(a)',
  school_year: 'Ano escolar',
  class_group: 'Turma',
  authorization_date: 'Data',
  exit_time: 'Horário',
  reason: 'Motivo',
  notes: 'Observações',
  full_name: 'Nome',
  role: 'Perfil',
  active: 'Situação',
  email: 'E-mail',
  professors_see_all: 'Professores veem todos os registros',
};

const IGNORED = new Set(['updated_at', 'updated_by', 'created_at', 'created_by', 'id', 'code']);

function show(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (key === 'reason') return REASON_LABEL[String(v)] ?? String(v);
  if (key === 'authorization_date') return formatDate(String(v));
  if (key === 'exit_time') return formatTime(String(v));
  if (key === 'role') return v === 'admin' ? 'Administrador' : 'Professor(a)';
  if (key === 'active') return v ? 'Ativo' : 'Desativado';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return String(v);
}

function describe(e: AuditEntry): string {
  const d = (e.new_data ?? e.old_data ?? {}) as Record<string, unknown>;
  if (e.table_name === 'authorizations') {
    return `${d.code ? formatCode(Number(d.code)) + ' · ' : ''}${d.student_name ?? ''} (${d.school_year ?? ''} ${d.class_group ?? ''})`;
  }
  if (e.table_name === 'profiles') return `${d.full_name ?? ''} · ${d.email ?? ''}`;
  return 'Configurações gerais';
}

function Changes({ e }: { e: AuditEntry }) {
  const before = (e.old_data ?? {}) as Record<string, unknown>;
  const after = (e.new_data ?? {}) as Record<string, unknown>;
  const keys = Object.keys({ ...before, ...after }).filter((k) => !IGNORED.has(k) && FIELD_LABELS[k]);
  const rows = e.action === 'UPDATE' ? keys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])) : keys;
  if (rows.length === 0) return <p className="text-[13px] text-soft">Sem alteração em campos visíveis.</p>;
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
          <th className="w-1/4 py-1.5 pr-3">Campo</th>
          {e.action !== 'INSERT' && <th className="py-1.5 pr-3">Antes</th>}
          {e.action !== 'DELETE' && <th className="py-1.5">{e.action === 'UPDATE' ? 'Depois' : 'Valor'}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((k) => (
          <tr key={k} className="border-t border-divider">
            <td className="py-1.5 pr-3 font-semibold text-label">{FIELD_LABELS[k]}</td>
            {e.action !== 'INSERT' && <td className={`py-1.5 pr-3 ${e.action === 'UPDATE' ? 'text-err-dark line-through decoration-err/40' : ''}`}>{show(k, before[k])}</td>}
            {e.action !== 'DELETE' && <td className="py-1.5 text-[#0f172a]">{show(k, after[k])}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AuditPage() {
  const [table, setTable] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await listAudit(page, PAGE, table || undefined);
      setRows(r.rows);
      setTotal(r.total);
      setError(null);
    } catch (err) {
      setError(friendlyError(err, 'Não foi possível carregar a auditoria.'));
    }
  }, [page, table]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Auditoria"
        description="Registro automático de criações, alterações e exclusões. Não pode ser editado nem apagado pelo portal."
      />

      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-divider px-7 py-4">
          <p className="text-[14px] font-bold text-ink">{total.toLocaleString('pt-BR')} eventos</p>
          <div className="w-56">
            <Select small aria-label="Filtrar por tipo" value={table} onChange={(e) => { setTable(e.target.value); setPage(0); }}>
              <option value="">Todos os tipos</option>
              <option value="authorizations">Autorizações</option>
              <option value="profiles">Usuários</option>
              <option value="app_settings">Configurações</option>
            </Select>
          </div>
        </div>
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="Nenhum evento registrado" />
        ) : (
          <>
            <ul>
              {rows.map((e) => (
                <li key={e.id} className="border-b border-divider/80 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpen(open === e.id ? null : e.id)}
                    aria-expanded={open === e.id}
                    className="grid w-full grid-cols-[150px_110px_120px_minmax(0,1fr)_200px_24px] items-center gap-4 px-7 py-3.5 text-left text-[14px] transition hover:bg-[#f6f9fc]"
                  >
                    <span className="text-[13px] text-body tabular-nums">{formatDateTime(e.created_at)}</span>
                    <span>
                      <Pill tone={ACTIONS[e.action].tone}>{ACTIONS[e.action].label}</Pill>
                    </span>
                    <span className="font-semibold text-label">{TABLES[e.table_name] ?? e.table_name}</span>
                    <span className="truncate text-[#0f172a]">{describe(e)}</span>
                    <span className="truncate text-[13px] text-soft">{e.actor_name ?? (e.actor_id ? 'Usuário removido' : 'Sistema')}</span>
                    <ChevronDown className={`h-4 w-4 text-faint transition ${open === e.id ? 'rotate-180' : ''}`} />
                  </button>
                  {open === e.id && (
                    <div className="bg-[#fbfcfd] px-7 pt-1 pb-5">
                      <div className="rounded-2xl border border-divider bg-white px-5 py-4">
                        <Changes e={e} />
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={PAGE} total={total} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
