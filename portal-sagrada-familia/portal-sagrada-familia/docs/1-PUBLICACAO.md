# 1. Manual de publicação — colocar o portal no ar de graça

Tempo estimado: **40 a 60 minutos**, sem precisar programar.
Você vai usar duas contas gratuitas:

- **Supabase** (supabase.com) — guarda o banco de dados e faz o login dos usuários.
- **Netlify** (netlify.com) — hospeda o site.
- **GitHub** (github.com) — opcional, mas recomendado: guarda o código e permite que o Netlify publique sozinho a cada alteração.

> Os nomes dos menus podem mudar um pouco com o tempo. Se algum botão estiver com outro nome, procure o equivalente na mesma área.

---

## Parte A — Supabase (banco de dados e login)

### Passo 1 — Criar o projeto

1. Acesse **supabase.com** → **Start your project** e entre (pode usar a conta do GitHub ou um e-mail).
2. Clique em **New project**.
3. Preencha:
   - **Name:** `portal-sagrada-familia`
   - **Database Password:** clique em *Generate a password* e **guarde essa senha em local seguro** (não será usada no site, mas é a senha-mestra do banco).
   - **Region:** `South America (São Paulo)` — dados mais perto da escola e respostas mais rápidas.
4. Clique em **Create new project** e aguarde 1 a 2 minutos.

### Passo 2 — Criar as tabelas e as regras de segurança

1. No menu lateral, abra **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/migrations/001_schema.sql` (no Bloco de Notas ou VS Code), copie **todo** o conteúdo e cole no editor.
3. Clique em **Run**. A mensagem deve ser *Success. No rows returned*.

Isso cria as tabelas, as permissões (RLS), a auditoria, a validação no servidor e ativa a sincronização em tempo real.

> Rode este arquivo **uma única vez**. Se precisar recomeçar do zero, o mais simples é criar um novo projeto.

### Passo 3 — Configurar o login

1. Menu **Authentication** → **Sign In / Providers** (ou *Providers*):
   - **Allow new users to sign up:** **desligado**. Assim, só o administrador cria contas — ninguém se cadastra sozinho.
   - **Email:** deixe **ligado** (é o login por e-mail e senha).
2. Ainda em **Authentication**, procure **Password** / *Password security* e defina **Minimum password length: 8** (se a opção existir no seu painel; o sistema também exige 8 caracteres com letras e números).
3. **Authentication → URL Configuration** — preencha **depois** de ter o endereço do Netlify (Parte B, passo 8). Voltaremos aqui.

### Passo 4 — Publicar a função de gestão de usuários

Criar contas e bloquear acessos exige uma chave secreta que **não pode** ficar no site. Por isso essa parte roda dentro do Supabase, numa *Edge Function*.

1. Menu **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Dê à função o nome exato: **`admin-users`** (com hífen, tudo minúsculo).
3. Apague o código de exemplo, abra `supabase/functions/admin-users/index.ts`, copie **todo** o conteúdo e cole no editor.
4. Clique em **Deploy function** e aguarde.
5. Nos detalhes da função, deixe **Verify JWT / Enforce JWT verification** **ligado** (padrão).

> **Se der erro 401 "Invalid JWT" ao criar usuário:** em projetos novos que usam as chaves `sb_publishable_…`, desligue a opção *Verify JWT (legacy)* desta função. É seguro: a própria função confere a sessão e exige que quem chama seja administrador ativo.
>
> Alternativa por linha de comando (para quem usa o terminal): `npx supabase login`, `npx supabase link --project-ref SEU_ID` e `npx supabase functions deploy admin-users`.

As chaves que a função usa (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) são fornecidas automaticamente pelo Supabase. **Você não precisa copiar nenhuma chave secreta.**

### Passo 5 — Copiar os dois dados públicos de conexão

Menu **Project Settings** (engrenagem) → **API** / **Data API** / **API Keys**:

| O que copiar | Nome no painel | Exemplo |
|---|---|---|
| URL do projeto | *Project URL* | `https://abcdefghijk.supabase.co` |
| Chave pública | *anon public* (legado) **ou** *Publishable key* | `eyJhbGciOi…` ou `sb_publishable_…` |

⚠️ **Nunca** use a chave *service_role* / *secret* no site. Ela dá acesso total ao banco.

---

## Parte B — Netlify (o site)

Escolha **um** dos caminhos. O caminho 1 é o recomendado.

### Caminho 1 (recomendado) — Netlify ligado ao GitHub

**Passo 6 — Enviar o código para o GitHub**

1. Crie uma conta em **github.com** e clique em **New repository**.
2. Nome: `portal-sagrada-familia`; marque **Private** (privado). Crie.
3. Na página do repositório vazio, clique em **uploading an existing file** e arraste **todo o conteúdo** da pasta do projeto (menos as pastas `node_modules` e `dist`, se existirem). Clique em **Commit changes**.

