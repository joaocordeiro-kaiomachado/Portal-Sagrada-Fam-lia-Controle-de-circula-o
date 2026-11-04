# 5. Testes realizados

O sistema foi testado em duas camadas, contra componentes **reais** do Supabase rodando localmente: PostgreSQL 16, **Supabase Auth (GoTrue v2.170)**, **PostgREST v12.2** e a Edge Function `admin-users` executada no **Deno 2**. O site testado foi o build de produção (`npm run build`), aberto no Google Chrome.

## 1. Segurança do banco (SQL) — `testes/seguranca-rls.sql`

Todos aprovados:

- Papel "admin" enviado pelo cliente no cadastro é **ignorado** (todo usuário nasce professor)
- Autor do registro não pode ser falsificado (`created_by` é sempre quem está logado)
- Normalização de nomes e turma (espaços extras, letra maiúscula)
- Data futura bloqueada · data com mais de 30 dias bloqueada · motivo "Outro" sem descrição bloqueado
- Professor não se promove a administrador
- Professor não edita, não exclui, não lê auditoria, não vê outros perfis, não muda configurações
- Professor não vê registros de outro professor (padrão) e passa a ver quando o admin libera
- Usuário desativado não lê nem grava
- Último administrador ativo não pode ser rebaixado
- Edição e exclusão pelo administrador ficam na auditoria com o nome de quem fez
- Visitante anônimo sem acesso a tabelas nem a funções

## 2. Ponta a ponta no navegador — `testes/ponta-a-ponta.mjs`

**36 de 36 testes aprovados** (resultado em `testes/resultado-e2e.json`):

| Área | Testes |
|---|---|
| Login | rota protegida redireciona; senha errada mostra mensagem clara; login do admin; menu correto por perfil |
| Usuários | criação de professores pela tela (Edge Function); desativar bloqueia o login; senha provisória pelo admin; último admin protegido |
| Cadastro | validação de campos vazios; "Outro" exige observação; data futura bloqueada; limpar formulário; registro com confirmação; vários registros |
| Permissões | professor sem área administrativa (nem pela URL); vê só os próprios registros; sem botões de editar/excluir; permissão ampliada pelo admin |
| Banco compartilhado | registro feito por um usuário aparece para outro, em outra sessão (outro "computador") |
| Histórico | pesquisa por aluno; por professor; filtros por turma, motivo e data; ordenação; detalhes; edição; impressão; exclusão com confirmação |
| Relatórios | totais por dia, turma, professor e motivo; filtro de período; exportação CSV e PDF (arquivos gerados e conferidos) |
| Auditoria | criação, alteração e exclusão registradas |
| Senha | recuperação por e-mail completa (e-mail recebido → link → nova senha → login) |
| Sessão | sair da conta encerra a sessão |
| Layout | 1366×768 e 1920×1080 sem rolagem horizontal |

## O que só pode ser conferido no Supabase real

- **Atualização automática em tempo real** entre computadores (serviço *Realtime*, que não roda fora da nuvem do Supabase). O código está pronto e a tabela é adicionada à publicação pelo SQL. Mesmo sem o Realtime, os dados são compartilhados: cada tela recarrega ao abrir e ao voltar para a aba. **Teste sugerido após publicar:** abra o portal em dois computadores, registre uma saída em um e veja o painel do outro atualizar em poucos segundos.
- **Envio de e-mail** pelo serviço do Supabase (localmente foi usado um servidor de e-mail de teste).

## Checklist de aceite após publicar

1. [ ] Entrar como administrador
2. [ ] Criar um professor em **Usuários**
3. [ ] Registrar uma saída como professor
4. [ ] Ver a saída aparecer no painel do administrador em outro computador
5. [ ] Imprimir a autorização (Chrome ou Edge → *Salvar como PDF* ou impressora)
6. [ ] Exportar CSV e PDF em **Relatórios**
7. [ ] Testar **Esqueci minha senha** com um e-mail real
8. [ ] Desativar o professor de teste e confirmar que ele não entra mais

## Como repetir os testes

- **SQL:** em um PostgreSQL local, rode `testes/supabase-stubs-local.sql` (simula o esquema `auth` do Supabase), depois `supabase/migrations/001_schema.sql` e por fim `testes/seguranca-rls.sql`. A última linha deve ser `ALL RLS TESTS PASSED`. **Não rode estes arquivos no projeto real** — eles criam dados de teste.
- **Navegador:** com o portal rodando contra um Supabase de teste (com um admin `coordenacao@escola.test` / `Teste1234`), instale `puppeteer-core` e rode `node testes/ponta-a-ponta.mjs` (variáveis opcionais: `PORTAL_URL`, `CHROME_PATH`). O teste de recuperação de senha lê os e-mails de `testes/mail.jsonl`, gravado por um servidor SMTP de teste.
