# 4. Segurança, permissões e LGPD

O portal guarda dados pessoais de estudantes, em sua maioria menores de idade. A LGPD (Lei nº 13.709/2018, art. 14) exige tratamento no **melhor interesse da criança e do adolescente**, com cuidado redobrado. Abaixo está o que o sistema faz e o que cabe à escola.

## O que o sistema já faz

### Acesso
- **Não há cadastro público.** Só administradores criam contas (cadastro desligado no Supabase + Edge Function que confere o perfil).
- **Senhas nunca ficam em texto puro:** são guardadas pelo Supabase Auth com *hash* bcrypt. O portal não tem acesso a elas.
- **Senha mínima:** 8 caracteres com letras e números.
- **Sessão protegida:** encerra ao fechar o navegador e após **30 minutos sem uso** (bom para computadores compartilhados da sala dos professores).
- **Contas desativadas** são bloqueadas no login e no banco, imediatamente.
- **Rotas internas** só abrem com login; rotas de administração só com perfil de administrador.

### Banco de dados (proteção no servidor — não depende da tela)
- **RLS (Row Level Security)** em todas as tabelas. Visitantes anônimos não têm nenhum acesso.
- **Professor:** registra autorizações; vê apenas as próprias (ou todas, se o administrador liberar). **Não** edita nem exclui.
- **Administrador:** acesso completo.
- **Validação no servidor:** nomes, tamanhos, data (não aceita data futura; novos registros só dos últimos 30 dias), motivo "Outro" exige descrição. O autor do registro é sempre quem está logado — não pode ser falsificado.
- **Ninguém se promove a administrador** sozinho; o sistema nunca fica sem administrador ativo.
- **A chave secreta (service_role) nunca vai para o navegador** — fica apenas dentro da Edge Function, no Supabase.

### Rastreabilidade
- **Auditoria automática** de criação, alteração e exclusão de autorizações, mudanças em usuários e nas configurações: quem fez, quando e o "antes e depois".
- A auditoria **não pode ser alterada nem apagada** pelo portal; só administradores a consultam.

### Site
- Cabeçalhos de segurança no Netlify (anti-*clickjacking*, *nosniff*, política de referência) e `noindex` para não aparecer no Google.
- Documento impresso e relatórios trazem o aviso de dado pessoal de uso interno.

## O que cabe à escola (LGPD)

1. **Base legal e finalidade:** registre que os dados são tratados para controle de circulação e segurança dos alunos durante o período escolar (cumprimento de obrigação de cuidado / interesse legítimo, avaliado pelo encarregado da escola).
2. **Transparência:** informe as famílias, por exemplo no regimento ou em comunicado, que as saídas de sala são registradas digitalmente.
3. **Mínimo necessário:** use o campo *Observações* só quando preciso e **não registre informações de saúde, diagnósticos ou situações familiares** nele.
4. **Contas pessoais:** cada pessoa usa a própria conta. Não compartilhe senhas. Desative imediatamente quem sair da escola.
5. **Retenção:** defina por quanto tempo guardar os registros (ex.: até o fim do ano letivo seguinte). Para apagar registros antigos, um administrador pode rodar no SQL Editor, por exemplo:
   ```sql
   delete from public.authorizations where authorization_date < '2025-01-01';
   ```
   (a exclusão fica registrada na auditoria).
6. **Encarregado (DPO):** indique quem responde por pedidos de famílias (acesso, correção, exclusão).
7. **Exportações:** arquivos CSV/PDF contêm dados pessoais. Guarde-os apenas em locais da escola e apague quando não forem mais necessários.
8. **Local dos dados:** escolha a região **São Paulo** ao criar o projeto no Supabase.

## Resumo das permissões

| Ação | Professor(a) | Administrador |
|---|:---:|:---:|
| Registrar autorização | ✅ | ✅ |
| Ver os próprios registros | ✅ | ✅ |
| Ver registros de todos | Se liberado | ✅ |
| Imprimir autorização | ✅ | ✅ |
| Editar / excluir | — | ✅ |
| Relatórios e exportação | — | ✅ |
| Gerenciar usuários e permissões | — | ✅ |
| Consultar auditoria | — | ✅ |
