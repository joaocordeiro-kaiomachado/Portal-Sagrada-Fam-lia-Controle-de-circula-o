import { useState } from 'react';
import { Pencil, Printer, Trash2 } from 'lucide-react';
import type { Authorization } from '../../types/database';
import { Modal, ConfirmDialog } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ReasonBadge } from '../ui/Misc';
import { AuthorizationForm } from './AuthorizationForm';
import { formatCode, formatDate, formatDateTime, formatTime } from '../../lib/format';
import { toAuthorizationInput, type AuthorizationFormValues } from '../../lib/validation';
import { deleteAuthorization, updateAuthorization } from '../../services/authorizations';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

export function toFormValues(a: Authorization): AuthorizationFormValues {
  return {
    teacher_name: a.teacher_name,
    student_name: a.student_name,
    school_year: a.school_year,
    class_group: a.class_group,
    authorization_date: a.authorization_date,
    exit_time: a.exit_time.slice(0, 5),
    reason: a.reason,
    notes: a.notes ?? '',
  };
}

function Item({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-[12px] font-bold tracking-[0.04em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-[15px] font-medium break-words text-[#0f172a]">{children}</dd>
    </div>
  );
}

interface Props {
  item: Authorization | null;
  onClose: () => void;
  onPrint: (a: Authorization) => void;
  onChanged: () => void;
}

export function AuthorizationDetails({ item, onClose, onPrint, onChanged }: Props) {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!item) return null;

  const close = () => {
    setMode('view');
    onClose();
  };

  async function save(values: AuthorizationFormValues) {
    if (!item) return;
    setBusy(true);
    try {
      await updateAuthorization(item.id, toAuthorizationInput(values));
      toast.success('Autorização atualizada', `${formatCode(item.code)} foi salva com as alterações.`);
      onChanged();
      close();
    } catch (err) {
      toast.error('Não foi possível salvar', friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item) return;
    setBusy(true);
    try {
      await deleteAuthorization(item.id);
      toast.success('Autorização excluída', `${formatCode(item.code)} foi removida. A exclusão ficou registrada na auditoria.`);
      setConfirmDelete(false);
      onChanged();
      close();
    } catch (err) {
      toast.error('Não foi possível excluir', friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'edit') {
    return (
      <Modal open title="Editar autorização" subtitle={formatCode(item.code)} onClose={() => setMode('view')} width="max-w-4xl" locked={busy}>
        <AuthorizationForm
          initial={toFormValues(item)}
          blank={() => toFormValues(item)}
          submitLabel="Salvar alterações"
          isEdit
          saving={busy}
          onSubmit={save}
          onCancel={() => setMode('view')}
        />
      </Modal>
    );
  }

  return (
    <>
      <Modal
        open={!confirmDelete}
        onClose={close}
        title="Detalhes da autorização"
        subtitle={formatCode(item.code)}
        width="max-w-2xl"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="text-err hover:bg-err-bg hover:text-err" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              {isAdmin && (
                <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setMode('edit')}>
                  Editar
                </Button>
              )}
              <Button size="sm" icon={<Printer className="h-4 w-4" />} onClick={() => onPrint(item)}>
                Imprimir
              </Button>
            </div>
          </div>
        }
      >
        <dl className="grid grid-cols-2 gap-x-8 gap-y-5">
          <Item label="Aluno(a)" wide>
            <span className="text-lg font-bold text-ink">{item.student_name}</span>
          </Item>
          <Item label="Ano escolar">{item.school_year}</Item>
          <Item label="Turma">{item.class_group}</Item>
          <Item label="Data">{formatDate(item.authorization_date)}</Item>
          <Item label="Horário da saída">{formatTime(item.exit_time)}</Item>
          <Item label="Motivo">
            <ReasonBadge reason={item.reason} />
          </Item>
          <Item label="Professor(a) responsável">{item.teacher_name}</Item>
          <Item label="Observações" wide>
            <span className="whitespace-pre-wrap">{item.notes || '—'}</span>
          </Item>
        </dl>
        <div className="mt-6 rounded-2xl bg-canvas/70 px-4 py-3 text-[12.5px] leading-5 text-soft">
          Registrado em {formatDateTime(item.created_at)}
          {item.updated_by && <> · última alteração em {formatDateTime(item.updated_at)}</>}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir autorização?"
        message={
          <>
            A autorização <strong>{formatCode(item.code)}</strong> de <strong>{item.student_name}</strong> será removida
            definitivamente. A exclusão ficará registrada na auditoria.
          </>
        }
        confirmLabel="Excluir definitivamente"
        loading={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </>
  );
}
