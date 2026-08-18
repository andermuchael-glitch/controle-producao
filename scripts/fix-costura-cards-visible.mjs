import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// A compactação dos pedidos usa .pedido-card e pode esconder os detalhes.
// Os cartões da etapa COSTURA devem permanecer sempre visíveis.
const inicio = source.indexOf("function PedidoCosturaCard");
const fim = source.indexOf("\n}\n\nconst styles", inicio);
if (inicio !== -1 && fim !== -1) {
  let bloco = source.slice(inicio, fim + 2);
  bloco = bloco.replace(
    'className="card pedido-card"',
    'className="card pedido-card costura-final-card"'
  );
  source = source.slice(0, inicio) + bloco + source.slice(fim + 2);
}

const cssAnchor = "        @media (prefers-reduced-motion: reduce)";
const cssFix = `        /* COSTURA: nunca esconder cartões nem seus itens. */
        .pedido-card.costura-final-card { display: block !important; visibility: visible !important; opacity: 1 !important; }
        .pedido-card.costura-final-card:not(.pedido-aberto) > :not(.pedidoTop) { display: block !important; visibility: visible !important; opacity: 1 !important; }
        .pedido-card.costura-final-card .itensLista { display: flex !important; visibility: visible !important; opacity: 1 !important; }
        .pedido-card.costura-final-card .item-linha { display: flex !important; visibility: visible !important; opacity: 1 !important; }

`;
if (!source.includes(".pedido-card.costura-final-card") && source.includes(cssAnchor)) {
  source = source.replace(cssAnchor, cssFix + cssAnchor);
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: cartões da etapa Costura forçados a permanecer visíveis.");
