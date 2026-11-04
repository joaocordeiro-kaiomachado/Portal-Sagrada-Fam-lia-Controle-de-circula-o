import type { AuthorizationInput } from '../types/database';
import { addDaysISO, todayISO } from './format';

export type FormErrors<T> = Partial<Record<keyof T, string>>;

const squish = (v: string) => v.replace(/\s+/g, ' ').trim();

function validName(v: string, label: string): string | undefined {
  const s = squish(v);
  if (!s) return `Informe o ${label}.`;
  if (s.length < 3) return `O ${label} deve ter pelo menos 3 letras.`;
  if (s.length > 120) return `O ${label} deve ter no máximo 120 caracteres.`;
  if (!s.includes(' ')) return 'Informe o nome completo (nome e sobrenome).';
  if (/\d/.test(s)) return 'O nome não deve conter números.';
  return undefined;
}

export type AuthorizationFormValues = {
  teacher_name: string;
  student_name: string;
  school_year: string;
  class_group: string;
  authorization_date: string;
  exit_time: string;
  reason: string;
  notes: string;
};

export function validateAuthorization(
  v: AuthorizationFormValues,
  opts: { isEdit?: boolean } = {},
): FormErrors<AuthorizationFormValues> {
  const errors: FormErrors<AuthorizationFormValues> = {};
  const today = todayISO();

  const t = validName(v.teacher_name, 'nome do professor');
  if (t) errors.teacher_name = t;
  const s = validName(v.student_name, 'nome do aluno');
  if (s) errors.student_name = s;

  if (!squish(v.school_year)) errors.school_year = 'Informe o ano escolar.';
  else if (squish(v.school_year).length > 40) errors.school_year = 'Use no máximo 40 caracteres.';

  if (!squish(v.class_group)) errors.class_group = 'Informe a turma.';
  else if (squish(v.class_group).length > 20) errors.class_group = 'Use no máximo 20 caracteres.';

  if (!v.authorization_date) errors.authorization_date = 'Informe a data.';
  else if (v.authorization_date > today) errors.authorization_date = 'A data não pode estar no futuro.';
  else if (!opts.isEdit && v.authorization_date < addDaysISO(today, -30))
    errors.authorization_date = 'Use uma data dos últimos 30 dias.';

  if (!v.exit_time) errors.exit_time = 'Informe o horário.';
  else if (!/^\d{2}:\d{2}/.test(v.exit_time)) errors.exit_time = 'Horário inválido.';

  if (!v.reason) errors.reason = 'Selecione o motivo da saída.';

  const notes = squish(v.notes);
  if (v.reason === 'outro' && notes.length < 3) errors.notes = 'Descreva o motivo da saída.';
  if (notes.length > 500) errors.notes = 'Use no máximo 500 caracteres.';

  return errors;
}

export function toAuthorizationInput(v: AuthorizationFormValues): AuthorizationInput {
  return {
    teacher_name: squish(v.teacher_name),
    student_name: squish(v.student_name),
    school_year: squish(v.school_year),
    class_group: squish(v.class_group).toUpperCase(),
    authorization_date: v.authorization_date,
    exit_time: v.exit_time.slice(0, 5),
    reason: v.reason as AuthorizationInput['reason'],
    notes: squish(v.notes) || null,
  };
}

export function passwordProblem(password: string): string | undefined {
  if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (password.length > 72) return 'A senha deve ter no máximo 72 caracteres.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.';
  return undefined;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
