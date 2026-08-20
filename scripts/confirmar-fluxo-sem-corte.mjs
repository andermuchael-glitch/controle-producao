import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

const especiais = [
  "TOALHA PERSONALIZADO 70X40",
  "TOALHA 80X30",
  "TOALHA C/ CAPUZ G",
  "TOALHA C/ CAPUZ M",
];

// Produtos especiais: após o corte vão para Costura; depois da Costura
// retornam para Aguardando Sublimação.
const especiaisJson = JSON.stringify(especiais);
if (!source.includes("FLUXO_SEM_CORTE_ESPECIAIS_V6")) {
  const anchor = 'const CORTADORES = ["Patrick"];';
  if (source.includes(anchor)) {
    source = source.replace(anchor, `${anchor}\n\n// FLUXO_SEM_CORTE_ESPECIAIS_V6\nconst PRODUTOS_COSTURA_ANTES_SUBLIMACAO = ${especiaisJson};\nconst precisaCosturaAntesSublimacao = (nome) => PRODUTOS_COSTURA_ANTES_SUBLIMACAO.includes(String(nome || "").trim().toUpperCase());`);
  }
}

// Cadastro dos produtos que precisam aparecer no lançamento manual.
if (!source.includes('"TOALHA PERSONALIZADO 70X40"')) {
  source = source.replace("const PRODUTOS = [", 'const PRODUTOS = ["TOALHA PERSONALIZADO 70X40",');
}
if (!source.includes('"TOALHA 80X30"')) {
  source = source.replace("const PRODUTOS = [", 'const PRODUTOS = ["TOALHA 80X30",');
}

// A etapa Corte não existe mais no fluxo novo.
source = source.replace(/const ETAPAS = \[[^\n]*\];/, 'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];');
source = source.replace(/\n\s*corte:\s*"Corte",/, "");

// Migração dos dados existentes. Isso acontece no carregamento e é gravado
// novamente no Firebase, portanto o pedido 11089 não fica preso em Corte.
const oldMapRe = /const migrados = carregados\.map\(\(i\) => \(\{[\s\S]*?\n\s*\}\)\);\n\s*setItens\(migrados\);/;
const newMap = `const migrados = carregados.map((i) => {\n            const nome = String(i.produto || "").trim().toUpperCase();\n            let etapa = i.etapa || "costura";\n            if (etapa === "corte") {\n              etapa = precisaCosturaAntesSublimacao(nome) || String(i.pedido) === "11089"\n                ? "aguardando_costura"\n                : "aguardando_sublimacao";\n            }\n            return { ...i, etapa, equipe: i.equipe || "Não decidido", feito: i.feito ?? false, conferido: i.conferido ?? false };\n          });\n          setItens(migrados);\n          if (JSON.stringify(migrados) !== JSON.stringify(carregados)) {\n            salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});\n          }`;
if (oldMapRe.test(source)) {
  source = source.replace(oldMapRe, newMap);
  log("migração runtime dos itens antigos de Corte corrigida.");
} else if (!source.includes("if (etapa === \"corte\")")) {
  log("migração runtime não localizada; build continua sem falhar.");
}

// Patrick confirma o corte no Pré-Corte. Produtos especiais seguem para Costura;
// os demais seguem diretamente para Aguardando Sublimação.
const marcarRe = /const marcarCortado = \(pedidoNum, produtoNome, restante\) => \{[\s\S]*?\n\s*\};/;
const marcarNovo = `const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const destino = precisaCosturaAntesSublimacao(produtoNome) ? "aguardando_costura" : "aguardando_sublimacao";\n    const novo = { id: uid(), pedido: pedidoNum, produto: produtoNome, qtd: qtdNum, etapa: destino, cortador: "Patrick", dataCorte: f.data || hoje(), criadoEm: Date.now() };\n    salvar([...itens, novo]);\n    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restante - qtdNum, data: f.data } }));\n  };`;
if (marcarRe.test(source)) {
  source = source.replace(marcarRe, marcarNovo);
  log("Patrick agora confirma corte e envia para a próxima etapa.");
}

// Remove a aba Corte de qualquer definição de ABAS que tenha sobrevivido.
source = source.replace(/\s*\{ id: "corte", label: "Corte", contagem: totalCorte \},/g, "");
source = source.replace(/\s*\{ id: "corte", label: "Corte", contagem: totalCorte \}/g, "");

// Remove o bloco visual da aba Corte, se existir.
const corteStart = source.indexOf('        {loaded && aba === "corte" && (');
const proxAba = source.indexOf('        {loaded && aba === "aguardando_sublimacao" && (', corteStart);
if (corteStart >= 0 && proxAba > corteStart) {
  source = source.slice(0, corteStart) + source.slice(proxAba);
  log("bloco visual da aba Corte removido.");
}

source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");
source = source.replaceAll("item passa para a aba Corte", "item passa diretamente para a próxima etapa");
source = source.replaceAll("Mova itens pela aba Corte.", "Os itens entram automaticamente na próxima etapa quando Patrick confirma o corte.");

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("fluxo sem Corte finalizado com segurança.");
} else {
  log("fluxo sem Corte já estava aplicado.");
}
