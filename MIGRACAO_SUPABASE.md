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

## Atenção
O app ainda usa Firebase em `AuthGate.jsx`, `storage.js` e na comunicação interna. Este commit prepara o cliente e o esquema; não troca o backend sozinho. A próxima etapa deve migrar autenticação, persistência em tempo real, auditoria e mensagens em conjunto e só então remover Firebase/Netlify após teste e confirmação.


## GitHub Pages (preparação, sem publicar)
- O Vite usa a base `/controle-producao/`, o caminho correto para o repositório de projeto no GitHub Pages.
- O manifest e o registro do service worker usam esse caminho-base.
- O build prepara `dist/404.html` para fallback SPA.
- O workflow de CI valida o build da branch de migração, mas não publica nada e não altera a configuração de Pages.
- URL pretendida após aprovação e configuração manual: https://andermuchael-glitch.github.io/controle-producao/
- O deploy está intencionalmente bloqueado até Supabase Auth, armazenamento, mensagens e importação serem implementados e testados. Sem as variáveis Supabase, não publicar a aplicação migrada.