**Passo 7 — Criar o site no Netlify**

1. Acesse **app.netlify.com** e entre com a conta do GitHub.
2. **Add new site** (ou *Add new project*) → **Import an existing project** → **GitHub** → autorize → escolha `portal-sagrada-familia`.
3. As configurações de build já vêm do arquivo `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Antes de publicar, abra **Add environment variables** (ou, depois, *Site configuration → Environment variables*) e crie:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | a *Project URL* do passo 5 |
   | `VITE_SUPABASE_ANON_KEY` | a chave pública do passo 5 |

5. Clique em **Deploy**. Em 1 a 2 minutos o site estará no ar num endereço como `https://nome-aleatorio.netlify.app`.
6. (Opcional) **Site configuration → Change site name** para algo como `portal-sagrada-familia.netlify.app`.

A partir daí, toda alteração enviada ao GitHub é publicada automaticamente.

### Caminho 2 — Sem GitHub (arrastar e soltar)

Requer Node.js instalado no computador (veja o [manual de instalação local](3-INSTALACAO-LOCAL.md)).

1. Na pasta do projeto, copie `.env.example` para `.env` e preencha as duas variáveis.
2. No terminal: `npm install` e depois `npm run build`.
3. Acesse **app.netlify.com/drop** e arraste a pasta **`dist`** que foi gerada.

Neste caminho, cada atualização exige gerar o `dist` de novo e arrastar outra vez.

### Passo 8 — Voltar ao Supabase e informar o endereço do site

Isso faz o link de **recuperação de senha** funcionar.

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL:** `https://SEU-SITE.netlify.app`
3. **Redirect URLs** → *Add URL*: `https://SEU-SITE.netlify.app/redefinir-senha`
4. Salve.

### Passo 9 — Criar o primeiro administrador

Siga o [manual do primeiro administrador](2-PRIMEIRO-ADMIN.md). Depois disso, todos os demais usuários são criados pela tela **Usuários** do portal.

---

## Depois de publicar

### E-mails de recuperação de senha
O Supabase envia e-mails por um serviço próprio com **limite baixo de envios por hora**, pensado para testes. Para uso diário na escola:

- Supabase → **Authentication → Emails → SMTP Settings** → configure um provedor de e-mail (Gmail com senha de app, Brevo, Resend etc.).
- Enquanto isso, o administrador pode usar **Usuários → Redefinir senha → Definir senha provisória**, que não depende de e-mail.
- Em **Authentication → Emails → Templates → Reset Password** você pode traduzir o texto do e-mail para o português.

### Pausa por inatividade (plano gratuito)
Projetos gratuitos do Supabase são **pausados quando ficam cerca de uma semana sem uso** (por exemplo, nas férias). Os dados **não se perdem**: basta abrir o painel do Supabase e clicar em **Restore project**. Com uso diário, isso não acontece.

### Domínio próprio (opcional)
Netlify → **Domain management → Add a domain**. Depois atualize o *Site URL* e o *Redirect URL* no Supabase (passo 8) com o novo endereço.

### Cópia de segurança
No plano gratuito, faça periodicamente um **Exportar CSV** em Relatórios (período amplo) e guarde em local seguro da escola. Para backups automáticos completos, é necessário um plano pago do Supabase.

---

## Problemas comuns

| Sintoma | Solução |
|---|---|
| Tela "Configuração pendente" | As variáveis `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` não foram cadastradas no Netlify. Cadastre e clique em **Deploys → Trigger deploy**. |
| "E-mail ou senha incorretos" no primeiro acesso | Confira se o usuário foi criado com **Auto Confirm User** marcado (manual do primeiro admin). |
| Entra e volta para o login com "conta desativada ou sem perfil" | O SQL do passo 2 não foi executado **antes** de criar o usuário. Rode o passo 2 e, no SQL Editor: `insert into public.profiles (id, full_name, email) select id, email, email from auth.users on conflict do nothing;` e depois o script do primeiro admin. |
| "A função admin-users não está publicada" | Refaça o passo 4 com o nome exatamente `admin-users`. |
| Erro 401 ao criar usuário | Veja a observação do passo 4 sobre *Verify JWT*. |
| Link de recuperação abre página de erro | Confira o passo 8 (Site URL e Redirect URLs). Links valem por 1 hora e só podem ser usados uma vez. |
| Página 404 ao atualizar (F5) uma tela interna | O arquivo `public/_redirects` ou o `netlify.toml` não foi enviado. Envie e publique de novo. |
| Outro computador não atualiza sozinho | A atualização automática usa o *Realtime* do Supabase (ativado pelo passo 2). Ao voltar para a aba, o portal também recarrega os dados. Confira em **Database → Publications → supabase_realtime** se a tabela `authorizations` está marcada. |
