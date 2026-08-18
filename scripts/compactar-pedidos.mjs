import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
let alterado = false;

const aplicar = (nome, from, to) => {
  if (!source.includes(from)) {
    console.log(`NeoCooler: alvo não encontrado para ${nome}.`);
    return;
  }
  source = source.replace(from, to);
  alterado = true;
  console.log(`NeoCooler: ${nome} aplicado.`);
};

// Todos os pedidos começam minimizados. O cabeçalho do pedido funciona como abre/fecha.
const ponto = `  useEffect(() => {\n    if (window.jspdf) return;`;
const insercao = `  // Pedidos minimizados: clicar no cabeçalho abre/fecha os itens.\n  useEffect(() => {\n    const alternarPedido = (e) => {\n      const alvo = e.target;\n      if (alvo.closest("button, input, select, textarea, a")) return;\n      const topo = alvo.closest(".pedido-card .pedidoTop");\n      if (!topo) return;\n      const card = topo.closest(".pedido-card");\n      if (card) card.classList.toggle("pedido-aberto");\n    };\n    document.addEventListener("click", alternarPedido);\n    return () => document.removeEventListener("click", alternarPedido);\n  }, []);\n\n  useEffect(() => {\n    if (window.jspdf) return;`;
aplicar("comportamentoAbrirFecharPedido", ponto, insercao);

const cssPonto = `        .card { animation: rise .25s ease both; }\n        @keyframes rise`;
const cssNovo = `        .card { animation: rise .25s ease both; }\n\n        /* Pedidos compactos: economiza espaço e permite abrir somente o pedido desejado. */\n        .pedido-card { overflow: hidden; }\n        .pedido-card:not(.pedido-aberto) > :not(.pedidoTop) { display: none !important; }\n        .pedido-card .pedidoTop { cursor: pointer; user-select: none; position: relative; padding-right: 34px !important; }\n        .pedido-card .pedidoTop::after { content: "＋"; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 22px; font-weight: 700; opacity: .55; }\n        .pedido-card.pedido-aberto .pedidoTop::after { content: "−"; }\n        .pedido-card:not(.pedido-aberto) { padding-bottom: 8px !important; }\n\n        @keyframes rise`;
aplicar("estiloPedidosCompactos", cssPonto, cssNovo);

if (alterado) {
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: pedidos agora ficam minimizados por padrão e abrem ao tocar no cabeçalho.");
} else {
  console.log("NeoCooler: nenhuma alteração necessária.");
}
