import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
let alterado = false;

// Mantém o comportamento de abrir/fechar por toque, mas nunca permite que
// os cartões fiquem invisíveis por causa da regra de compactação antiga.
const ponto = `  useEffect(() => {\n    if (window.jspdf) return;`;
const insercao = `  // Pedidos podem ser abertos/fechados pelo cabeçalho, sem esconder o conteúdo por CSS.\n  useEffect(() => {\n    const alternarPedido = (e) => {\n      const alvo = e.target;\n      if (alvo.closest("button, input, select, textarea, a")) return;\n      const topo = alvo.closest(".pedido-card .pedidoTop");\n      if (!topo) return;\n      const card = topo.closest(".pedido-card");\n      if (card) card.classList.toggle("pedido-aberto");\n    };\n    document.addEventListener("click", alternarPedido);\n    return () => document.removeEventListener("click", alternarPedido);\n  }, []);\n\n  useEffect(() => {\n    if (window.jspdf) return;`;
if (!source.includes("Pedidos podem ser abertos/fechados pelo cabeçalho")) {
  if (source.includes(ponto)) {
    source = source.replace(ponto, insercao);
    alterado = true;
  }
}

// Remove a regra antiga que escondia todo o conteúdo dos cartões fechados.
const regraAntiga = `.pedido-card:not(.pedido-aberto) > :not(.pedidoTop) { display: none !important; }`;
if (source.includes(regraAntiga)) {
  source = source.replace(regraAntiga, `.pedido-card:not(.pedido-aberto) > :not(.pedidoTop) { display: block !important; visibility: visible !important; opacity: 1 !important; }`);
  alterado = true;
}

// Também neutraliza qualquer versão anterior de compactação que tenha ficado no App.jsx.
const marker = "/* FIX_PEDIDOS_VISIVEIS_GLOBAL */";
if (!source.includes(marker)) {
  const css = `${marker}\n        /* Todos os cartões e seus itens devem permanecer visíveis. */\n        .pedido-card,\n        .pedido-card > :not(.pedidoTop),\n        .pedido-card .itensLista,\n        .pedido-card .item-linha,\n        .pedido-card .corteLinha,\n        .pedido-card .corteFormGrid,\n        .pedido-card .alocGrid {\n          visibility: visible !important;\n          opacity: 1 !important;\n        }\n        .pedido-card {\n          overflow: visible !important;\n          height: auto !important;\n          max-height: none !important;\n        }\n        .pedido-card:not(.pedido-aberto) > :not(.pedidoTop) {\n          display: block !important;\n        }\n        .pedido-card .itensLista {\n          display: flex !important;\n          flex-direction: column !important;\n        }\n`;
  const templateEnd = source.lastIndexOf("`}</style>");
  if (templateEnd !== -1) {
    source = source.slice(0, templateEnd) + css + source.slice(templateEnd);
    alterado = true;
  } else {
    console.warn("NeoCooler: template de estilo não encontrado; proteção global não aplicada.");
  }
}

if (alterado) {
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: cartões e itens das etapas mantidos visíveis.");
} else {
  console.log("NeoCooler: nenhuma alteração necessária.");
}
