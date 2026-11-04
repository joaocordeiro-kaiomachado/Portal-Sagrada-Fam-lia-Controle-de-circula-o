import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Chama `onChange` sempre que qualquer computador cria, edita ou exclui
 * uma autorização (Supabase Realtime). Mantém as telas sincronizadas.
 */
export function useRealtimeAuthorizations(onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let timer: number | undefined;
    const channel = supabase
      .channel(`authorizations-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'authorizations' }, () => {
        // Agrupa vários eventos seguidos em uma única atualização.
        window.clearTimeout(timer);
        timer = window.setTimeout(() => cb.current(), 400);
      })
      .subscribe();

    // Ao voltar para a aba, atualiza (caso a conexão tenha caído).
    const onFocus = () => document.visibilityState === 'visible' && cb.current();
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onFocus);
      void supabase.removeChannel(channel);
    };
  }, []);
}
