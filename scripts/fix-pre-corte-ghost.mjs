import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
const marker = "// PRE_CORTE_GHOST_FIX_V1";

if (source.includes(marker)) {
  console.log("NeoCooler: correção dos itens fantasmas do Pré-Corte já aplicada.");
  process.exit(0);
}

const ocultandoPorMeta = 'const itensPre = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte);';
const somenteEtapa = 'const itensPre = itens.filter((i) => i.etapa === "pre_corte");';

if (source.includes(ocultandoPorMeta)) {
  source = source.replace(ocultandoPorMeta, somenteEtapa);
} else if (!source.includes(somenteEtapa)) {
  throw new Error("NeoCooler: agregação do Pré-Corte não encontrada.");
}

const totalComExclusao = 'const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte).reduce((s, i) => s + i.qtd, 0);';
const totalNormal = 'const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte").reduce((s, i) => s + i.qtd, 0);';
if (source.includes(totalComExclusao)) source = source.replace(totalComExclusao, totalNormal);

source = source.replace(
  '// ---------- PRÉ-CORTE: agrupado por pedido, com quanto já foi cortado ----------',
  `${marker}\n  // ---------- PRÉ-CORTE: agrupado por pedido, com quanto já foi cortado ----------`
);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: itens que realmente estão em etapa pre_corte agora aparecem no Pré-Corte, independentemente de metadados antigos de exclusão.");
