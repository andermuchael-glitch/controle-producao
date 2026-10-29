# Migração do NeoCooler para Supabase

## Estado da migração

A versão principal do aplicativo está migrada para Supabase e publicada pelo GitHub Pages.

- Branch principal: `main`
- Aplicação: https://andermuchael-glitch.github.io/controle-producao/
- Autenticação: Supabase Auth (e-mail e senha).
- Estado de produção, metadados e estoque: `public.controle_producao_state`.
- Auditoria: `public.auditoria_producao`.
- Mensagens internas: `public.conversas` e `public.mensagens`.
- Importação de backup: `public.producao_import_staging`, mantida separada do estado ativo.
- O código da aplicação não deve voltar a usar Firebase/Firestore. Os arquivos residuais de configuração e regras do Firebase foram removidos da branch principal.

## Configuração

O cliente usa a URL do projeto Supabase Neocooler e a chave pública publishable. A chave pública pode estar no frontend; nunca colocar uma chave `service_role` ou secret no código ou no navegador.

As contas autorizadas precisam existir em **Supabase Dashboard → Authentication → Users**. As políticas RLS das tabelas precisam permanecer habilitadas.

## Dados e segurança

O backup Excel de 28/10/2026 tinha 657 linhas na aba `Producao`. Ele não contém necessariamente todos os metadados, o progresso detalhado de cada item, estoque, auditoria, conversas ou anexos. A tabela `producao_import_staging` é uma área de conferência e não deve ser tratada como banco ativo.

Não reimportar nem executar scripts de restauração novamente sem comparar os dados atuais e preparar um plano de reversão. Não excluir nem recriar tabelas ativas para corrigir problemas de interface.

## Validação após publicação

1. Entrar com uma conta já cadastrada no Supabase Auth.
2. Confirmar que os indicadores e pedidos aparecem.
3. Abrir o mesmo aplicativo em dois navegadores e confirmar a sincronização.
4. Testar criação e edição de pedido, movimentação de etapa, arquivamento e estoque.
5. Testar mensagens internas e permissões de auditoria.
6. Confirmar que os dados continuam após atualizar a página e fazer novo login.

Se algum teste falhar, corrigir a integração ou as políticas com alterações pequenas e revisadas; não voltar ao Firebase como fallback silencioso.
