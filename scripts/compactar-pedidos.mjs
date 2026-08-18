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
const cssNovo = `        .card { animation: rise .25s ease both; }\n\n        /* Pedidos compactos: mostra sempre um cabeçalho legível e abre os detalhes ao tocar. */\n        .pedido-card { overflow: hidden; }\n        .pedido-card:not(.pedido-aberto) > :not(.pedidoTop) { display: none !important; }\n        .pedido-card .pedidoTop {\n          cursor: pointer;\n          user-select: none;\n          position: relative;\n          display: flex !important;\n          visibility: visible !important;\n          opacity: 1 !important;\n          min-height: 48px !important;\n          align-items: center !important;\n          margin: 0 !important;\n          padding: 10px 42px 10px 4px !important;\n          color: #1d2b3a !important;\n          border-radius: 9px;\n        }\n        .pedido-card:not(.pedido-aberto) .pedidoTop {\n          background: #f7f3e8 !important;\n          border: 1px solid #e2d8c5;\n          box-shadow: 0 1px 3px rgba(0,0,0,.08);\n        }\n        .pedido-card .pedidoTop > * { visibility: visible !important; opacity: 1 !important; }\n        .pedido-card .pedidoTop span { visibility: visible !important; opacity: 1 !important; }\n        .pedido-card .pedidoNum { font-size: 18px !important; font-weight: 800 !important; color: #17283a !important; }\n        .pedido-card .pedidoTop::after {\n          content: "＋";\n          position: absolute;\n          right: 10px;\n          top: 50%;\n          transform: translateY(-50%);\n          width: 30px;\n          height: 30px;\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          border-radius: 50%;\n          background: #1f8a3d;\n          color: #fff;\n          font-size: 20px;\n          font-weight: 800;\n          line-height: 1;\n          opacity: 1;\n        }\n        .pedido-card.pedido-aberto .pedidoTop::after { content: "−"; }\n        .pedido-card:not(.pedido-aberto) { padding: 8px !important; }\n\n        @keyframes rise`;
aplicar("estiloPedidosCompactos", cssPonto, cssNovo);

if (alterado) {
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: pedidos agora ficam minimizados com cabeçalho sempre visível.");
} else {
  console.log("NeoCooler: nenhuma alteração necessária.");
}
