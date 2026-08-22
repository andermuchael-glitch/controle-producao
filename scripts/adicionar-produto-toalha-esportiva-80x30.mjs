import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
const marker = "// PRODUTO_TOALHA_ESPORTIVA_80X30_V1";
if (source.includes(marker)) process.exit(0);

const alvo = 'const PRODUTOS = [';
if (!source.includes(alvo)) throw new Error("NeoCooler: lista PRODUTOS não encontrada.");

source = source.replace(
  'const PRODUTOS = [',
  `${marker}\nconst PRODUTOS = ["TOALHA ESPORTIVA 80X30",`
);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: TOALHA ESPORTIVA 80X30 adicionada à lista de produtos.");
