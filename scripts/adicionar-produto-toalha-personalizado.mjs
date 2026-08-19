import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
const marker = "// PRODUTO_TOALHA_PERSONALIZADO_70X40_V1";
if (source.includes(marker)) {
  console.log("NeoCooler: TOALHA PERSONALIZADO 70X40 já está na lista de produtos.");
  process.exit(0);
}

const alvo = 'const PRODUTOS = [';
if (!source.includes(alvo)) {
  throw new Error("NeoCooler: lista PRODUTOS não encontrada.");
}

source = source.replace(
  'const PRODUTOS = [',
  'const PRODUTOS = ["TOALHA PERSONALIZADO 70X40",'
);
source = source.replace(
  'const PRODUTOS = ["TOALHA PERSONALIZADO 70X40",',
  `// PRODUTO_TOALHA_PERSONALIZADO_70X40_V1\nconst PRODUTOS = ["TOALHA PERSONALIZADO 70X40",`
);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: TOALHA PERSONALIZADO 70X40 adicionada à lista de produtos.");
