import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const marker = "// COSTURA_FILTER_FIX_V2";
if (source.includes(marker)) process.exit(0);

const stateAnchor = '  const [filtroEquipe, setFiltroEquipe] = useState("Todas");';
if (!source.includes(stateAnchor)) throw new Error("NeoCooler: estado do filtro de equipe não encontrado.");

source = source.replace(
  stateAnchor,
  `${stateAnchor}\n\n  // COSTURA_FILTER_FIX_V2\n  // Ao entrar na Costura, sempre mostrar todas as equipes.\n  useEffect(() => {\n    if (aba === "costura") setFiltroEquipe("Todas");\n  }, [aba]);`
);

// O compactador de pedidos esconde tudo que não seja .pedidoTop quando o cartão está fechado.
// A Costura deve ficar aberta e mostrar os itens imediatamente.
const componentStart = source.indexOf("function PedidoCosturaCard(");
const stylesStart = source.indexOf("\nconst styles = {", componentStart);
if (componentStart !== -1 && stylesStart !== -1) {
  let component = source.slice(componentStart, stylesStart);
  component = component.replace(
    'className="card pedido-card"',
    'className="card pedido-card costura-final-card pedido-aberto"'
  );
  source = source.slice(0, componentStart) + component + source.slice(stylesStart);
}

const cssAnchor = "        @media (prefers-reduced-motion: reduce)";
const cssFix = `        /* COSTURA_FILTER_FIX_V2: cartões da Costura nunca ficam recolhidos/ocultos. */
        .pedido-card.costura-final-card,
        .pedido-card.costura-final-card.pedido-aberto {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }
        .pedido-card.costura-final-card > .pedidoTop {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .pedido-card.costura-final-card > .barraTrack,
        .pedido-card.costura-final-card > .itensLista,
        .pedido-card.costura-final-card > .finalizarBtn {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .pedido-card.costura-final-card .item-linha {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

`;
if (!source.includes("COSTURA_FILTER_FIX_V2: cartões da Costura")) {
  if (!source.includes(cssAnchor)) throw new Error("NeoCooler: âncora CSS não encontrada.");
  source = source.replace(cssAnchor, cssFix + cssAnchor);
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: Costura — filtro resetado e cartões/itens forçados a permanecer visíveis.");
