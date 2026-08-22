import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const replacements = [
  ["style={styles.pedidoNumWrap\">", "style={styles.pedidoNumWrap}>"]
];

let changed = false;
for (const [from, to] of replacements) {
  if (source.includes(from)) {
    source = source.split(from).join(to);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: JSX do pedido corrigido antes do build.");
} else {
  console.log("NeoCooler: nenhum erro JSX alvo encontrado.");
}
