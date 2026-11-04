import { useState, type FormEvent } from 'react';
import { Eraser, Save } from 'lucide-react';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { Button } from '../ui/Button';
import { REASONS, SCHOOL_YEAR_SUGGESTIONS } from '../../lib/constants';
import { addDaysISO, todayISO } from '../../lib/format';
import { validateAuthorization, type AuthorizationFormValues, type FormErrors } from '../../lib/validation';

interface Props {
  initial: AuthorizationFormValues;
  /** Valores usados pelo botão "Limpar formulário". */
  blank: () => AuthorizationFormValues;
  submitLabel: string;
  isEdit?: boolean;
  onSubmit: (values: AuthorizationFormValues) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

export function AuthorizationForm({ initial, blank, submitLabel, isEdit, onSubmit, onCancel, saving }: Props) {
  const [values, setValues] = useState<AuthorizationFormValues>(initial);
  const [errors, setErrors] = useState<FormErrors<AuthorizationFormValues>>({});
  const [touchedSubmit, setTouchedSubmit] = useState(false);

  const set = <K extends keyof AuthorizationFormValues>(key: K, value: AuthorizationFormValues[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (touchedSubmit) setErrors(validateAuthorization(next, { isEdit }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouchedSubmit(true);
    const errs = validateAuthorization(values, { isEdit });
    setErrors(errs);
    if (Object.keys(errs).length) {
      const firstKey = Object.keys(errs)[0];
      document.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
      return;
    }
    await onSubmit(values);
  }

  function clear() {
    setValues(blank());
    setErrors({});
    setTouchedSubmit(false);
  }

  const today = todayISO();

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-12 gap-x-7 gap-y-6">
        <Field label="Professor(a) responsável" error={errors.teacher_name} className="col-span-12 lg:col-span-6">
          {(p) => (
            <Input
              id={p.id}
              name="teacher_name"
              invalid={p.invalid}
              describedBy={p.describedBy}
              placeholder="Nome completo"
              autoComplete="off"
              maxLength={120}
              value={values.teacher_name}
              onChange={(e) => set('teacher_name', e.target.value)}
            />
          )}
        </Field>

        <Field label="Aluno(a)" error={errors.student_name} className="col-span-12 lg:col-span-6">
          {(p) => (
            <Input
              id={p.id}
              name="student_name"
              invalid={p.invalid}
              describedBy={p.describedBy}
              placeholder="Nome completo do aluno"
              autoComplete="off"
              maxLength={120}
              value={values.student_name}
              onChange={(e) => set('student_name', e.target.value)}
              data-autofocus
            />
          )}
        </Field>

        <Field label="Ano escolar" error={errors.school_year} className="col-span-6 lg:col-span-3">
          {(p) => (
            <>
              <Input
                id={p.id}
                name="school_year"
                invalid={p.invalid}
                describedBy={p.describedBy}
                placeholder="Ex.: 8º ano"
                list="school-year-options"
                autoComplete="off"
                maxLength={40}
                value={values.school_year}
                onChange={(e) => set('school_year', e.target.value)}
              />
              <datalist id="school-year-options">
                {SCHOOL_YEAR_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <Field label="Turma" error={errors.class_group} className="col-span-6 lg:col-span-3">
          {(p) => (
            <Input
              id={p.id}
              name="class_group"
              invalid={p.invalid}
              describedBy={p.describedBy}
              placeholder="Ex.: B"
              autoComplete="off"
              maxLength={20}
              value={values.class_group}
              onChange={(e) => set('class_group', e.target.value.toUpperCase())}
            />
          )}
        </Field>

        <Field label="Data" error={errors.authorization_date} className="col-span-6 lg:col-span-3">
          {(p) => (
            <Input
              id={p.id}
              name="authorization_date"
              type="date"
              invalid={p.invalid}
              describedBy={p.describedBy}
              max={today}
              min={isEdit ? undefined : addDaysISO(today, -30)}
              value={values.authorization_date}
              onChange={(e) => set('authorization_date', e.target.value)}
            />
          )}
        </Field>

        <Field label="Horário da saída" error={errors.exit_time} className="col-span-6 lg:col-span-3">
          {(p) => (
            <Input
              id={p.id}
              name="exit_time"
              type="time"
              invalid={p.invalid}
              describedBy={p.describedBy}
              value={values.exit_time}
              onChange={(e) => set('exit_time', e.target.value)}
            />
          )}
        </Field>

        <Field label="Motivo da saída" error={errors.reason} className="col-span-12 lg:col-span-6">
          {(p) => (
            <Select
              id={p.id}
              name="reason"
              invalid={p.invalid}
              describedBy={p.describedBy}
              value={values.reason}
              onChange={(e) => set('reason', e.target.value)}
            >
              <option value="" disabled>
                Selecione uma opção
              </option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Observações adicionais"
          optional={values.reason !== 'outro'}
          error={errors.notes}
          hint={
            values.reason === 'outro'
              ? 'Obrigatório para o motivo "Outro": descreva o motivo da saída.'
              : `${values.notes.length}/500 caracteres`
          }
          className="col-span-12 lg:col-span-6"
        >
          {(p) => (
            <Textarea
              id={p.id}
              name="notes"
              invalid={p.invalid}
              describedBy={p.describedBy}
              placeholder={values.reason === 'outro' ? 'Descreva o motivo da saída' : 'Informações complementares, se houver'}
              maxLength={500}
              rows={3}
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          )}
        </Field>
      </div>

      <div className="mt-9 flex flex-col-reverse gap-3 border-t border-divider pt-7 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={clear} disabled={saving} icon={<Eraser className="h-4 w-4" />}>
          Limpar formulário
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button variant="secondary" onClick={onCancel} disabled={saving} className="min-w-[140px]">
            Cancelar
          </Button>
          <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />} className="min-w-[230px]">
            {saving ? 'Salvando…' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
