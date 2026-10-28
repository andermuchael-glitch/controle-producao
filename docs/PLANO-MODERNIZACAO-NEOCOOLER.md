# NeoCooler — plano de implementação da modernização

## Escopo desta branch
Esta branch é isolada e não publica no GitHub Pages. O workflow `.github/workflows/validate-modernization.yml` executa apenas instalação e build.

## Princípios obrigatórios
- Não alterar nem apagar dados do Supabase.
- Não reimportar a planilha nem modificar `producao_import_staging`.
- Preservar o arquivo Excel original e a lista de 657 registros recuperados.
- Não alterar o fluxo operacional ou fórmulas de produtividade nesta etapa visual.
- Só publicar depois de aprovação explícita e validação de dados.

## Fase 0 — auditoria e proteção
1. Exportar uma cópia do estado Supabase e confirmar contagem das chaves ativas.
2. Conferir 657 linhas, 216 pedidos e 59 produtos no staging com a planilha original.
3. Registrar o estado atual das branches e workflows.
4. Testar restauração em projeto/cópia isolada, nunca sobre o banco ativo.

## Fase 1 — interface de alto contraste (implementação inicial)
- Azul-marinho como base, cartões claros e borda de destaque por etapa.
- Pré-Corte: cinza-azulado.
- Aguardando Sublimação: âmbar.
- Sublimação: roxo.
- Aguardando Costura: azul-ciano.
- Costura: azul.
- Separação: verde-petróleo.
- Atrasos: vermelho, reservado a situações que exigem ação.
- Foco acessível, alvos de toque e suporte a preferência por movimento reduzido.
- Sem alteração de schema, autenticação, armazenamento ou lógica de pedidos.

## Fase 2 — gestão e produtividade (não implementada ainda)
- Definir por escrito as regras para pedido ativo, unidade pendente, conclusão, atraso e tempo por etapa.
- Usar histórico confiável de eventos para produtividade; não inferir tempos ausentes.
- Não somar a mesma unidade em múltiplas etapas como se fosse produção final.
- Validar totais contra consultas SQL de referência.
- Exportar relatórios com período, filtros e data de geração.

## Fase 3 — fluxo operacional
- Validar quantidade enviada, devolvida, baixada e pendente na costura.
- Manter histórico de arquivamento e auditoria.
- Proibir gravação de listas vazias quando uma leitura falha.

## Fase 4 — liberação
- Testes de login, CRUD, sincronização entre navegadores, costura, separação, exportações e recuperação.
- Aprovação explícita antes de publicar.
- Confirmar rollback antes de qualquer mudança de produção.

## Critério de aceite desta entrega inicial
- Build Vite aprovado no GitHub Actions.
- Diff limitado a CSS visual, import do CSS, documentação e workflow de validação.
- Nenhuma alteração de banco ou dados.
