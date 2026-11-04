import { useCallback, useEffect, useState } from 'react';
import type { Authorization } from '../types/database';
import { PrintableAuthorization } from '../components/authorizations/PrintableAuthorization';

/** Abre a caixa de impressão do navegador com o documento da autorização. */
export function usePrintAuthorization() {
  const [item, setItem] = useState<Authorization | null>(null);

  useEffect(() => {
    if (!item) return;
    const done = () => setItem(null);
    window.addEventListener('afterprint', done);
    // Aguarda o documento ser desenhado antes de abrir a impressão.
    const t = window.setTimeout(() => window.print(), 60);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', done);
    };
  }, [item]);

  const print = useCallback((a: Authorization) => setItem(a), []);
  const node = item ? <PrintableAuthorization item={item} /> : null;
  return { print, node };
}
