import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const marker = "// PRE_CORTE_FILTER_VISIBLE_V1";
if (source.includes(marker)) process.exit(0);

const anchor = 'preCorteAgrupadoFiltradoPorProduto.map((p) => (\n                <div key={p.numero} style={styles.pedidoCard} className="card pedido-card">';
if (!source.includes(anchor)) {
  throw new Error("NeoCooler: bloco de cartões do Pré-Corte não encontrado.");
}

const replacement = `preCorteAgrupadoFiltradoPorProduto.map((p) => (\n                <div key={p.numero} style={styles.pedidoCard} className={produtoFiltroCorte !== "Todos" ? "card pedido-card pedido-aberto" : "card pedido-card"}>`;
source = source.replace(anchor, replacement);

const cssAnchor = "        @media (prefers-reduced-motion: reduce)";
const cssFix = `        /* PRE_CORTE_FILTER_VISIBLE_V1: ao filtrar um produto, abre os pedidos correspondentes. */\n        .pedido-card.pre-corte-filter-open {\n          display: block !important;\n          visibility: visible !important;\n          opacity: 1 !important;\n          overflow: visible !important;\n          height: auto !important;\n          max-height: none !important;\n        }\n\n`;

// O compactador usa .pedido-aberto; o CSS abaixo reforça que os cartões filtrados permaneçam visíveis.
if (!source.includes("PRE_CORTE_FILTER_VISIBLE_V1: ao filtrar")) {
  if (!source.includes(cssAnchor)) throw new Error("NeoCooler: âncora CSS não encontrada.");
  source = source.replace(cssAnchor, cssFix + cssAnchor);
}

source = source.replace(
  'className={produtoFiltroCorte !== "Todos" ? "card pedido-card pedido-aberto" : "card pedido-card"}',
  'className={produtoFiltroCorte !== "Todos" ? "card pedido-card pedido-aberto pre-corte-filter-open" : "card pedido-card"}'
);

source = source.replace('const [produtoFiltroCorte, setProdutoFiltroCorte] = useState("Todos");', `const [produtoFiltroCorte, setProdutoFiltroCorte] = useState("Todos");\n\n  ${marker}\n  // Quando um produto é selecionado no resumo, os cartões correspondentes ficam abertos.\n`);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: Pré-Corte — pedidos do produto filtrado ficam abertos e visíveis.");
