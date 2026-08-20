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

const especiaisJson = JSON.stringify(especiais);
const anchor = 'const CORTADORES = ["Patrick"];';
if (!source.includes("FLUXO_SEM_CORTE_ESPECIAIS_V7") && source.includes(anchor)) {
  source = source.replace(anchor, `${anchor}\n\n// FLUXO_SEM_CORTE_ESPECIAIS_V7\nconst PRODUTOS_COSTURA_ANTES_SUBLIMACAO = ${especiaisJson};\nconst precisaCosturaAntesSublimacao = (nome) => PRODUTOS_COSTURA_ANTES_SUBLIMACAO.includes(String(nome || "").trim().toUpperCase());`);
}

if (!source.includes('"TOALHA PERSONALIZADO 70X40"')) {
  source = source.replace("const PRODUTOS = [", 'const PRODUTOS = ["TOALHA PERSONALIZADO 70X40",');
}
if (!source.includes('"TOALHA 80X30"')) {
  source = source.replace("const PRODUTOS = [", 'const PRODUTOS = ["TOALHA 80X30",');
}

// Corte não existe mais no fluxo.
source = source.replace(/const ETAPAS = \[[^\n]*\];/, 'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];');
source = source.replace(/\n\s*corte:\s*"Corte",/, "\n");

// NORMALIZACAO_DUPLICATAS_PRE_CORTE_V1
// Remove apenas duplicações inequívocas: registro duplicado no Pré-Corte ou
// Pré-Corte com a mesma quantidade do mesmo pedido/produto já existente depois.
// Quantidades diferentes são preservadas para não apagar produção parcial legítima.
if (!source.includes("NORMALIZACAO_DUPLICATAS_PRE_CORTE_V1")) {
  const storageAnchor = 'const AUDIT_ADMIN_EMAIL = "andermuchael@gmail.com";';
  const normalizador = `\n// NORMALIZACAO_DUPLICATAS_PRE_CORTE_V1\nconst normalizarItensPersistidos = (lista) => {\n  const base = (Array.isArray(lista) ? lista : []).map((i) => {\n    const nome = String(i.produto || "").trim().toUpperCase();\n    let etapa = i.etapa || "costura";\n    if (etapa === "corte") {\n      etapa = precisaCosturaAntesSublimacao(nome) || String(i.pedido) === "11089" ? "aguardando_costura" : "aguardando_sublimacao";\n    }\n    return { ...i, etapa, equipe: i.equipe || "Não decidido", feito: i.feito ?? false, conferido: i.conferido ?? false };\n  });\n  const vistos = new Set();\n  const semExatos = base.filter((i) => {\n    const chave = [i.pedido, String(i.produto || "").trim().toUpperCase(), i.etapa, i.qtd, i.cor || "", i.sublimador || "", i.equipe || ""].join("||");\n    if (vistos.has(chave)) return false;\n    vistos.add(chave);\n    return true;\n  });\n  const posteriores = new Set(semExatos.filter((i) => i.etapa !== "pre_corte").map((i) => `${i.pedido}||${String(i.produto || "").trim().toUpperCase()}||${Number(i.qtd) || 0}`));\n  return semExatos.filter((i) => {\n    if (i.etapa !== "pre_corte") return true;\n    const chave = `${i.pedido}||${String(i.produto || "").trim().toUpperCase()}||${Number(i.qtd) || 0}`;\n    return !posteriores.has(chave);\n  });\n};\n`;
  if (source.includes(storageAnchor)) source = source.replace(storageAnchor, storageAnchor + normalizador);
}

// Impede relançamento do mesmo pedido/produto em qualquer etapa.
const antigoCheck = 'const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");';
const novoCheck = 'const existente = itens.find((i) => i.pedido === numero && String(i.produto || "").trim().toUpperCase() === String(produto || "").trim().toUpperCase());';
if (source.includes(antigoCheck)) source = source.replace(antigoCheck, novoCheck);
source = source.replace('setErro(`O pedido #${numero} já possui ${produto} no pré-corte. Para evitar duplicação, altere a quantidade no lançamento existente.`);', 'setErro(`O pedido #${numero} já possui ${produto} em outra etapa. Para evitar duplicação, altere o lançamento existente.`);');

// Carregamento: normaliza e persiste no Firebase antes de exibir as abas.
const antigoCarregamento = `const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa || "costura",\n            equipe: i.equipe || "Não decidido",\n            feito: i.feito ?? false,\n            conferido: i.conferido ?? false,\n          }));\n          setItens(migrados);`;
const novoCarregamento = `const migrados = normalizarItensPersistidos(carregados);\n          setItens(migrados);\n          if (JSON.stringify(migrados) !== JSON.stringify(carregados)) {\n            salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});\n          }`;
if (source.includes(antigoCarregamento)) {
  source = source.replace(antigoCarregamento, novoCarregamento);
  log("normalização persistente de duplicações aplicada ao carregamento.");
}

// Remove qualquer bloco visual da aba Corte que ainda tenha sobrevivido.
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
  log("fluxo sem Corte + limpeza de duplicações finalizado.");
} else {
  log("fluxo sem Corte + limpeza de duplicações já estava aplicado.");
}
