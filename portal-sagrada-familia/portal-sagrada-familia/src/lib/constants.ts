import type { ExitReason } from '../types/database';

export const REASONS: { value: ExitReason; label: string }[] = [
  { value: 'banheiro', label: 'Banheiro' },
  { value: 'biblioteca', label: 'Biblioteca' },
  { value: 'setor_pedagogico', label: 'Setor pedagógico' },
  { value: 'outro', label: 'Outro' },
];

export const REASON_LABEL: Record<string, string> = Object.fromEntries(
  REASONS.map((r) => [r.value, r.label]),
);

/** Sugestões para o campo "Ano escolar" (o campo aceita outros valores). */
export const SCHOOL_YEAR_SUGGESTIONS = [
  '1º ano',
  '2º ano',
  '3º ano',
  '4º ano',
  '5º ano',
  '6º ano',
  '7º ano',
  '8º ano',
  '9º ano',
  '1ª série',
  '2ª série',
  '3ª série',
];

export const PAGE_SIZE = 20;

/** Encerra a sessão após este tempo sem uso (computadores compartilhados). */
export const IDLE_TIMEOUT_MINUTES = 30;
