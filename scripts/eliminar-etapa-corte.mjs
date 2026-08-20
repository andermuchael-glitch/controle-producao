import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
const marker = "// ELIMINAR_ETAPA_CORTE_V2";

if (source.includes(marker)) {
  console.log("NeoCooler: eliminação da etapa Corte já aplicada.");
  process.exit(0);
}

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) {
    console.log(`NeoCooler: trecho opcional não encontrado: ${label}`);
    return false;
  }
  source = source.replace(from, to);
  console.log(`NeoCooler: ${label}`);
  return true;
};

replaceOnce(
  'const ETAPAS = ["pre_corte", "corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  "ETAPAS atualizadas sem Corte"
);

replaceOnce(
  'const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa || "costura",',
  'const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "costura"),\n            origemPreCorte: i.etapa === "corte" ? true : i.origemPreCorte,',
  "migração de itens antigos do Corte"
);

const inicioCorte = source.indexOf('  const marcarCortado = (pedidoNum, produtoNome, restante) => {');
const fimCorte = source.indexOf('\n  // ---- Corte -> Aguardando Sublimação', inicioCorte);
if (inicioCorte !== -1 && fimCorte !== -1) {
  const novaCorte = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const alvo = itens.find((i) => i.pedido === pedidoNum && i.produto === produtoNome && i.etapa === "pre_corte");\n    if (!alvo) {\n      setErro("Item não encontrado no Pré-Corte.");\n      return;\n    }\n    const novaLista = [];\n    for (const i of itens) {\n      if (i.id !== alvo.id) { novaLista.push(i); continue; }\n      const restantePreCorte = Math.max(0, Number(i.qtd || 0) - qtdNum);\n      if (restantePreCorte > 0) novaLista.push({ ...i, qtd: restantePreCorte });\n    }\n    novaLista.push({\n      id: uid(), pedido: pedidoNum, produto: produtoNome, qtd: qtdNum,\n      etapa: "aguardando_sublimacao", origemPreCorte: true,\n      cortador: "Patrick", dataCorte: f.data || hoje(), criadoEm: Date.now(),\n    });\n    salvar(novaLista);\n    setCorteForm((f2) => ({\n      ...f2,\n      [chaveAloc(pedidoNum, produtoNome)]: { qtd: Math.max(0, restante - qtdNum), data: f.data },\n    }));\n  };\n`;
  source = source.slice(0, inicioCorte) + novaCorte + source.slice(fimCorte);
  console.log("NeoCooler: confirmação do Patrick agora envia direto para Aguardando Sublimação.");
}

const inicioMover = source.indexOf('  // ---- Corte -> Aguardando Sublimação');
const fimMover = source.indexOf('\n  // ---- Alocação: aguardando sublimação', inicioMover);
if (inicioMover !== -1 && fimMover !== -1) {
  source = source.slice(0, inicioMover) + source.slice(fimMover);
  console.log("NeoCooler: função intermediária Corte -> Sublimação removida.");
}

source = source.replace(/\n    \{ id: "corte", label: "Corte", contagem: totalCorte \},/, "");
source = source.replace(/\n  const totalCorte = itens\.filter\(\(i\) => i\.etapa === "corte"\)\.reduce\(\(s, i\) => s \+ i\.qtd, 0\);/, "");
source = source.replace(/\n            <Stat label="corte" value=\{totalCorte\} \/>/, "");

const inicioAbaCorte = source.indexOf('        {loaded && aba === "corte" && (');
const fimAbaCorte = source.indexOf('        {loaded && aba === "aguardando_sublimacao" && (', inicioAbaCorte);
if (inicioAbaCorte !== -1 && fimAbaCorte !== -1) {
  source = source.slice(0, inicioAbaCorte) + source.slice(fimAbaCorte);
  console.log("NeoCooler: aba Corte removida da interface.");
}

replaceOnce(
  'const [aba, setAba] = useState("pre_corte");',
  'const [aba, setAbaOriginal] = useState("pre_corte");\n  const setAba = (valor) => setAbaOriginal(valor === "corte" ? "aguardando_sublimacao" : valor);',
  "redirecionamento de Corte para Aguardando Sublimação"
);

// Importante: usar replaceAll com strings, não regex com "/", para não quebrar o próprio script.
source = source.replaceAll(">Marcar como cortado<", ">Confirmar corte → Aguardando Sublimação<");
source = source.replaceAll(">Mover p/ aguardando sublimação<", ">Confirmar corte → Aguardando Sublimação<");
source = source.replaceAll("o item passa para a aba Corte.", "o item passa diretamente para Aguardando Sublimação.");
source = source.replaceAll("Mova itens pela aba Corte.", "Confirme o corte no Pré-Corte.");
source = source.replaceAll("(pré-corte -> corte)", "(pré-corte -> aguardando sublimação)");

source += `\n\n${marker}\n`;
fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: fluxo final aplicado: Pré-Corte -> confirmação do Patrick -> Aguardando Sublimação.");
