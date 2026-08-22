import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const fixes = [
  ["styles.pedidoNumWrap\">", "styles.pedidoNumWrap}>"],
];

let total = 0;
for (const [from, to] of fixes) {
  const count = source.split(from).length - 1;
  if (count) {
    source = source.split(from).join(to);
    total += count;
  }
}

if (total) {
  fs.writeFileSync(path, source, "utf8");
  console.log(`NeoCooler: ${total} correção(ões) de sintaxe JSX aplicada(s).`);
} else {
  console.log("NeoCooler: nenhuma correção de sintaxe JSX necessária.");
}
