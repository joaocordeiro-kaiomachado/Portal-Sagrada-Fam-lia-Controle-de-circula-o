/** Erro com mensagem já pronta para o usuário (em português). */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

/** Converte erros técnicos do Supabase em mensagens claras em português. */
export function friendlyError(error: unknown, fallback = 'Não foi possível concluir a operação. Tente novamente.'): string {
  if (!error) return fallback;
  const e = error as { message?: string; code?: string; status?: number; name?: string };
  const msg = e.message ?? String(error);

  if (error instanceof AppError) return msg;
  // Mensagens de validação escritas pelo próprio banco (gatilhos RAISE EXCEPTION).
  if ((e.code === 'P0001' || e.code === '22023') && msg) return msg;

  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(msg)) return 'O e-mail desta conta ainda não foi confirmado.';
  if (/banned/i.test(msg)) return 'Esta conta está desativada. Procure a coordenação.';
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
  if (/New password should be different/i.test(msg)) return 'A nova senha precisa ser diferente da anterior.';
  if (/Password should be/i.test(msg)) return 'A senha não atende aos requisitos mínimos.';
  if (/Failed to fetch|NetworkError|network/i.test(msg))
    return 'Sem conexão com o servidor. Verifique a internet e tente novamente.';
  if (/JWT expired|session.*(expired|missing)|not authenticated/i.test(msg))
    return 'Sua sessão expirou. Entre novamente.';
  if (e.code === '42501' || /row-level security|permission denied/i.test(msg))
    return 'Você não tem permissão para esta operação.';
  if (e.code === '23514' || /check constraint/i.test(msg)) {
    if (/other_requires_notes/.test(msg)) return 'Para o motivo "Outro", descreva o motivo nas observações.';
    return 'Algum campo está com valor inválido. Revise o formulário.';
  }
  return fallback;
}
