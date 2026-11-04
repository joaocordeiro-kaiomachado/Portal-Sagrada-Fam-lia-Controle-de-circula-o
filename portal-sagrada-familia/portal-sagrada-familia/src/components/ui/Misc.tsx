import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { REASON_LABEL } from '../../lib/constants';

export function Spinner({ label = 'Carregando…', className = '' }: { label?: string; className?: string }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2.5 py-10 text-sm text-muted ${className}`}>
      <LoaderCircle className="h-5 w-5 animate-spin text-brand" aria-hidden />
      {label}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="mt-1 h-12 w-1 shrink-0 rounded-full bg-accent" />
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-1 text-[28px] leading-tight font-bold tracking-[-0.025em] text-ink">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-soft">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function CardHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-7 py-5">
      <div>
        <h2 className="text-[17px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-soft">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

const reasonTone: Record<string, string> = {
  banheiro: 'bg-[#eaf1f8] text-[#1f4e85] border-[#d3e1f0]',
  biblioteca: 'bg-[#fdf3e4] text-[#8a5a14] border-[#f3dcb6]',
  setor_pedagogico: 'bg-ok-bg text-ok border-[#c9ead9]',
  outro: 'bg-[#f2f0f7] text-[#544a75] border-[#e0dcec]',
};

export function ReasonBadge({ reason }: { reason: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
        reasonTone[reason] ?? reasonTone.outro
      }`}
    >
      {REASON_LABEL[reason] ?? reason}
    </span>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'ok' | 'err' | 'brand' }) {
  const tones = {
    neutral: 'border-line-soft bg-white/70 text-muted',
    ok: 'border-[#c9ead9] bg-ok-bg text-ok',
    err: 'border-err-line bg-err-bg text-err',
    brand: 'border-[#d3e1f0] bg-[#eaf1f8] text-brand',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-muted">{icon}</span>
      <p className="mt-4 text-base font-bold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-6 text-soft">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-err-line bg-err-bg px-5 py-4 text-sm text-err-dark">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-bold underline-offset-4 hover:underline">
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between gap-4 border-t border-divider px-7 py-4 text-[13px] text-soft">
      <span>
        {from.toLocaleString('pt-BR')}–{to.toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          className="inline-flex h-9 items-center gap-1 rounded-[10px] border border-line bg-white px-3 font-semibold text-body transition hover:bg-surface disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <span className="px-2 font-semibold text-label">
          {page + 1} / {pages}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page + 1 >= pages}
          className="inline-flex h-9 items-center gap-1 rounded-[10px] border border-line bg-white px-3 font-semibold text-body transition hover:bg-surface disabled:opacity-40"
        >
          Próxima <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
