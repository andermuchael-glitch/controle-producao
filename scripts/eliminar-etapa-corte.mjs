import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
const marker = "// ELIMINAR_ETAPA_CORTE_V1";
if (source.includes(marker)) {
  console.log("NeoCooler: etapa Corte já eliminada.");
  process.exit(0);
}

// A etapa operacional Corte deixa de existir no fluxo visual.
source = source.replace(
  'const ETAPAS = ["pre_corte", "corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];'
);

// Migra dados antigos que ainda estejam em Corte para Aguardando Sublimação,
// preservando o registro de quem confirmou o corte e a data do corte.
const antigoCarregamento = `const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa || "costura",`;
const novoCarregamento = `const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "costura"),\n            origemPreCorte: i.etapa === "corte" ? true : i.origemPreCorte,`;
if (source.includes(antigoCarregamento)) {
  source = source.replace(antigoCarregamento, novoCarregamento);
} else {
  throw new Error("NeoCooler: bloco de carregamento dos itens não encontrado.");
}

// Patrick confirma no próprio Pré-Corte o que já foi cortado.
// A confirmação baixa a quantidade do Pré-Corte e cria imediatamente
// Aguardando Sublimação, sem passar por uma etapa Corte intermediária.
const inicioCorte = source.indexOf('  const marcarCortado = (pedidoNum, produtoNome, restante) => {');
const fimCorte = source.indexOf('\n  // ---- Corte -> Aguardando Sublimação', inicioCorte);
if (inicioCorte === -1 || fimCorte === -1) {
  throw new Error("NeoCooler: função marcarCortado não encontrada.");
}

const novaCorte = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const alvo = itens.find((i) => i.pedido === pedidoNum && i.produto === produtoNome && i.etapa === "pre_corte");\n    if (!alvo) { setErro("Item não encontrado no Pré-Corte."); return; }\n\n    const novaLista = [];\n    for (const i of itens) {\n      if (i.id !== alvo.id) { novaLista.push(i); continue; }\n      const restantePreCorte = Math.max(0, Number(i.qtd || 0) - qtdNum);\n      if (restantePreCorte > 0) novaLista.push({ ...i, qtd: restantePreCorte });\n    }\n\n    novaLista.push({\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: "aguardando_sublimacao",\n      origemPreCorte: true,\n      cortador: "Patrick",\n      dataCorte: f.data || hoje(),\n      criadoEm: Date.now(),\n    });\n\n    salvar(novaLista);\n    setCorteForm((f2) => ({\n      ...f2,\n      [chaveAloc(pedidoNum, produtoNome)]: {\n        qtd: Math.max(0, restante - qtdNum),\n        data: f.data,\n      },\n    }));\n  };\n`;
source = source.slice(0, inicioCorte) + novaCorte + source.slice(fimCorte);

// A aba Corte não é mais necessária. Remova o bloco visual inteiro para
// impedir que ele reapareça por patches anteriores.
const inicioAbaCorte = source.indexOf('        {loaded && aba === "corte" && (');
const fimAbaCorte = source.indexOf('        {loaded && aba === "aguardando_sublimacao" && (', inicioAbaCorte);
if (inicioAbaCorte !== -1 && fimAbaCorte > inicioAbaCorte) {
  source = source.slice(0, inicioAbaCorte) + source.slice(fimAbaCorte);
}

// Se algum código ainda tentar selecionar Corte, redireciona para Aguardando Sublimação.
source = source.replace(
  'const [aba, setAba] = useState("pre_corte");',
  'const [aba, setAbaOriginal] = useState("pre_corte");\n  const setAba = (valor) => setAbaOriginal(valor === "corte" ? "aguardando_sublimacao" : valor);'
);

// Texto dos botões de confirmação do Pré-Corte.
source = source.replace(/>Marcar como cortado</g, '>Confirmar corte → Aguardando Sublimação');
source = source.replace(/>Mover p\/ aguardando sublimação</g, '>Confirmar corte → Aguardando Sublimação');

source += `\n\n${marker}\n`;
fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: Corte eliminado como etapa operacional; confirmação do Patrick vai direto para Aguardando Sublimação.");
