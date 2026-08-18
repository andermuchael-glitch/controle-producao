import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
const marker = "// AGUARDANDO_SUBLIMACAO_VISIBLE_V1";
if (source.includes(marker)) process.exit(0);

// Produto novo conhecido: fica disponível como opção normal, sem o marcador interno __MANUAL__.
const produtoAnchor = '"VISEIRA TURBANTE"]';
if (source.includes(produtoAnchor) && !source.includes('"CHAVEIRO"')) {
  source = source.replace(produtoAnchor, '"VISEIRA TURBANTE","CHAVEIRO"]');
}

// Corrige a origem do problema do cadastro manual: nunca persiste __MANUAL__ como nome de produto.
source = source.replace(
  'const produtoFinal = produto === "__MANUAL__" ? produtoManual.trim() : produto;',
  'const produtoFinal = (produto === "__MANUAL__" ? produtoManual : produto).trim();'
);

// Corrige os registros que o usuário acabou de cadastrar no pedido 11037.
const alvoMigracao = '          setItens(normalizados);';
const migracaoNormalizados = `          const corrigidosManual = normalizados.map((i) =>
            i.pedido === "11037" && i.produto === "__MANUAL__" ? { ...i, produto: "CHAVEIRO" } : i
          );
          if (corrigidosManual.some((i, idx) => i.produto !== normalizados[idx]?.produto)) {
            salvarValor(STORAGE_KEY, JSON.stringify(corrigidosManual));
          }
          setItens(corrigidosManual);`;
if (source.includes(alvoMigracao)) {
  source = source.replace(alvoMigracao, migracaoNormalizados);
} else {
  const alvoMigracaoBase = '          setItens(migrados);';
  const migracaoBase = `          const corrigidosManual = migrados.map((i) =>
            i.pedido === "11037" && i.produto === "__MANUAL__" ? { ...i, produto: "CHAVEIRO" } : i
          );
          if (corrigidosManual.some((i, idx) => i.produto !== migrados[idx]?.produto)) {
            salvarValor(STORAGE_KEY, JSON.stringify(corrigidosManual));
          }
          setItens(corrigidosManual);`;
  if (source.includes(alvoMigracaoBase)) source = source.replace(alvoMigracaoBase, migracaoBase);
}

// Os cartões de Aguardando Sublimação não podem ser escondidos pelo compactador.
const aguardandoAnchor = 'aguardandoSublimacaoAgrupado.map((p) => (\n                <div key={p.numero} style={styles.pedidoCard} className="card pedido-card">';
if (source.includes(aguardandoAnchor)) {
  source = source.replace(
    aguardandoAnchor,
    'aguardandoSublimacaoAgrupado.map((p) => (\n                <div key={p.numero} style={styles.pedidoCard} className="card pedido-card pedido-aberto aguardando-sublimacao-card">'
  );
}

const cssAnchor = '        @media (prefers-reduced-motion: reduce)';
const cssFix = `        /* AGUARDANDO_SUBLIMACAO_VISIBLE_V1: cartões sempre abertos e legíveis. */
        .pedido-card.aguardando-sublimacao-card,
        .pedido-card.aguardando-sublimacao-card.pedido-aberto {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }
        .pedido-card.aguardando-sublimacao-card > .pedidoTop,
        .pedido-card.aguardando-sublimacao-card > .barraTrack,
        .pedido-card.aguardando-sublimacao-card > .itensLista {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .pedido-card.aguardando-sublimacao-card .item-linha,
        .pedido-card.aguardando-sublimacao-card .aloc-grid {
          visibility: visible !important;
          opacity: 1 !important;
        }

`;
if (!source.includes("AGUARDANDO_SUBLIMACAO_VISIBLE_V1: cartões")) {
  if (!source.includes(cssAnchor)) throw new Error("NeoCooler: âncora CSS não encontrada.");
  source = source.replace(cssAnchor, cssFix + cssAnchor);
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: Aguardando Sublimação aberto; CHAVEIRO cadastrado; registro 11037 __MANUAL__ corrigido.");
