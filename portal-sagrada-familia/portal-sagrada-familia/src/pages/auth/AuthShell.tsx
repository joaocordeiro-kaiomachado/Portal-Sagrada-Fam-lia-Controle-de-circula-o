import type { ReactNode } from 'react';
import { Brand } from '../../components/layout/Brand';

/** Moldura das telas públicas (login e senha), no padrão do site de referência. */
export function AuthShell({ title, description, children, footer }: { title: string; description: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[460px]">
        <header className="mb-8 flex items-center justify-between px-1">
          <Brand />
          <span className="rounded-full border border-line-soft bg-white/70 px-3 py-1.5 text-xs font-medium text-muted">Uso interno</span>
        </header>
        <section className="card overflow-hidden">
          <div className="border-b border-divider px-9 pt-9 pb-7">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 h-12 w-1 shrink-0 rounded-full bg-accent" />
              <div>
                <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-ink">{title}</h1>
                <p className="mt-2 text-[15px] leading-6 text-soft">{description}</p>
              </div>
            </div>
          </div>
          <div className="px-9 py-8">{children}</div>
        </section>
        <p className="mt-6 px-6 text-center text-xs leading-5 text-faint">
          {footer ?? 'As informações registradas são destinadas exclusivamente ao controle interno da escola.'}
        </p>
      </div>
    </main>
  );
}
