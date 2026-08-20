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

// 1) O fluxo operacional passa a ser Pré-Corte -> Aguardando Sublimação.
replaceOnce(
  'const ETAPAS = ["pre_corte", "corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  "ETAPAS atualizadas sem Corte"
);

// 2) Dados antigos que ainda estejam em Corte são tratados como já cortados
// e entram automaticamente em Aguardando Sublimação.
replaceOnce(
  'const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa || "costura",',
  'const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "costura"),\n            origemPreCorte: i.etapa === "corte" ? true : i.origemPreCorte,',
  "migração de itens antigos do Corte"
);

// 3) Patrick confirma no próprio Pré-Corte o que já foi cortado.
// A quantidade confirmada sai do Pré-Corte e vai imediatamente para
// Aguardando Sublimação. Não existe mais uma fila intermediária de Corte.
const inicioCorte = source.indexOf('  const marcarCortado = (pedidoNum, produtoNome, restante) => {');
const fimCorte = source.indexOf('\n  // ---- Corte -> Aguardando Sublimação', inicioCorte);
if (inicioCorte !== -1 && fimCorte !== -1) {
  const novaCorte = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const alvo = itens.find((i) => i.pedido === pedidoNum && i.produto === produtoNome && i.etapa === "pre_corte");\n    if (!alvo) {\n      setErro("Item não encontrado no Pré-Corte.");\n      return;\n    }\n\n    const novaLista = [];\n    for (const i of itens) {\n      if (i.id !== alvo.id) {\n        novaLista.push(i);\n        continue;\n      }\n      const restantePreCorte = Math.max(0, Number(i.qtd || 0) - qtdNum);\n      if (restantePreCorte > 0) novaLista.push({ ...i, qtd: restantePreCorte });\n    }\n\n    novaLista.push({\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: "aguardando_sublimacao",\n      origemPreCorte: true,\n      cortador: "Patrick",\n      dataCorte: f.data || hoje(),\n      criadoEm: Date.now(),\n    });\n\n    salvar(novaLista);\n    setCorteForm((f2) => ({\n      ...f2,\n      [chaveAloc(pedidoNum, produtoNome)]: {\n        qtd: Math.max(0, restante - qtdNum),\n        data: f.data,\n      },\n    }));\n  };\n`;
  source = source.slice(0, inicioCorte) + novaCorte + source.slice(fimCorte);
  console.log("NeoCooler: confirmação do Patrick agora envia direto para Aguardando Sublimação.");
} else {
  console.log("NeoCooler: função marcarCortado já foi alterada ou não foi encontrada.");
}

// 4) A antiga função de movimentação Corte -> Aguardando Sublimação deixa de ser necessária.
const inicioMover = source.indexOf('  // ---- Corte -> Aguardando Sublimação');
const fimMover = source.indexOf('\n  // ---- Alocação: aguardando sublimação', inicioMover);
if (inicioMover !== -1 && fimMover !== -1) {
  source = source.slice(0, inicioMover) + source.slice(fimMover);
  console.log("NeoCooler: função intermediária Corte -> Sublimação removida.");
}

// 5) Retira a aba Corte da lista de abas e o contador de Corte do cabeçalho.
source = source.replace(/\n    \{ id: "corte", label: "Corte", contagem: totalCorte \},/, "");
source = source.replace(/\n  const totalCorte = itens\.filter\(\(i\) => i\.etapa === "corte"\)\.reduce\(\(s, i\) => s \+ i\.qtd, 0\);/, "");
source = source.replace(/\n            <Stat label="corte" value=\{totalCorte\} \/>/, "");

// 6) Remove o bloco visual inteiro da antiga aba Corte.
const inicioAbaCorte = source.indexOf('        {loaded && aba === "corte" && (');
const fimAbaCorte = source.indexOf('        {loaded && aba === "aguardando_sublimacao" && (', inicioAbaCorte);
if (inicioAbaCorte !== -1 && fimAbaCorte !== -1) {
  source = source.slice(0, inicioAbaCorte) + source.slice(fimAbaCorte);
  console.log("NeoCooler: aba Corte removida da interface.");
} else {
  console.log("NeoCooler: bloco visual da aba Corte já não está presente.");
}

// 7) Se alguma lógica antiga tentar abrir "corte", redireciona para a próxima etapa.
replaceOnce(
  'const [aba, setAba] = useState("pre_corte");',
  'const [aba, setAbaOriginal] = useState("pre_corte");\n  const setAba = (valor) => setAbaOriginal(valor === "corte" ? "aguardando_sublimacao" : valor);',
  "redirecionamento de Corte para Aguardando Sublimação"
);

// 8) Ajusta os textos da operação.
source = source.replace(/>Marcar como cortado</g, '>Confirmar corte → Aguardando Sublimação');
source = source.replace(/>Mover p\\/ aguardando sublimação</g, '>Confirmar corte → Aguardando Sublimação');
source = source.replace(/o item passa para a aba Corte\./g, 'o item passa diretamente para Aguardando Sublimação.');
source = source.replace(/Mova itens pela aba Corte\./g, 'Confirme o corte no Pré-Corte.');
source = source.replace(/\(pré-corte -> corte\)/g, '(pré-corte -> aguardando sublimação)');

source += `\n\n${marker}\n`;
fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: fluxo final aplicado: Pré-Corte -> confirmação do Patrick -> Aguardando Sublimação.");
