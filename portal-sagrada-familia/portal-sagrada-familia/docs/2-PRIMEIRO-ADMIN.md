# 2. Como criar o primeiro administrador

Como o cadastro público fica desligado (por segurança), a **primeira** conta é criada pelo painel do Supabase. Todas as outras serão criadas dentro do portal, na tela **Usuários**.

## Passo 1 — Criar o usuário

1. Supabase → **Authentication → Users** → **Add user** → **Create new user**.
2. Preencha:
   - **Email:** o e-mail da coordenação (ex.: `coordenacao@suaescola.com.br`)
   - **Password:** uma senha forte, com pelo menos 8 caracteres, letras e números
   - Marque **Auto Confirm User** ✅
3. Clique em **Create user**.

Neste momento o sistema cria automaticamente o perfil dessa pessoa como **Professor(a)** — nenhuma conta nasce administradora.

## Passo 2 — Promover a administrador

1. Supabase → **SQL Editor** → **New query**.
2. Cole o conteúdo de `supabase/primeiro-admin.sql`, **troque o e-mail e o nome** pelos dados reais:

```sql
update public.profiles
set role = 'admin',
    full_name = 'Maria da Silva Souza'
where email = lower('coordenacao@suaescola.com.br');

select full_name, email, role, active from public.profiles order by created_at;
```

3. Clique em **Run**. A consulta final deve mostrar a pessoa com `role = admin`.

## Passo 3 — Entrar no portal

1. Abra o endereço do site no Netlify.
2. Entre com o e-mail e a senha do passo 1.
3. No menu lateral devem aparecer **Relatórios**, **Usuários** e **Auditoria** — sinal de que o acesso de administrador está ativo.

## Passo 4 — Cadastrar a equipe

Em **Usuários → Novo usuário**:

1. Informe nome completo, e-mail e o perfil (**Professor(a)** ou **Administrador**).
2. O sistema sugere uma **senha provisória**; anote-a e entregue pessoalmente.
3. Oriente cada pessoa a trocar a senha no primeiro acesso, pelo link **Esqueci minha senha** da tela de login.

Recomendação: mantenha **pelo menos dois administradores** (ex.: direção e coordenação). O sistema impede que o último administrador ativo seja rebaixado ou desativado.

## Permissão de consulta dos professores

Ainda em **Usuários**, o quadro **Permissão dos professores** define o que um professor vê no histórico:

- **Somente os próprios registros** (padrão, mais restritivo — recomendado pela LGPD);
- **Todos os registros** da escola.

Editar, excluir, relatórios, usuários e auditoria são sempre exclusivos de administradores.
