import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-[var(--shadow-button)] hover:bg-brand-dark disabled:hover:bg-brand',
  secondary: 'border border-line bg-white text-body hover:border-hover-line hover:bg-surface',
  ghost: 'text-body hover:bg-surface hover:text-ink',
  danger: 'bg-err text-white shadow-[0_7px_18px_rgba(180,35,24,0.18)] hover:bg-err-dark',
};

const sizes: Record<Size, string> = {
  md: 'h-12 px-6 text-sm rounded-xl gap-2',
  sm: 'h-10 px-4 text-[13px] rounded-[10px] gap-1.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center font-bold whitespace-nowrap transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${loading ? 'cursor-wait' : ''} ${className}`}
      {...rest}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className = '',
  tone = 'default',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'danger' }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] transition focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-40 ${
        tone === 'danger' ? 'text-faint hover:bg-err-bg hover:text-err' : 'text-muted hover:bg-surface hover:text-ink'
      } ${className}`}
      {...rest}
    />
  );
}
