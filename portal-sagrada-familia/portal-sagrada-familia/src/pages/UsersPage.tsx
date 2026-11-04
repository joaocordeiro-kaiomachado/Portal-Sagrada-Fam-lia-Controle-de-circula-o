import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Mail, Pencil, Power, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorBanner, PageHeader, Pill, Spinner } from '../components/ui/Misc';
import { Button, IconButton } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { createUser, getSettings, listProfiles, sendPasswordReset, setUserActive, setUserPassword, updateProfile, updateSettings } from '../services/users';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { friendlyError } from '../lib/errors';
import { formatDate, initials } from '../lib/format';
import { EMAIL_RE, passwordProblem } from '../lib/validation';
import type { AppSettings, Profile, UserRole } from '../types/database';

/** Gera uma senha provisória legível (sem caracteres ambíguos). */
function generatePassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const rand = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  let p = '';
  for (let i = 0; i < 7; i++) p += rand(letters);
  for (let i = 0; i < 3; i++) p += rand(digits);
  return p;
}

function NewUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ full_name: '', email: '', role: 'professor' as UserRole, password: generatePassword() });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ full_name: '', email: '', role: 'professor', password: generatePassword() });
      setErrors({});
      setFormError(null);
    }
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const name = form.full_name.replace(/\s+/g, ' ').trim();
    if (name.length < 3 || !name.includes(' ')) errs.full_name = 'Informe o nome completo.';
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Informe um e-mail válido.';
    const p = passwordProblem(form.password);
    if (p) errs.password = p;
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await createUser({ ...form, full_name: name, email: form.email.trim().toLowerCase() });
      toast.success('Usuário criado', `Informe a ${name.split(' ')[0]} o e-mail e a senha provisória.`);
      onCreated();
      onClose();
    } catch (err) {
      setFormError(friendlyError(err, 'Não foi possível criar o usuário.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      title="Novo usuário"
      subtitle="A pessoa entrará com este e-mail e a senha provisória."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="new-user-form" loading={saving} icon={<UserPlus className="h-4 w-4" />}>
            Criar usuário
          </Button>
        </>
      }
    >
      <form id="new-user-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
        {formError && <ErrorBanner message={formError} />}
        <Field label="Nome completo" error={errors.full_name}>
          {(p) => <Input id={p.id} invalid={p.invalid} describedBy={p.describedBy} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={120} />}
        </Field>
        <Field label="E-mail" error={errors.email}>
          {(p) => <Input id={p.id} type="email" invalid={p.invalid} describedBy={p.describedBy} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
        </Field>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Perfil de acesso">
            {(p) => (
              <Select id={p.id} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                <option value="professor">Professor(a)</option>
                <option value="admin">Administrador</option>
              </Select>
            )}
          </Field>
          <Field label="Senha provisória" error={errors.password} hint="Letras e números, mín. 8 caracteres">
            {(p) => (
              <Input id={p.id} invalid={p.invalid} describedBy={p.describedBy} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="font-mono tracking-wide" autoComplete="off" />
            )}
          </Field>
        </div>
        <p className="rounded-2xl bg-canvas/70 px-4 py-3 text-[13px] leading-5 text-soft">
          Anote a senha antes de criar. Oriente a pessoa a trocá-la em “Esqueci minha senha” no primeiro acesso.
        </p>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: Profile | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { profile: me, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('professor');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.full_name);
      setRole(user.role);
      setError(undefined);
    }
  }, [user]);

  if (!user) return null;

  async function save() {
    if (!user) return;
    const n = name.replace(/\s+/g, ' ').trim();
    if (n.length < 3 || !n.includes(' ')) {
      setError('Informe o nome completo.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.id, { full_name: n, role });
      toast.success('Usuário atualizado');
      if (user.id === me?.id) await refreshProfile();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Não foi possível salvar', friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      locked={saving}
      title="Editar usuário"
      subtitle={user.email}
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Nome completo" error={error}>
          {(p) => <Input id={p.id} invalid={p.invalid} describedBy={p.describedBy} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />}
        </Field>
        <Field label="Perfil de acesso" hint={user.id === me?.id ? 'Atenção: ao deixar de ser administrador, você perde o acesso a esta tela.' : undefined}>
          {(p) => (
            <Select id={p.id} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="professor">Professor(a)</option>
              <option value="admin">Administrador</option>
            </Select>
          )}
        </Field>
      </div>
    </Modal>
  );
}

function PasswordModal({ user, onClose }: { user: Profile | null; onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<'set' | 'mail' | null>(null);

  useEffect(() => {
    if (user) {
      setPassword(generatePassword());
      setError(undefined);
    }
  }, [user]);

  if (!user) return null;

  async function setNow() {
    if (!user) return;
    const p = passwordProblem(password);
    if (p) return setError(p);
    setBusy('set');
    try {
      await setUserPassword(user.id, password);
      toast.success('Senha provisória definida', `Informe a nova senha a ${user.full_name.split(' ')[0]}.`);
      onClose();
    } catch (err) {
      toast.error('Não foi possível alterar a senha', friendlyError(err));
    } finally {
      setBusy(null);
    }
  }

  async function mail() {
    if (!user) return;
    setBusy('mail');
    try {
      await sendPasswordReset(user.email);
      toast.success('Link enviado', `Um link de recuperação foi enviado para ${user.email}.`);
      onClose();
    } catch (err) {
      toast.error('Não foi possível enviar o e-mail', friendlyError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open onClose={onClose} locked={!!busy} title="Redefinir senha" subtitle={user.full_name} width="max-w-lg">
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-divider p-5">
          <p className="text-[14px] font-bold text-ink">Enviar link por e-mail</p>
          <p className="mt-1 text-[13px] leading-5 text-soft">A pessoa recebe um link em {user.email} e escolhe a própria senha.</p>
          <Button variant="secondary" size="sm" className="mt-4" icon={<Mail className="h-4 w-4" />} loading={busy === 'mail'} disabled={!!busy} onClick={mail}>
            Enviar link de recuperação
          </Button>
        </div>
        <div className="rounded-2xl border border-divider p-5">
          <p className="text-[14px] font-bold text-ink">Definir senha provisória</p>
          <p className="mt-1 text-[13px] leading-5 text-soft">Use quando o e-mail não chegar. Entregue a senha pessoalmente.</p>
          <div className="mt-4 flex items-start gap-3">
            <div className="flex-1">
              <Input value={password} onChange={(e) => { setPassword(e.target.value); setError(undefined); }} invalid={!!error} small className="font-mono tracking-wide" autoComplete="off" aria-label="Senha provisória" />
              {error && <p className="mt-1.5 text-[13px] font-medium text-err">{error}</p>}
            </div>
            <Button size="sm" icon={<KeyRound className="h-4 w-4" />} loading={busy === 'set'} disabled={!!busy} onClick={setNow}>
              Definir
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function UsersPage() {
  const { profile: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [passwordFor, setPasswordFor] = useState<Profile | null>(null);
  const [toggling, setToggling] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, s] = await Promise.all([listProfiles(), getSettings()]);
      setUsers(u);
      setSettings(s);
      setError(null);
    } catch (err) {
      setError(friendlyError(err, 'Não foi possível carregar os usuários.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive() {
    if (!toggling) return;
    setBusy(true);
    try {
      await setUserActive(toggling.id, !toggling.active);
      toast.success(toggling.active ? 'Usuário desativado' : 'Usuário reativado', toggling.full_name);
      setToggling(null);
      void load();
    } catch (err) {
      toast.error('Não foi possível alterar a situação', friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleSetting(value: boolean) {
    setSavingSetting(true);
    try {
      setSettings(await updateSettings({ professors_see_all: value }));
      toast.success('Permissão atualizada', value ? 'Professores agora consultam todos os registros.' : 'Professores agora veem apenas os próprios registros.');
    } catch (err) {
      toast.error('Não foi possível salvar', friendlyError(err));
    } finally {
      setSavingSetting(false);
    }
  }

  const activeCount = users?.filter((u) => u.active).length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Usuários e permissões"
        description="Crie contas, defina o perfil de acesso e controle quem pode usar o portal."
        actions={
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Novo usuário
          </Button>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader title="Contas" subtitle={users ? `${activeCount} ativas de ${users.length}` : undefined} />
          {users === null ? (
            <Spinner />
          ) : users.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="Nenhum usuário" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-divider bg-[#fbfcfd] text-[11.5px] font-bold tracking-[0.06em] text-muted uppercase">
                    <th className="py-3 pr-3 pl-7 font-bold">Nome</th>
                    <th className="px-3 py-3 font-bold">Perfil</th>
                    <th className="px-3 py-3 font-bold">Situação</th>
                    <th className="px-3 py-3 font-bold">Desde</th>
                    <th className="py-3 pr-7 pl-3 text-right font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={`border-b border-divider/80 last:border-b-0 ${u.active ? '' : 'bg-[#fbfcfd]'}`}>
                      <td className="py-3.5 pr-3 pl-7">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${u.active ? 'bg-canvas text-brand' : 'bg-divider text-faint'}`}>
                            {initials(u.full_name)}
                          </span>
                          <div className="min-w-0">
                            <p className={`truncate font-semibold ${u.active ? 'text-[#0f172a]' : 'text-faint'}`}>
                              {u.full_name} {u.id === me?.id && <span className="text-[12px] font-medium text-muted">(você)</span>}
                            </p>
                            <p className="truncate text-[12.5px] text-faint">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        {u.role === 'admin' ? (
                          <Pill tone="brand">
                            <ShieldCheck className="h-3.5 w-3.5" /> Administrador
                          </Pill>
                        ) : (
                          <Pill>Professor(a)</Pill>
                        )}
                      </td>
                      <td className="px-3 py-3.5">{u.active ? <Pill tone="ok">Ativo</Pill> : <Pill tone="err">Desativado</Pill>}</td>
                      <td className="px-3 py-3.5 text-body">{formatDate(u.created_at)}</td>
                      <td className="py-3.5 pr-7 pl-3">
                        <div className="flex justify-end gap-1">
                          <IconButton label="Editar nome e perfil" onClick={() => setEditing(u)}>
                            <Pencil className="h-[17px] w-[17px]" />
                          </IconButton>
                          <IconButton label="Redefinir senha" onClick={() => setPasswordFor(u)} disabled={!u.active}>
                            <KeyRound className="h-[17px] w-[17px]" />
                          </IconButton>
                          <IconButton
                            label={u.active ? 'Desativar acesso' : 'Reativar acesso'}
                            tone={u.active ? 'danger' : 'default'}
                            onClick={() => setToggling(u)}
                            disabled={u.id === me?.id}
                          >
                            <Power className="h-[17px] w-[17px]" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="text-[17px] font-bold text-ink">Permissão dos professores</h2>
            <p className="mt-1 text-[13px] leading-5 text-soft">Define o que um professor pode consultar no histórico.</p>
            <div className="mt-5 flex flex-col gap-2.5" role="radiogroup" aria-label="Permissão de consulta dos professores">
              {[
                { value: false, title: 'Somente os próprios registros', text: 'Cada professor vê apenas as autorizações que registrou.' },
                { value: true, title: 'Todos os registros', text: 'Professores consultam as autorizações de toda a escola.' },
              ].map((o) => {
                const checked = settings?.professors_see_all === o.value;
                return (
                  <button
                    key={String(o.value)}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    disabled={!settings || savingSetting}
                    onClick={() => !checked && toggleSetting(o.value)}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition disabled:cursor-wait ${
                      checked ? 'border-brand-focus bg-[#f3f7fb] ring-3 ring-brand-focus/10' : 'border-divider hover:border-line'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${checked ? 'border-brand' : 'border-line'}`}>
                      {checked && <span className="h-2 w-2 rounded-full bg-brand" />}
                    </span>
                    <span>
                      <span className="block text-[14px] font-bold text-ink">{o.title}</span>
                      <span className="block text-[12.5px] leading-5 text-soft">{o.text}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-[12px] leading-5 text-faint">
              Edição, exclusão, relatórios e auditoria são sempre exclusivos de administradores.
            </p>
          </Card>
        </div>
      </div>

      <NewUserModal open={creating} onClose={() => setCreating(false)} onCreated={load} />
      <EditUserModal user={editing} onClose={() => setEditing(null)} onSaved={load} />
      <PasswordModal user={passwordFor} onClose={() => setPasswordFor(null)} />
      <ConfirmDialog
        open={!!toggling}
        title={toggling?.active ? 'Desativar acesso?' : 'Reativar acesso?'}
        message={
          toggling?.active ? (
            <>
              <strong>{toggling.full_name}</strong> não conseguirá mais entrar no portal. Os registros feitos por essa pessoa
              continuam guardados.
            </>
          ) : (
            <>
              <strong>{toggling?.full_name}</strong> voltará a ter acesso ao portal com o perfil atual.
            </>
          )
        }
        confirmLabel={toggling?.active ? 'Desativar' : 'Reativar'}
        tone={toggling?.active ? 'danger' : 'primary'}
        loading={busy}
        onCancel={() => setToggling(null)}
        onConfirm={toggleActive}
      />
    </>
  );
}
