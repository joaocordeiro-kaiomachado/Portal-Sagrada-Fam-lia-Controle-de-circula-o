import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  optional?: boolean;
}

/** Rótulo + controle + mensagem de erro, no padrão visual do portal. */
export function Field({ label, error, hint, className = '', children, optional }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="ml-1 font-medium text-faint">(opcional)</span>}
      </label>
      <div className="mt-2">{children({ id, describedBy: error || hint ? msgId : undefined, invalid: !!error })}</div>
      {error ? (
        <p id={msgId} className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-err">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="mt-1.5 text-[12.5px] text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Ctl = { invalid?: boolean; describedBy?: string; small?: boolean };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Ctl>(function Input(
  { invalid, describedBy, small, className = '', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`field-control ${small ? 'field-control-sm' : ''} ${invalid ? 'is-invalid' : ''} ${className}`}
      {...rest}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Ctl>(function Select(
  { invalid, describedBy, small, className = '', children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`field-control ${small ? 'field-control-sm' : ''} ${invalid ? 'is-invalid' : ''} ${className}`}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 h-[18px] w-[18px] -translate-y-1/2 text-muted"
      />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Ctl>(
  function Textarea({ invalid, describedBy, className = '', ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`field-control ${invalid ? 'is-invalid' : ''} ${className}`}
        {...rest}
      />
    );
  },
);
