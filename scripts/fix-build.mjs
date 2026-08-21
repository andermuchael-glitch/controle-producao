import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const fixes = [
  [
    "limparTudo",
    'setConfirmarLimpeza(false);const exportarXLSX = () => {',
    'setConfirmarLimpeza(false);\n  };\n\n  const exportarXLSX = () => {'
  ]
];

let changed = false;
for (const [name, from, to] of fixes) {
  if (source.includes(from)) {
    source = source.replace(from, to);
    changed = true;
    console.log(`NeoCooler: correção ${name} aplicada.`);
  }
}

if (changed) fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: preparação do build concluída.");
