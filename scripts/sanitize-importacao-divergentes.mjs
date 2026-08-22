import fs from "node:fs";

const path = "scripts/ajuste-importacao-divergentes.mjs";
let source = fs.readFileSync(path, "utf8");

const proteger = (inicio, fim) => {
  const a = source.indexOf(inicio);
  if (a === -1) return;
  const b = source.indexOf(fim, a + inicio.length);
  if (b === -1) return;
  const bloco = source.slice(a, b);
  source = source.slice(0, a) + bloco.replace(/(?<!\\)\$\{/g, "\\${") + source.slice(b);
};

proteger("const addBloco = `", "`;\nsource = source.slice(0, addInicio)");
proteger("const importBloco = `", "`;\nsource = source.slice(0, importInicio)");
proteger("const modal = `", "`;\n  source = source.replace(modalAnchor");

// Manter a âncora original: o importador V4 substitui o importador restaurado
// até a função exportarXLSX existente no App.jsx.

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: templates do restaurador PDF protegidos.");
