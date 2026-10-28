# Migração segura para Supabase

Esta branch de preparação é isolada da `main`. Não desative Firebase/Netlify nem importe dados em produção antes de validar a migração.

## Backup recebido
A planilha `controle-producao-2026-10-28 (2).xlsx` tem uma aba `Producao`, 657 linhas e as colunas `pedido`, `produto`, `quantidade`, `etapa`, `cor`, `equipe`, `sublimador`, `dataCorte`, `dataSublimacao`, `dataEntrega`. Ela é uma cópia de dados, mas não garante incluir metadados, estoque, auditoria, conversas ou anexos.

## Preparação
1. Crie/abra o projeto Supabase pretendido.
2. No SQL Editor, revise e execute `supabase/schema.sql`.
3. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente de preview/deploy. Use somente a chave pública/anon no frontend; nunca coloque a service_role key no código.
4. Habilite o método de login por e-mail/senha no Supabase Auth e cadastre os usuários autorizados.
5. Validar a importação em uma tabela de staging antes de substituir o banco ativo.

## Estado atual da migração
- O cliente Supabase usa a URL do projeto Neocooler e a chave pública publishable fornecida. A chave é pública por definição; nunca incluir `service_role`/secret no frontend.
- `AuthGate.jsx` já usa Supabase Auth; os usuários precisam existir em **Authentication → Users** no projeto Supabase e ter acesso autorizado.
- `storage.js` já aponta produção, metadados, estoque e auditoria para as tabelas Supabase.
- `main.jsx` e `Mensagens.jsx` já usam Supabase Realtime para notificações e chat.
- `src/firebase.js` e a dependência Firebase permanecem no repositório por enquanto, mas não devem ser removidas até a validação integral da migração e verificação de que nenhum módulo ainda as importa.
- O esquema SQL precisa ser aplicado no projeto Supabase antes de testar. O build não executa SQL nem valida a autenticação real.
- Não desative Firebase/Netlify e não publique no GitHub Pages até completar testes de login, CRUD, sincronização em dois navegadores, estoque, auditoria, mensagens e importação de backup.


## GitHub Pages (preparação, sem publicar)
- O Vite usa a base `/controle-producao/`, o caminho correto para o repositório de projeto no GitHub Pages.
- O manifest e o registro do service worker usam esse caminho-base.
- O build prepara `dist/404.html` para fallback SPA.
- O workflow de CI valida o build da branch de migração, mas não publica nada e não altera a configuração de Pages.
- URL pretendida após aprovação e configuração manual: https://andermuchael-glitch.github.io/controle-producao/
- O deploy está intencionalmente bloqueado até Supabase Auth, armazenamento, mensagens e importação serem implementados e testados. Sem as variáveis Supabase, não publicar a aplicação migrada.

## Importação do Excel sem afetar produção
1. Converta uma cópia da aba `Producao` para CSV UTF-8; mantenha o XLSX original intacto.
2. Execute o SQL do esquema para criar a tabela `producao_import_staging`.
3. Importe o CSV nessa tabela pela interface do Supabase (não pelo frontend público).
4. Compare a contagem de linhas, pedidos distintos, quantidades e etapas com a planilha original.
5. Só depois da validação, criar um script idempotente de transformação para o formato JSON usado pelo aplicativo. Não sobrescrever `controle_producao_state` sem uma comparação e um plano de reversão.
