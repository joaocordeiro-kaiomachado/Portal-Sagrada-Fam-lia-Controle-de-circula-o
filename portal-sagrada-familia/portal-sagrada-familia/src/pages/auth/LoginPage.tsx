import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Info, LogIn } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Field, Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/Misc';
import { useAuth } from '../../contexts/AuthContext';
import { friendlyError } from '../../lib/errors';
import { EMAIL_RE } from '../../lib/validation';

export function LoginPage() {
  const { session, profile, signIn, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session && profile) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Informe um e-mail válido.';
    if (!password) next.password = 'Informe a senha.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(friendlyError(err, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Acesso ao portal" description="Entre com o e-mail e a senha fornecidos pela coordenação da escola.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {notice && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#f3dcb6] bg-[#fdf6eb] px-4 py-3 text-[13.5px] leading-5 text-[#7a4f12]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{notice}</span>
            <button type="button" className="text-xs font-bold hover:underline" onClick={clearNotice}>
              OK
            </button>
          </div>
        )}
        {formError && <ErrorBanner message={formError} />}

        <Field label="E-mail" error={errors.email}>
          {(p) => (
            <Input
              id={p.id}
              invalid={p.invalid}
              describedBy={p.describedBy}
              type="email"
              autoComplete="username"
              placeholder="nome@escola.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          )}
        </Field>

        <Field label="Senha" error={errors.password}>
          {(p) => (
            <div className="relative">
              <Input
                id={p.id}
                invalid={p.invalid}
                describedBy={p.describedBy}
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface"
                aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          )}
        </Field>

        <div className="flex flex-col gap-4">
          <Button type="submit" loading={loading} icon={<LogIn className="h-4 w-4" />} className="w-full">
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
          <Link to="/esqueci-senha" className="text-center text-sm font-semibold text-brand-focus underline-offset-4 hover:underline">
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
