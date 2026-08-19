import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
const marker = "// FIX_SEPARACAO_VISIBLE_V1";

if (source.includes(marker)) {
  console.log("NeoCooler: correção da aba Separação já aplicada.");
  process.exit(0);
}

const anchor = '        {loaded && aba === "separacao" && (';
if (!source.includes(anchor)) {
  throw new Error("NeoCooler: âncora da aba Separação não encontrada.");
}

source = source.replace(anchor, `${anchor}\n          {/* FIX_SEPARACAO_VISIBLE_V1 */}`);

const cssAnchor = `        @media (prefers-reduced-motion: reduce) { .card { animation: none; } }`;
if (!source.includes(cssAnchor)) {
  throw new Error("NeoCooler: âncora CSS não encontrada para a aba Separação.");
}

const css = `        /* FIX_SEPARACAO_VISIBLE_V1: Separação não pode herdar a compactação dos pedidos. */\n        .separacao-etapa-list .separacao-etapa-card,\n        .separacao-etapa-list .separacao-etapa-card.pedido-card {\n          display: block !important;\n          visibility: visible !important;\n          opacity: 1 !important;\n          overflow: visible !important;\n          height: auto !important;\n          max-height: none !important;\n          padding: 14px 16px !important;\n        }\n        .separacao-etapa-list .separacao-etapa-card .pedidoTop,\n        .separacao-etapa-list .separacao-etapa-card .pedidoNumWrap,\n        .separacao-etapa-list .separacao-etapa-card .pedidoNum,\n        .separacao-etapa-list .separacao-etapa-card .pctText,\n        .separacao-etapa-list .separacao-etapa-card .itensLista,\n        .separacao-etapa-list .separacao-etapa-card .item-linha,\n        .separacao-etapa-list .separacao-etapa-card .itemTexto {\n          display: flex !important;\n          visibility: visible !important;\n          opacity: 1 !important;\n        }\n        .separacao-etapa-list .separacao-etapa-card .pedidoTop {\n          min-height: 48px !important;\n          margin-bottom: 8px !important;\n          padding: 8px 4px !important;\n          color: #17283a !important;\n        }\n        .separacao-etapa-list .separacao-etapa-card .pedidoNum,\n        .separacao-etapa-list .separacao-etapa-card .itemTexto,\n        .separacao-etapa-list .separacao-etapa-card .pctText {\n          color: #17283a !important;\n        }\n        .separacao-etapa-list .separacao-etapa-card .itensLista {\n          flex-direction: column !important;\n          gap: 6px !important;\n        }\n        .separacao-etapa-list .separacao-etapa-card .item-linha {\n          align-items: center !important;\n          min-height: 46px !important;\n          width: 100% !important;\n          gap: 8px !important;\n          color: #17283a !important;\n        }\n        .separacao-etapa-list .separacao-etapa-card .checkbox {\n          display: flex !important;\n          visibility: visible !important;\n          opacity: 1 !important;\n          flex: 0 0 auto !important;\n        }\n        .separacao-etapa-list .separacao-etapa-card .swatchSm {\n          display: inline-block !important;\n          visibility: visible !important;\n          opacity: 1 !important;\n          flex: 0 0 auto !important;\n        }\n        .separacao-etapa-list .separacao-etapa-card .removerBtn {\n          display: flex !important;\n          visibility: visible !important;\n          opacity: 1 !important;\n          flex: 0 0 auto !important;\n        }\n        .separacao-etapa-list .separacao-etapa-card .pedidoTop::after {\n          display: none !important;\n        }\n\n`;
source = source.replace(cssAnchor, css + cssAnchor);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: aba Separação com pedidos e itens sempre visíveis.");
