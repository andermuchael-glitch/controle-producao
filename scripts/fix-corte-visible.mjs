import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const marker = "/* FIX_CORTE_VISIBLE_V3 */";
if (source.includes(marker)) {
  console.log("NeoCooler: correção visual da aba Corte V3 já aplicada.");
  process.exit(0);
}

const corteAnchor = '        {loaded && aba === "corte" && (';
const corteStart = source.indexOf(corteAnchor);
if (corteStart === -1) {
  throw new Error("NeoCooler: aba Corte não encontrada no App.jsx.");
}

const sectionNeedle = '<section style={styles.listWrap}';
const sectionStart = source.indexOf(sectionNeedle, corteStart);
if (sectionStart === -1) {
  throw new Error("NeoCooler: seção visual da aba Corte não encontrada.");
}

// Garante que a seção da aba Corte tenha uma classe própria sem duplicá-la.
const sectionEnd = source.indexOf('>', sectionStart);
const sectionTag = source.slice(sectionStart, sectionEnd + 1);
if (!sectionTag.includes('className="corte-etapa-list"')) {
  const replacement = sectionTag.replace('>', ' className="corte-etapa-list">');
  source = source.slice(0, sectionStart) + replacement + source.slice(sectionEnd + 1);
}

const cssAnchor = "        @media (prefers-reduced-motion: reduce)";
if (!source.includes(cssAnchor)) {
  throw new Error("NeoCooler: âncora CSS não encontrada.");
}

const css = `        /* FIX_CORTE_VISIBLE_V3 */
        /* A correção anterior deixava somente os contornos dos cartões. */
        .corte-etapa-list .pedido-card,
        .corte-etapa-list .pedido-card.pedido-aberto {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
          min-height: 100px !important;
          color: #231f1a !important;
          animation: none !important;
        }
        .corte-etapa-list .pedido-card > .pedidoTop {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          height: auto !important;
        }
        .corte-etapa-list .pedido-card > .itensLista {
          display: flex !important;
          flex-direction: column !important;
          visibility: visible !important;
          opacity: 1 !important;
          height: auto !important;
          max-height: none !important;
        }
        .corte-etapa-list .pedido-card .item-linha {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          height: auto !important;
          min-height: 28px !important;
        }
        .corte-etapa-list .pedido-card .itemTexto,
        .corte-etapa-list .pedido-card .pedidoNum,
        .corte-etapa-list .pedido-card .pctText,
        .corte-etapa-list .pedido-card b,
        .corte-etapa-list .pedido-card span {
          visibility: visible !important;
          opacity: 1 !important;
        }
        .corte-etapa-list .pedido-card button,
        .corte-etapa-list .pedido-card select {
          visibility: visible !important;
          opacity: 1 !important;
        }

`;
source = source.replace(cssAnchor, css + cssAnchor);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: V3 aplicada; cartões e conteúdo da aba Corte forçados a permanecer visíveis.");
