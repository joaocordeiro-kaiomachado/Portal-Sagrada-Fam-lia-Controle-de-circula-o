import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Field, Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/Misc';
import { sendPasswordReset } from '../../services/users';
import { friendlyError } from '../../lib/errors';
import { EMAIL_RE } from '../../lib/validation';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await sendPasswordReset(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Recuperar senha"
      description="Informe o e-mail cadastrado. Enviaremos um link para você criar uma nova senha."
    >
      {sent ? (
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ok-bg text-ok">
            <MailCheck className="h-7 w-7" />
          </span>
          <p className="mt-4 text-lg font-bold text-ink">Verifique seu e-mail</p>
          <p className="mt-2 text-sm leading-6 text-soft">
            Se <strong className="text-label">{email.trim()}</strong> estiver cadastrado, você receberá um link em alguns
            minutos. Confira também a caixa de spam.
          </p>
          <Link to="/entrar" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-brand-focus hover:underline">
            <ArrowLeft className="h-4 w-4" /> Voltar para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          {formError && <ErrorBanner message={formError} />}
          <Field label="E-mail" error={error}>
            {(p) => (
              <Input
                id={p.id}
                invalid={p.invalid}
                describedBy={p.describedBy}
                type="email"
                autoComplete="email"
                placeholder="nome@escola.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            )}
          </Field>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Link
              to="/entrar"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold text-body transition hover:bg-surface"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            <Button type="submit" loading={loading} icon={<Send className="h-4 w-4" />} className="flex-1">
              Enviar link
            </Button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
