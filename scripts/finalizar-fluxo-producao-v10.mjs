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

// Garante que os produtos existam na lista do lançamento manual.
const produtosAnchor = 'const PRODUTOS = [';
if (source.includes(produtosAnchor)) {
  for (const produto of especiais) {
    if (!source.includes(`"${produto}"`)) {
      source = source.replace(produtosAnchor, `${produtosAnchor}"${produto}",`);
    }
  }
}

// A etapa Corte deixa de existir no fluxo visual.
source = source.replace(
  /const ETAPAS = \[[^\]]*\];/s,
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];'
);
source = source.replace(/\n\s*corte:\s*"Corte",?/g, "\n");

// Regras de produtos que precisam passar pela costura antes da sublimação.
const regraAnchor = 'const AUDIT_ADMIN_EMAIL = "andermuchael@gmail.com";';
if (!source.includes("FLUXO_SEM_CORTE_V10")) {
  const regra = [
    "",
    "// FLUXO_SEM_CORTE_V10",
    `const PRODUTOS_COSTURA_ANTES_SUBLIMACAO = ${JSON.stringify(especiais)};`,
    'const precisaCosturaAntesSublimacao = (nome) => PRODUTOS_COSTURA_ANTES_SUBLIMACAO.includes(String(nome || "").trim().toUpperCase());',
    "",
    "const normalizarFluxoSemCorte = (lista) => {",
    "  const entrada = Array.isArray(lista) ? lista : [];",
    "  const vistos = new Set();",
    "  const resultado = [];",
    "  for (const bruto of entrada) {",
    "    const item = { ...bruto, qtd: Number(bruto.qtd) || 0 };",
    "    if (item.qtd <= 0) continue;",
    "    const nome = String(item.produto || \"\").trim().toUpperCase();",
    "    if (item.etapa === \"corte\") item.etapa = precisaCosturaAntesSublimacao(nome) ? \"aguardando_costura\" : \"aguardando_sublimacao\";",
    "    const chave = [String(item.pedido), nome, item.etapa, item.qtd, item.cor || \"\", item.sublimador || \"\", item.equipe || \"\", item.dataCorte || \"\", item.dataSublimacao || \"\"].join(\"||\");",
    "    if (vistos.has(chave)) continue;",
    "    vistos.add(chave);",
    "    resultado.push(item);",
    "  }",
    "  return resultado;",
    "};",
  ].join("\n");
  if (source.includes(regraAnchor)) source = source.replace(regraAnchor, regraAnchor + regra);
}

// Normaliza os dados assim que chegam do Firebase/localStorage. Corrige
// registros antigos da etapa Corte e elimina somente duplicações idênticas.
const estadoAnchor = '  const [itens, setItens] = useState([]);';
if (!source.includes("normalizarFluxoSemCorte(itens)")) {
  const efeito = [
    "",
    "  useEffect(() => {",
    "    if (!Array.isArray(itens) || !itens.length) return;",
    "    const normalizados = normalizarFluxoSemCorte(itens);",
    "    if (JSON.stringify(normalizados) !== JSON.stringify(itens)) {",
    "      setItens(normalizados);",
    "      salvarValor(STORAGE_KEY, JSON.stringify(normalizados)).catch(() => {});",
    "    }",
    "  }, [itens]);",
  ].join("\n");
  if (source.includes(estadoAnchor)) source = source.replace(estadoAnchor, estadoAnchor + efeito);
}

// Textos do fluxo antigo.
source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");
source = source.replaceAll("Enviar p/ corte", "Marcar como cortado");
source = source.replaceAll("Enviar para corte", "Marcar como cortado");

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("fluxo sem Corte V10 aplicado com sucesso.");
} else {
  log("fluxo sem Corte V10: nenhuma alteração necessária.");
}
