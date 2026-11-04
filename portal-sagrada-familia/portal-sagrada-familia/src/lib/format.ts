/** Datas no fuso da escola. */
const TZ = 'America/Sao_Paulo';

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

/** Hora atual (HH:MM) no fuso de São Paulo. */
export function nowTime(): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(
    new Date(),
  );
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function firstDayOfMonthISO(iso = todayISO()): string {
  return `${iso.slice(0, 7)}-01`;
}

/** 2026-11-04 → 04/11/2026 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** 2026-11-04 → qua., 04/11 */
export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(dt);
  return `${wd} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

/** 10:15:00 → 10:15 */
export function formatTime(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : '—';
}

export function formatDateTime(ts: string | null | undefined): string {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export function formatCode(code: number): string {
  return `Nº ${String(code).padStart(5, '0')}`;
}

export function classLabel(schoolYear: string, classGroup: string): string {
  return `${schoolYear} ${classGroup}`.trim();
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`;
}
