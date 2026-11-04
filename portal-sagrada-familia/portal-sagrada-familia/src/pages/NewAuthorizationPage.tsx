import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleCheck, FilePlus2, Printer } from 'lucide-react';
import { AuthorizationForm } from '../components/authorizations/AuthorizationForm';
import { Button } from '../components/ui/Button';
import { ErrorBanner, PageHeader, ReasonBadge } from '../components/ui/Misc';
import { createAuthorization } from '../services/authorizations';
import { usePrintAuthorization } from '../hooks/usePrintAuthorization';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { friendlyError } from '../lib/errors';
import { formatCode, formatDate, formatTime, nowTime, todayISO } from '../lib/format';
import { toAuthorizationInput, type AuthorizationFormValues } from '../lib/validation';
import type { Authorization } from '../types/database';

export function NewAuthorizationPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { print, node: printNode } = usePrintAuthorization();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Authorization | null>(null);
  const [formKey, setFormKey] = useState(0);

  const blank = (): AuthorizationFormValues => ({
    teacher_name: profile?.full_name ?? '',
    student_name: '',
    school_year: '',
    class_group: '',
    authorization_date: todayISO(),
    exit_time: nowTime(),
    reason: '',
    notes: '',
  });

  async function submit(values: AuthorizationFormValues) {
    setSaving(true);
    setError(null);
    try {
      const row = await createAuthorization(toAuthorizationInput(values));
      setCreated(row);
      toast.success('Autorização registrada', `${row.student_name} — ${formatCode(row.code)}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(friendlyError(err, 'Não foi possível registrar a autorização. Tente novamente.'));
    } finally {
      setSaving(false);
    }
  }

  function another() {
    setCreated(null);
    setFormKey((k) => k + 1);
  }

  return (
    <>
      <PageHeader
        eyebrow="Registro"
        title="Autorização para saída de sala de aula"
        description="Registre os dados do aluno e o motivo da saída. Os campos marcados como opcionais podem ficar em branco."
      />

      {created ? (
        <section className="card overflow-hidden" aria-live="polite">
          <div className="flex flex-col items-center px-10 pt-12 pb-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ok-bg text-ok ring-8 ring-ok-bg/50">
              <CircleCheck className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-[24px] font-bold tracking-[-0.02em] text-ink">Autorização registrada com sucesso</h2>
            <p className="mt-2 text-[15px] text-soft">
              O registro já está disponível para os demais computadores do portal.
            </p>

            <dl className="mt-8 grid w-full max-w-2xl grid-cols-2 gap-x-8 gap-y-4 rounded-2xl border border-divider bg-[#fbfcfd] px-7 py-6 text-left sm:grid-cols-4">
              <div className="col-span-2">
                <dt className="text-[11.5px] font-bold tracking-[0.06em] text-muted uppercase">Aluno(a)</dt>
                <dd className="mt-1 font-bold text-ink">{created.student_name}</dd>
              </div>
              <div>
                <dt className="text-[11.5px] font-bold tracking-[0.06em] text-muted uppercase">Turma</dt>
                <dd className="mt-1 font-semibold">
                  {created.school_year} {created.class_group}
                </dd>
              </div>
              <div>
                <dt className="text-[11.5px] font-bold tracking-[0.06em] text-muted uppercase">Registro</dt>
                <dd className="mt-1 font-semibold">{formatCode(created.code)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[11.5px] font-bold tracking-[0.06em] text-muted uppercase">Data e horário</dt>
                <dd className="mt-1 font-semibold">
                  {formatDate(created.authorization_date)} às {formatTime(created.exit_time)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[11.5px] font-bold tracking-[0.06em] text-muted uppercase">Motivo</dt>
                <dd className="mt-1">
                  <ReasonBadge reason={created.reason} />
                </dd>
              </div>
            </dl>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={() => navigate('/historico')} className="min-w-[160px]">
                Ver histórico
              </Button>
              <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => print(created)} className="min-w-[160px]">
                Imprimir
              </Button>
              <Button icon={<FilePlus2 className="h-4 w-4" />} onClick={another} className="min-w-[220px]">
                Registrar outra saída
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="card overflow-hidden">
          <div className="px-9 py-9 xl:px-11">
            {error && (
              <div className="mb-7">
                <ErrorBanner message={error} />
              </div>
            )}
            <AuthorizationForm
              key={formKey}
              initial={blank()}
              blank={blank}
              submitLabel="Registrar autorização"
              saving={saving}
              onSubmit={submit}
              onCancel={() => navigate('/')}
            />
          </div>
          <p className="border-t border-divider bg-[#fbfcfd] px-9 py-4 text-center text-xs text-faint xl:px-11">
            As informações registradas são destinadas exclusivamente ao controle interno da escola.
          </p>
        </section>
      )}
      {printNode}
    </>
  );
}
