import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TriangleAlert, X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  /** Impede fechar clicando fora / Esc (ex.: durante gravação). */
  locked?: boolean;
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl', locked }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea, button');
      first?.focus();
    }, 20);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose, locked]);

  if (!open) return null;

  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0f2440]/40 backdrop-blur-[2px]"
        onClick={() => !locked && onClose()}
        aria-hidden
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card relative flex max-h-[calc(100vh-2rem)] w-full ${width} flex-col overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-divider px-7 py-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-accent" />
            <div>
              <h2 className="text-xl font-bold tracking-[-0.02em] text-ink">{title}</h2>
              {subtitle && <div className="mt-0.5 text-sm text-soft">{subtitle}</div>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            className="rounded-lg p-1.5 text-faint transition hover:bg-surface hover:text-ink disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-7 py-6">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-divider bg-[#fbfcfd] px-7 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  tone?: 'danger' | 'primary';
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, loading, tone = 'danger' }: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width="max-w-md"
      locked={loading}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        {tone === 'danger' && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-err-bg text-err">
            <TriangleAlert className="h-5 w-5" />
          </span>
        )}
        <div className="text-[15px] leading-6 text-body">{message}</div>
      </div>
    </Modal>
  );
}
