// =====================================================================
// Edge Function: admin-users
// Operações de gestão de usuários que exigem a chave de serviço
// (service_role), que NUNCA pode ficar no navegador:
//   - create      → cria um usuário com senha provisória
//   - set_password→ define nova senha provisória para um usuário
//   - set_active  → ativa/desativa (bloqueia o login) um usuário
//
// Somente administradores ativos podem chamar esta função.
// As variáveis SUPABASE_URL, SUPABASE_ANON_KEY e
// SUPABASE_SERVICE_ROLE_KEY são fornecidas automaticamente pelo Supabase.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (password.length > 72) return 'A senha deve ter no máximo 72 caracteres.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'A senha deve conter letras e números.';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // Cliente com a identidade de quem chamou: as alterações em "profiles"
  // passam pela RLS e ficam na auditoria com o nome do administrador.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: userError } = await asCaller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Sessão inválida. Entre novamente.' }, 401);

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', userData.user.id)
    .single();
  if (!callerProfile || callerProfile.role !== 'admin' || !callerProfile.active) {
    return json({ error: 'Apenas administradores podem gerenciar usuários.' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  try {
    switch (body.action) {
      case 'create': {
        const email = String(body.email ?? '').trim().toLowerCase();
        const fullName = String(body.full_name ?? '').replace(/\s+/g, ' ').trim();
        const role = body.role === 'admin' ? 'admin' : 'professor';
        if (!EMAIL_RE.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400);
        if (fullName.length < 3 || fullName.length > 120) return json({ error: 'Informe o nome completo.' }, 400);
        const problem = passwordProblem(body.password);
        if (problem) return json({ error: problem }, 400);

        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: body.password as string,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (error) {
          const msg = /already/i.test(error.message)
            ? 'Já existe um usuário com este e-mail.'
            : `Não foi possível criar o usuário: ${error.message}`;
          return json({ error: msg }, 400);
        }

        if (role === 'admin') {
          const { error: roleError } = await asCaller
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', data.user.id);
          if (roleError) return json({ error: roleError.message }, 400);
        }
        return json({ ok: true, id: data.user.id });
      }

      case 'set_password': {
        const id = String(body.user_id ?? '');
        const problem = passwordProblem(body.password);
        if (problem) return json({ error: problem }, 400);
        const { error } = await admin.auth.admin.updateUserById(id, { password: body.password as string });
        if (error) return json({ error: `Não foi possível alterar a senha: ${error.message}` }, 400);
        return json({ ok: true });
      }

      case 'set_active': {
        const id = String(body.user_id ?? '');
        const active = body.active === true;
        if (id === userData.user.id && !active) {
          return json({ error: 'Você não pode desativar a sua própria conta.' }, 400);
        }
        // 1) Atualiza o perfil como o administrador (RLS + auditoria + regra
        //    de "pelo menos um administrador ativo").
        const { error: profileError } = await asCaller.from('profiles').update({ active }).eq('id', id);
        if (profileError) return json({ error: profileError.message }, 400);
        // 2) Bloqueia/desbloqueia o login no serviço de autenticação.
        const { error: banError } = await admin.auth.admin.updateUserById(id, {
          ban_duration: active ? 'none' : '876000h',
        });
        if (banError) return json({ error: `Perfil atualizado, mas o login não foi alterado: ${banError.message}` }, 400);
        return json({ ok: true });
      }

      default:
        return json({ error: 'Ação desconhecida.' }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro inesperado.' }, 500);
  }
});
