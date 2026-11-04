import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, FileDown, FileSpreadsheet, Inbox } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorBanner, PageHeader, Spinner } from '../components/ui/Misc';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { listAllAuthorizations, reportSummary } from '../services/authorizations';
import { useRealtimeAuthorizations } from '../hooks/useRealtimeAuthorizations';
import { useToast } from '../contexts/ToastContext';
import { REASON_LABEL } from '../lib/constants';
import { friendlyError } from '../lib/errors';
import { addDaysISO, firstDayOfMonthISO, formatDate, formatDateShort, todayISO } from '../lib/format';
import { exportCsv, exportPdf } from '../lib/export';
import type { ReportItem, ReportSummary } from '../types/database';

type Preset = 'today' | '7d' | 'month' | 'lastMonth' | 'custom';

function presetRange(p: Preset): [string, string] | null {
  const t = todayISO();
  switch (p) {
    case 'today':
      return [t, t];
    case '7d':
      return [addDaysISO(t, -6), t];
    case 'month':
      return [firstDayOfMonthISO(t), t];
    case 'lastMonth': {
      const firstThis = firstDayOfMonthISO(t);
      const lastPrev = addDaysISO(firstThis, -1);
      return [firstDayOfMonthISO(lastPrev), lastPrev];
    }
    default:
      return null;
  }
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: 'month', label: 'Este mês' },
  { id: 'lastMonth', label: 'Mês anterior' },
  { id: 'custom', label: 'Personalizado' },
];

