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

// NORMALIZACAO_DUPLICATAS_PRE_CORTE_V2
// Remove apenas duplicações inequívocas e migra registros antigos de Corte.
// Quantidades diferentes são preservadas para não apagar produção parcial legítima.
if (!source.includes("NORMALIZACAO_DUPLICATAS_PRE_CORTE_V2")) {
  const storageAnchor = 'const AUDIT_ADMIN_EMAIL = "andermuchael@gmail.com";';
  const normalizador = `
// NORMALIZACAO_DUPLICATAS_PRE_CORTE_V2
const normalizarItensPersistidos = (lista) => {
  const base = (Array.isArray(lista) ? lista : []).map((i) => {
    const nome = String(i.produto || "").trim().toUpperCase();
    let etapa = i.etapa || "costura";
    if (etapa === "corte") {
      etapa = precisaCosturaAntesSublimacao(nome) || String(i.pedido) === "11089" ? "aguardando_costura" : "aguardando_sublimacao";
    }
    return { ...i, etapa, equipe: i.equipe || "Não decidido", feito: i.feito ?? false, conferido: i.conferido ?? false };
  });

  const vistos = new Set();
  const semExatos = base.filter((i) => {
    const chave = [i.pedido, String(i.produto || "").trim().toUpperCase(), i.etapa, i.qtd, i.cor || "", i.sublimador || "", i.equipe || ""].join("||");
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });

  // Se o mesmo pedido/produto/quantidade já existe em etapa posterior,
  // o registro equivalente do Pré-Corte é uma duplicação e deve sair.
  const posteriores = new Set(
    semExatos
      .filter((i) => i.etapa !== "pre_corte")
      .map((i) => `\${i.pedido}||\${String(i.produto || "").trim().toUpperCase()}||\${Number(i.qtd) || 0}`)
  );

  return semExatos.filter((i) => {
    if (i.etapa !== "pre_corte") return true;
    const chave = `\${i.pedido}||\${String(i.produto || "").trim().toUpperCase()}||\${Number(i.qtd) || 0}`;
    return !posteriores.has(chave);
  });
};
`;
  if (source.includes(storageAnchor)) source = source.replace(storageAnchor, storageAnchor + normalizador);
}

// Impede relançamento do mesmo pedido/produto em qualquer etapa.
const antigoCheck = 'const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");';
const novoCheck = 'const existente = itens.find((i) => i.pedido === numero && String(i.produto || "").trim().toUpperCase() === String(produto || "").trim().toUpperCase());';
if (source.includes(antigoCheck)) source = source.replace(antigoCheck, novoCheck);
source = source.replace('setErro(`O pedido #${numero} já possui ${produto} no pré-corte. Para evitar duplicação, altere a quantidade no lançamento existente.`);', 'setErro(`O pedido #${numero} já possui ${produto} em outra etapa. Para evitar duplicação, altere o lançamento existente.`);');

// Carregamento: normaliza e persiste no Firebase antes de exibir as abas.
const antigoCarregamento = `const migrados = carregados.map((i) => ({
            ...i,
            etapa: i.etapa || "costura",
            equipe: i.equipe || "Não decidido",
            feito: i.feito ?? false,
            conferido: i.conferido ?? false,
          }));
          setItens(migrados);`;
const novoCarregamento = `const migrados = normalizarItensPersistidos(carregados);
          setItens(migrados);
          if (JSON.stringify(migrados) !== JSON.stringify(carregados)) {
            salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});
          }`;
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
