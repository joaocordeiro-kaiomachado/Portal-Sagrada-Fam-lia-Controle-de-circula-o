import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, LoaderCircle } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Field, Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/Misc';
import { supabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { passwordProblem } from '../../lib/validation';
import { useToast } from '../../contexts/ToastContext';

/** Página aberta pelo link de recuperação enviado por e-mail. */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // O link traz um token que o Supabase converte em sessão temporária.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) setReady('ok');
    });
    const hash = window.location.hash;
    if (/error_code|error=/.test(hash)) setReady('invalid');
    const t = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady((r) => (r === 'checking' ? (data.session ? 'ok' : 'invalid') : r));
    }, 1500);
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    const p = passwordProblem(password);
    if (p) next.password = p;
    if (password !== confirm) next.confirm = 'As senhas não conferem.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success('Senha alterada', 'Entre com a sua nova senha.');
      navigate('/entrar', { replace: true });
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Criar nova senha" description="Escolha uma senha com pelo menos 8 caracteres, usando letras e números.">
      {ready === 'checking' && (
        <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Validando o link…
        </p>
      )}
      {ready === 'invalid' && (
        <div className="flex flex-col gap-5">
          <ErrorBanner message="Este link é inválido ou expirou. Solicite um novo link de recuperação." />
          <Link to="/esqueci-senha" className="text-center text-sm font-bold text-brand-focus hover:underline">
            Solicitar novo link
          </Link>
        </div>
      )}
      {ready === 'ok' && (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          {formError && <ErrorBanner message={formError} />}
          <Field label="Nova senha" error={errors.password}>
            {(p) => (
              <Input id={p.id} invalid={p.invalid} describedBy={p.describedBy} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            )}
          </Field>
          <Field label="Confirmar nova senha" error={errors.confirm}>
            {(p) => (
              <Input id={p.id} invalid={p.invalid} describedBy={p.describedBy} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            )}
          </Field>
          <Button type="submit" loading={loading} icon={<KeyRound className="h-4 w-4" />}>
            Salvar nova senha
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
