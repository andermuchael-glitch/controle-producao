import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
const marker = "/* FIX_SEPARACAO_VISIBLE_V3 */";

if (source.includes(marker)) {
  console.log("NeoCooler: correção V3 da aba Separação já aplicada.");
  process.exit(0);
}

// Os patches anteriores podem alterar a estrutura JSX da aba antes deste script.
// Por isso não dependemos de uma âncora exata.
const sepInicio = source.indexOf('aba === "separacao"');
if (sepInicio === -1) {
  console.warn("NeoCooler: aba Separação não localizada; build continuará sem este patch.");
  process.exit(0);
}

const sectionInicio = source.indexOf('<section', sepInicio);
const sectionFim = source.indexOf('</section>', sectionInicio);
if (sectionInicio !== -1 && sectionFim !== -1 && sectionInicio < sectionFim) {
  const sectionTrecho = source.slice(sectionInicio, sectionFim);
  if (!sectionTrecho.includes('separacao-etapa-list')) {
    const posStyle = sectionTrecho.indexOf('style={styles.listWrap}');
    if (posStyle !== -1) {
      const posFimStyle = posStyle + 'style={styles.listWrap}'.length;
      const trechoNovo = sectionTrecho.slice(0, posFimStyle) + ' className="separacao-etapa-list"' + sectionTrecho.slice(posFimStyle);
      source = source.slice(0, sectionInicio) + trechoNovo + source.slice(sectionFim);
    }
  }
}

// Marca o cartão da Separação como aberto para neutralizar a compactação dos pedidos.
const sepInicio2 = source.indexOf('aba === "separacao"');
const sepFim2 = source.indexOf('</section>', sepInicio2);
const sepBloco = source.slice(sepInicio2, sepFim2 === -1 ? source.length : sepFim2);
const cardPos = sepBloco.indexOf('className="card pedido-card"');
if (cardPos !== -1 && !sepBloco.includes('separacao-etapa-card')) {
  const absoluto = sepInicio2 + cardPos;
  source = source.slice(0, absoluto) + 'className="card pedido-card separacao-etapa-card pedido-aberto"' + source.slice(absoluto + 'className="card pedido-card"'.length);
}

// A aplicação usa <style>{` ... `}</style>. A versão anterior inseria CSS depois
// de </style>, quebrando o JSX. Aqui inserimos o CSS dentro da template string.
const css = `${marker}
        /* Separação deve permanecer totalmente aberta e visível. */
        .separacao-etapa-list,
        .separacao-etapa-list .separacao-etapa-card,
        .separacao-etapa-list .separacao-etapa-card.pedido-card {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }
        .separacao-etapa-list .separacao-etapa-card > * {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .separacao-etapa-list .separacao-etapa-card .pedidoTop,
        .separacao-etapa-list .separacao-etapa-card .pedidoNumWrap,
        .separacao-etapa-list .separacao-etapa-card .itensLista,
        .separacao-etapa-list .separacao-etapa-card .item-linha {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .separacao-etapa-list .separacao-etapa-card .pedidoTop {
          min-height: 48px !important;
          margin-bottom: 8px !important;
          padding: 8px 4px !important;
          cursor: default !important;
        }
        .separacao-etapa-list .separacao-etapa-card .pedidoTop::after {
          display: none !important;
        }
        .separacao-etapa-list .separacao-etapa-card .itensLista {
          flex-direction: column !important;
          gap: 6px !important;
        }
        .separacao-etapa-list .separacao-etapa-card .item-linha {
          align-items: center !important;
          min-height: 46px !important;
          width: 100% !important;
          gap: 8px !important;
        }
        .separacao-etapa-list .separacao-etapa-card .checkbox,
        .separacao-etapa-list .separacao-etapa-card .swatchSm,
        .separacao-etapa-list .separacao-etapa-card .removerBtn {
          visibility: visible !important;
          opacity: 1 !important;
        }
`;

const templateEnd = source.lastIndexOf('`}</style>');
if (templateEnd !== -1) {
  source = source.slice(0, templateEnd) + css + source.slice(templateEnd);
} else {
  console.warn("NeoCooler: template de estilo JSX não encontrado; proteção CSS não aplicada.");
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: V3 da aba Separação aplicada dentro do template CSS do JSX.");
