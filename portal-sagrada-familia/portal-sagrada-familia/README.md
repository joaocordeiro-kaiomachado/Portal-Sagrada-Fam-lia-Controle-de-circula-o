# Portal Sagrada Família — Controle de Saída de Alunos

Sistema web para registrar, consultar e imprimir autorizações de saída de sala de aula, com login individual, dois níveis de acesso (administrador e professor), relatórios com exportação e auditoria.

**Tecnologias:** React 19 · TypeScript · Vite · Tailwind CSS 4 · Supabase (banco PostgreSQL, autenticação, tempo real e Edge Function) · Lucide Icons · hospedagem no Netlify.

## O que o sistema faz

| Área | Funcionalidades |
|---|---|
| **Login** | Login por e-mail e senha, recuperação de senha por e-mail, sessão encerrada ao fechar o navegador ou após 30 min sem uso, botão "Sair da conta". |
| **Painel** | Saídas hoje / na semana / no mês / total, últimas autorizações, atalhos. Atualiza sozinho quando outro computador registra algo. |
| **Nova autorização** | Professor, aluno, ano escolar, turma, data, horário, motivo e observações; validação de todos os campos; botões Registrar, Limpar e Cancelar; tela de confirmação com opção de imprimir. |
| **Histórico** | Pesquisa por aluno e por professor, filtros por turma, data e motivo, ordenação por data/horário, detalhes, impressão, edição e exclusão com confirmação (só administradores). |
| **Relatórios** *(admin)* | Totais por dia, turma, professor e motivo, filtros de período, exportação em CSV (abre no Excel) e PDF. |
| **Usuários** *(admin)* | Criar contas, mudar perfil, desativar/reativar, enviar link de senha ou definir senha provisória, escolher se professores veem só os próprios registros ou todos. |
| **Auditoria** *(admin)* | Registro automático e imutável de criações, alterações e exclusões, com "antes e depois". |

## Estrutura de pastas

```
portal-sagrada-familia/
├── docs/                         Manuais (comece por aqui)
│   ├── 1-PUBLICACAO.md           Como colocar no ar de graça (Supabase + Netlify)
│   ├── 2-PRIMEIRO-ADMIN.md       Como criar o primeiro administrador
│   ├── 3-INSTALACAO-LOCAL.md     Como rodar no computador (desenvolvimento)
│   ├── 4-SEGURANCA-LGPD.md       Segurança, permissões e LGPD
│   └── 5-TESTES.md               O que foi testado e como repetir os testes
├── supabase/
│   ├── migrations/001_schema.sql Banco completo: tabelas, RLS, gatilhos, auditoria
│   ├── functions/admin-users/    Edge Function de gestão de usuários
│   └── primeiro-admin.sql        Script para promover o primeiro administrador
├── src/                          Código-fonte do site
│   ├── components/               Componentes reutilizáveis (ui, layout, autorizações)
│   ├── contexts/                 Sessão (login) e avisos na tela
│   ├── hooks/                    Tempo real, impressão, atraso de digitação
│   ├── lib/                      Conexão, formatação, validação, exportação, erros
│   ├── pages/                    Telas do sistema
│   ├── services/                 Acesso ao banco
│   └── types/                    Tipos do banco
├── testes/                       Testes de segurança (SQL) e de ponta a ponta (navegador)
├── public/_redirects             Rotas da aplicação no Netlify
├── netlify.toml                  Configuração de build e segurança do Netlify
└── .env.example                  Modelo das variáveis de ambiente
```

## Começo rápido

1. Siga **[docs/1-PUBLICACAO.md](docs/1-PUBLICACAO.md)** — passo a passo para colocar o portal no ar gratuitamente.
2. Crie o primeiro administrador com **[docs/2-PRIMEIRO-ADMIN.md](docs/2-PRIMEIRO-ADMIN.md)**.
3. Entre no portal e cadastre os professores em **Usuários**.

Nenhuma senha ou chave privada fica no código. O site usa apenas a chave **pública** do Supabase; a segurança dos dados é garantida pelas regras do banco (RLS).