/** Lista de barras horizontais (uma série, cor institucional). */
function RankedBars({ items, labelFor }: { items: ReportItem[]; labelFor?: (l: string) => string }) {
  const max = Math.max(1, ...items.map((i) => i.total));
  const total = items.reduce((s, i) => s + i.total, 0);
  if (items.length === 0) return <p className="px-7 py-8 text-center text-sm text-soft">Sem registros no período.</p>;
  return (
    <ul className="flex max-h-[340px] flex-col gap-3.5 overflow-y-auto px-7 py-5">
      {items.map((i) => {
        const label = labelFor ? labelFor(i.label) : i.label;
        const pct = total ? Math.round((i.total / total) * 100) : 0;
        return (
          <li key={i.label} title={`${label}: ${i.total} (${pct}%)`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="truncate font-semibold text-label">{label}</span>
              <span className="shrink-0 tabular-nums">
                <strong className="text-ink">{i.total.toLocaleString('pt-BR')}</strong>
                <span className="ml-1.5 text-[12px] text-faint">{pct}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-canvas">
              <div className="h-2 rounded-full bg-brand transition-[width] duration-500" style={{ width: `${(i.total / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Colunas por dia, com dica ao passar o mouse. */
function DailyColumns({ items, start, end }: { items: ReportItem[]; start: string; end: string }) {
  const days = useMemo(() => {
    const map = new Map(items.map((i) => [i.label, i.total]));
    const out: { day: string; total: number }[] = [];
    for (let d = start; d <= end && out.length < 93; d = addDaysISO(d, 1)) out.push({ day: d, total: map.get(d) ?? 0 });
    return out;
  }, [items, start, end]);
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(1, ...days.map((d) => d.total));
  // Escala "redonda": o valor do meio fica exatamente na metade do eixo.
  const max = peak === 1 ? 2 : peak % 2 ? peak + 1 : peak;
  const ticks = [max, max / 2, 0];
  const labelEvery = days.length > 31 ? 7 : days.length > 14 ? 3 : 1;

  if (items.length === 0) return <p className="px-7 py-12 text-center text-sm text-soft">Sem registros no período.</p>;

  return (
    <div className="px-7 pt-6 pb-5">
      <div className="relative flex h-[220px] gap-3">
        <div className="flex w-7 flex-col justify-between pb-6 text-right text-[11px] text-faint tabular-nums">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden>
            {ticks.map((t) => (
              <div key={t} className="border-t border-dashed border-divider" />
            ))}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-[2px]">
            {days.map((d, i) => (
              <div
                key={d.day}
                className="group relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className={`w-full max-w-[34px] rounded-t-[4px] transition ${hover === i ? 'bg-brand-dark' : 'bg-brand'} ${d.total === 0 ? 'opacity-0' : ''}`}
                  style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total ? 3 : 0 }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 rounded-lg bg-[#0f2440] px-2.5 py-1.5 text-center text-[12px] whitespace-nowrap text-white shadow-lg">
                    <p className="font-semibold">{formatDateShort(d.day)}</p>
                    <p className="text-white/80">{d.total} {d.total === 1 ? 'saída' : 'saídas'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-6 items-end gap-[2px]">
            {days.map((d, i) => (
              <span key={d.day} className="flex-1 text-center text-[10.5px] whitespace-nowrap text-faint">
                {i % labelEvery === 0 ? d.day.slice(8, 10) + '/' + d.day.slice(5, 7) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const toast = useToast();
  const [preset, setPreset] = useState<Preset>('month');
  const initial = presetRange('month')!;
  const [start, setStart] = useState(initial[0]);
  const [end, setEnd] = useState(initial[1]);
  const [data, setData] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const invalidRange = !start || !end || start > end;

  const load = useCallback(async () => {
    if (invalidRange) return;
    setLoading(true);
    try {
      setData(await reportSummary(start, end));
      setError(null);
    } catch (err) {
      setError(friendlyError(err, 'Não foi possível gerar o relatório.'));
    } finally {
      setLoading(false);
    }
  }, [start, end, invalidRange]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeAuthorizations(load);

  function choosePreset(p: Preset) {
    setPreset(p);
    const r = presetRange(p);
    if (r) {
      setStart(r[0]);
      setEnd(r[1]);
    }
  }

  async function doExport(kind: 'csv' | 'pdf') {
    if (!data) return;
    setExporting(kind);
    try {
      const records = await listAllAuthorizations({ dateFrom: start, dateTo: end, sort: 'asc' });
      if (kind === 'csv') exportCsv(records, data, start, end);
      else await exportPdf(records, data, start, end);
      toast.success('Arquivo gerado', `O relatório em ${kind.toUpperCase()} foi baixado.`);
    } catch (err) {
      toast.error('Não foi possível exportar', friendlyError(err));
    } finally {
      setExporting(null);
    }
  }

  const dayCount = invalidRange ? 0 : Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
  const topClass = data?.by_class[0];
  const topReason = data?.by_reason[0];

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Relatórios"
        description="Totais de saídas por dia, turma, professor e motivo no período escolhido."
        actions={
          <>
            <Button variant="secondary" icon={<FileSpreadsheet className="h-4 w-4" />} loading={exporting === 'csv'} disabled={!data || !!exporting || data.total === 0} onClick={() => doExport('csv')}>
              Exportar CSV
            </Button>
            <Button icon={<FileDown className="h-4 w-4" />} loading={exporting === 'pdf'} disabled={!data || !!exporting || data.total === 0} onClick={() => doExport('pdf')}>
              Exportar PDF
            </Button>
          </>
        }
      />

      <Card className="mb-6 flex flex-wrap items-end justify-between gap-5 px-7 py-5">
        <div>
          <p className="mb-2 text-[12px] font-bold text-label">Período</p>
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-canvas p-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => choosePreset(p.id)}
                className={`h-9 rounded-[10px] px-3.5 text-[13px] font-semibold transition ${
                  preset === p.id ? 'bg-white text-ink shadow-sm' : 'text-body hover:text-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label htmlFor="r-start" className="mb-1.5 block text-[12px] font-bold text-label">
              De
            </label>
            <Input id="r-start" type="date" small value={start} max={end} onChange={(e) => { setPreset('custom'); setStart(e.target.value); }} />
          </div>
          <div>
            <label htmlFor="r-end" className="mb-1.5 block text-[12px] font-bold text-label">
              Até
            </label>
            <Input id="r-end" type="date" small value={end} min={start} onChange={(e) => { setPreset('custom'); setEnd(e.target.value); }} />
          </div>
        </div>
      </Card>

      {invalidRange && (
        <div className="mb-6">
          <ErrorBanner message="Escolha um período válido: a data inicial deve ser anterior ou igual à final." />
        </div>
      )}
      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      {!data && loading ? (
        <Card>
          <Spinner label="Gerando relatório…" />
        </Card>
      ) : data && data.total === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="Nenhuma autorização no período"
            description={`Não há registros entre ${formatDate(start)} e ${formatDate(end)}.`}
          />
        </Card>
      ) : data ? (
        <div className={loading ? 'opacity-70 transition' : 'transition'}>
          <div className="mb-6 grid grid-cols-2 gap-5 xl:grid-cols-4">
            {[
              { label: 'Total no período', value: data.total.toLocaleString('pt-BR'), note: `${formatDate(start)} a ${formatDate(end)}` },
              { label: 'Média por dia', value: (data.total / Math.max(1, dayCount)).toLocaleString('pt-BR', { maximumFractionDigits: 1 }), note: `${dayCount} ${dayCount === 1 ? 'dia' : 'dias'} corridos` },
              { label: 'Turma com mais saídas', value: topClass?.label ?? '—', note: topClass ? `${topClass.total} saídas` : '' },
              { label: 'Motivo mais frequente', value: topReason ? REASON_LABEL[topReason.label] ?? topReason.label : '—', note: topReason ? `${topReason.total} saídas` : '' },
            ].map((s) => (
              <div key={s.label} className="rounded-[20px] border border-white/80 bg-white px-6 py-5 shadow-[var(--shadow-soft)]">
                <p className="text-[13px] font-semibold text-soft">{s.label}</p>
                <p className="mt-2 truncate text-[26px] leading-tight font-bold tracking-[-0.02em] text-ink" title={s.value}>
                  {s.value}
                </p>
                <p className="mt-1 text-[12.5px] text-faint">{s.note}</p>
              </div>
            ))}
          </div>

          <Card className="mb-6 overflow-hidden">
            <CardHeader title="Autorizações por dia" subtitle={dayCount > 93 ? 'Mostrando os primeiros 93 dias do período' : 'Passe o mouse sobre as colunas para ver o total'} actions={<BarChart3 className="h-5 w-5 text-muted" />} />
            <DailyColumns items={data.by_day} start={start} end={end} />
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="overflow-hidden">
              <CardHeader title="Por turma" />
              <RankedBars items={data.by_class} />
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="Por professor(a)" />
              <RankedBars items={data.by_teacher} />
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="Por motivo" />
              <RankedBars items={data.by_reason} labelFor={(l) => REASON_LABEL[l] ?? l} />
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
