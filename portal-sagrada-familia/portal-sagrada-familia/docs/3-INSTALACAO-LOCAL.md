# 3. Manual de instalação local (para desenvolvimento)

Use este manual se quiser rodar o portal no seu computador para testar ou fazer alterações. Para apenas **usar** o sistema, basta o [manual de publicação](1-PUBLICACAO.md).

## Requisitos (Windows 10/11)

1. **Node.js 20 ou mais recente** — baixe a versão *LTS* em nodejs.org e instale com as opções padrão.
2. Um editor de texto — recomendado: **Visual Studio Code** (code.visualstudio.com).
3. Um projeto Supabase já configurado (partes A1 a A5 do manual de publicação).

Para conferir a instalação, abra o **Prompt de Comando** ou **PowerShell** e digite:

```
node --version
npm --version
```

## Instalação

1. Extraia a pasta `portal-sagrada-familia` (ex.: em `Documentos`).
2. No VS Code: **File → Open Folder** → escolha a pasta.
3. Abra o terminal do VS Code (**Terminal → New Terminal**) e instale as dependências:

```
npm install
```

4. Copie o arquivo `.env.example` e renomeie a cópia para **`.env`**. Preencha:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

5. Inicie o portal:

```
npm run dev
```

6. Abra no navegador o endereço exibido (normalmente `http://localhost:5173`).

> Para a recuperação de senha funcionar localmente, adicione `http://localhost:5173/redefinir-senha` em **Supabase → Authentication → URL Configuration → Redirect URLs**.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia o portal em modo de desenvolvimento |
| `npm run typecheck` | Verifica erros de tipo no código |
| `npm run build` | Gera a versão de produção na pasta `dist` |
| `npm run preview` | Abre a versão de produção gerada localmente |

## Onde mexer

| Quero mudar… | Arquivo |
|---|---|
| Cores, fonte, bordas | `src/index.css` (bloco `@theme`) |
| Motivos de saída | `src/lib/constants.ts` **e** o tipo `exit_reason` no banco (nova migração SQL) |
| Sugestões de ano escolar | `src/lib/constants.ts` |
| Tempo de saída automática por inatividade | `IDLE_TIMEOUT_MINUTES` em `src/lib/constants.ts` |
| Regras de validação | `src/lib/validation.ts` (tela) e `supabase/migrations/001_schema.sql` (servidor) |
| Texto do documento impresso | `src/components/authorizations/PrintableAuthorization.tsx` |

**Novo motivo de saída** (exemplo "Enfermaria"): no SQL Editor rode
`alter type public.exit_reason add value 'enfermaria';`
e adicione `{ value: 'enfermaria', label: 'Enfermaria' }` em `REASONS` no arquivo `src/lib/constants.ts`.
