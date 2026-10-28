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
