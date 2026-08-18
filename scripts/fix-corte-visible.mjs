import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const marker = "// FIX_CORTE_VISIBLE_V2";
if (source.includes(marker)) {
  console.log("NeoCooler: correção visual da aba Corte já aplicada.");
  process.exit(0);
}

// A aba Corte já existe no App.jsx atual. Não devemos inserir uma segunda aba,
// pois isso pode quebrar a árvore JSX. Apenas marcamos a seção existente e
// reforçamos sua visibilidade.
const corteAnchor = '        {loaded && aba === "corte" && (';
const corteStart = source.indexOf(corteAnchor);
if (corteStart === -1) {
  throw new Error("NeoCooler: aba Corte não encontrada no App.jsx.");
}

const sectionNeedle = '<section style={styles.listWrap}>';
const sectionStart = source.indexOf(sectionNeedle, corteStart);
if (sectionStart === -1) {
  throw new Error("NeoCooler: seção visual da aba Corte não encontrada.");
}

const sectionReplacement = '<section style={styles.listWrap} className="corte-etapa-list">';
source = source.slice(0, sectionStart) + sectionReplacement + source.slice(sectionStart + sectionNeedle.length);

const cssAnchor = "        @media (prefers-reduced-motion: reduce)";
if (!source.includes(cssAnchor)) {
  throw new Error("NeoCooler: âncora CSS não encontrada.");
}

const css = `        /* FIX_CORTE_VISIBLE_V2: mantém cartões da aba Corte sempre visíveis. */\n        .corte-etapa-list .pedido-card,\n        .corte-etapa-list .item-linha {\n          display: flex !important;\n          visibility: visible !important;\n          opacity: 1 !important;\n        }\n        .corte-etapa-list .pedido-card {\n          flex-direction: column !important;\n          overflow: visible !important;\n          height: auto !important;\n          max-height: none !important;\n        }\n        .corte-etapa-list .pedidoTop,\n        .corte-etapa-list .itensLista {\n          visibility: visible !important;\n          opacity: 1 !important;\n        }\n\n`;
source = source.replace(cssAnchor, css + cssAnchor);
source = source.replace(sectionReplacement, sectionReplacement + "\n          {/* FIX_CORTE_VISIBLE_V2 */}");

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: aba Corte existente marcada como visível; nenhuma segunda aba foi inserida.");
