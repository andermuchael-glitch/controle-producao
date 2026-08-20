import fs from "node:fs";

const file = "src/App.jsx";
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

const PRODUTOS_COSTURA_ANTES_SUBLIMACAO = [
  "TOALHA PERSONALIZADO 70X40",
  "TOALHA 80X30",
  "TOALHA C/ CAPUZ G",
  "TOALHA C/ CAPUZ M",
];
const helperMarker = "// FLUXO_TOALHAS_COSTURA_V2";

// Garante os produtos usados no fluxo especial no cadastro.
const produtosExtras = [
  "TOALHA PERSONALIZADO 70X40",
  "TOALHA 80X30",
];
if (source.includes("const PRODUTOS = [")) {
  for (const produto of produtosExtras) {
    if (!source.includes(`"${produto}"`)) {
      source = source.replace("const PRODUTOS = [", `const PRODUTOS = ["${produto}",`);
      log(`${produto} adicionado à lista de produtos.`);
    }
  }
}

// Helper único para decidir quais produtos precisam passar pela Costura
// antes de voltar para Aguardando Sublimação.
if (!source.includes(helperMarker)) {
  const anchor = 'const CORTADORES = ["Patrick"];';
  if (!source.includes(anchor)) throw new Error("NeoCooler: âncora dos cortadores não encontrada.");
  const helper = `${anchor}\n\n${helperMarker}\nconst PRODUTOS_COSTURA_ANTES_SUBLIMACAO = ${JSON.stringify(PRODUTOS_COSTURA_ANTES_SUBLIMACAO)};\nconst precisaCosturaAntesSublimacao = (produtoNome) => PRODUTOS_COSTURA_ANTES_SUBLIMACAO.includes(String(produtoNome || "").trim().toUpperCase());`;
  source = source.replace(anchor, helper);
}

// Migra registros antigos que ainda estejam na antiga etapa Corte.
// O pedido 11089, que estava no Corte, é tratado como item de toalha e vai
// para Aguardando Costura. Os demais itens antigos de Corte vão direto para
// Aguardando Sublimação.
const oldLoadRegex = /etapa:\s*i\.etapa\s*===\s*["']corte["']\s*\?\s*["']aguardando_sublimacao["']\s*:\s*\(i\.etapa\s*\|\|\s*["']costura["']\),/;
const oldLoadReplacement = 'etapa: i.etapa === "corte" ? ((String(i.pedido) === "11089" || precisaCosturaAntesSublimacao(i.produto)) ? "aguardando_costura" : "aguardando_sublimacao") : (i.etapa || "costura"),';
if (oldLoadRegex.test(source)) {
  source = source.replace(oldLoadRegex, oldLoadReplacement);
} else if (source.includes('etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "costura"),')) {
  source = source.replace(
    'etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "costura"),',
    oldLoadReplacement,
  );
} else if (source.includes('etapa: i.etapa || "costura",')) {
  source = source.replace('etapa: i.etapa || "costura",', oldLoadReplacement);
}

// No carregamento, persiste a migração para o Firebase. Assim o 11089 e os
// itens antigos não reaparecem na antiga etapa Corte em outro dispositivo.
if (!source.includes("FLUXO_MIGRACAO_CORTE_PERSISTENTE_V2")) {
  const loadLine = "          setItens(migrados);";
  if (source.includes(loadLine)) {
    const replacement = `          // FLUXO_MIGRACAO_CORTE_PERSISTENTE_V2\n          const migracaoNecessaria = carregados.some((item, index) => item.etapa !== migrados[index]?.etapa);\n          setItens(migrados);\n          if (migracaoNecessaria) salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});`;
    source = source.replace(loadLine, replacement);
  }
}

