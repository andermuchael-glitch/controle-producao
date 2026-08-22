import fs from "node:fs";

const path = "scripts/ajuste-importacao-divergentes.mjs";
let source = fs.readFileSync(path, "utf8");

const antigo = "  const modalAnchor = '        {confirmarLimpeza && (';";
const novo = "  const modalAnchor = '        {erro && <p style={';";

if (source.includes(antigo)) {
  source = source.replace(antigo, novo);
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: âncora do modal de importação ajustada.");
} else if (source.includes(novo)) {
  console.log("NeoCooler: âncora do modal de importação já ajustada.");
} else {
  throw new Error("NeoCooler: não foi possível localizar a âncora do modal de importação.");
}