// Patrick confirma o que realmente foi cortado. A antiga etapa Corte não é
// mais criada. Toalhas especiais entram em Aguardando Costura; os demais
// produtos entram diretamente em Aguardando Sublimação.
const marcarRegex = /  const marcarCortado = \(pedidoNum, produtoNome, restante\) => \{[\s\S]*?\n  \};/;
const marcarNovo = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const destino = precisaCosturaAntesSublimacao(produtoNome) ? "aguardando_costura" : "aguardando_sublimacao";\n    const novo = {\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: destino,\n      origemPreCorte: true,\n      cortador: "Patrick",\n      dataCorte: f.data || hoje(),\n      criadoEm: Date.now(),\n    };\n    salvar([...itens, novo]);\n    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restante - qtdNum, data: f.data } }));\n  };`;
if (marcarRegex.test(source)) {
  source = source.replace(marcarRegex, marcarNovo);
  log("Pré-Corte configurado: corte confirmado não cria mais registros na etapa Corte.");
}

// Costura concluída: as quatro toalhas especiais retornam para Aguardando
// Sublimação. Os demais itens de Costura seguem para Separação.
const moverRegex = /  const moverPedidoParaSeparacao = \(numero\) => \{[\s\S]*?\n  \};/;
const moverNovo = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => {\n      if (i.pedido !== numero || i.etapa !== "costura") return i;\n      return precisaCosturaAntesSublimacao(i.produto)\n        ? { ...i, etapa: "aguardando_sublimacao", feito: false, conferido: false }\n        : { ...i, etapa: "separacao", feito: false, conferido: false };\n    }));\n  };`;
if (moverRegex.test(source)) {
  source = source.replace(moverRegex, moverNovo);
  log("Costura configurada para devolver as quatro toalhas à Aguardando Sublimação.");
}

// Alguns builds anteriores podem usar onFinalizar em vez de
// moverPedidoParaSeparacao. Ajusta também essa transição quando ela existir.
const finalizarRegex = /  const onFinalizar = \(numero\) => \{[\s\S]*?\n  \};/;
if (!moverRegex.test(original) && finalizarRegex.test(source)) {
  const finalizarAtual = source.match(finalizarRegex)?.[0] || "";
  if (!finalizarAtual.includes("precisaCosturaAntesSublimacao")) {
    const corpoNovo = `  const onFinalizar = (numero) => {\n    salvar(itens.map((i) => {\n      if (i.pedido !== numero || i.etapa !== "costura") return i;\n      return precisaCosturaAntesSublimacao(i.produto)\n        ? { ...i, etapa: "aguardando_sublimacao", feito: false, conferido: false }\n        : { ...i, etapa: "separacao", feito: false, conferido: false };\n    }));\n  };`;
    source = source.replace(finalizarRegex, corpoNovo);
  }
}

// Remove Corte do conjunto de etapas e do layout, mesmo se algum script
// anterior deixar uma referência residual.
source = source.replace(
  'const ETAPAS = ["pre_corte", "corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
);
source = source.replace(/\s*corte:\s*["']Corte["'],/g, "");
source = source.replace(/\s*<Stat label=["']corte["'] value=\{totalCorte\} \/>/g, "");
source = source.replace(/\s*\{\s*id:\s*["']corte["'],\s*label:\s*["']Corte["'],\s*contagem:\s*\{totalCorte\}\s*\},/g, "");
source = source.replace(/\s*\{id:\s*["']corte["'][\s\S]*?\},/g, "");

const corteBlockStart = '        {loaded && aba === "corte" && (\n';
const corteBlockEnd = '        {loaded && aba === "aguardando_sublimacao" && (\n';
const start = source.indexOf(corteBlockStart);
const end = source.indexOf(corteBlockEnd, start + corteBlockStart.length);
if (start >= 0 && end > start) {
  source = source.slice(0, start) + source.slice(end);
  log("bloco visual da aba Corte removido.");
}

source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");
source = source.replaceAll("item passa para a aba Corte", "item passa diretamente para a etapa definida pelo produto");
source = source.replaceAll("Mova itens pela aba Corte.", "Os itens entram automaticamente na próxima etapa quando Patrick confirma o corte.");

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("fluxo atualizado: sem aba Corte; 11089 migrado conforme a regra; 70x40, 80x30, Capuz G e Capuz M passam pela Costura antes da Sublimação.");
} else {
  log("fluxo final já estava aplicado.");
}
