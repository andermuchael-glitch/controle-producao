import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

let alterado = false;

const brokenGrid = 'alocGrid: { display: "grid", g\n  };';
const fixedGrid = 'alocGrid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr 0.8fr auto", gap: 8 },\n};';

if (source.includes(brokenGrid)) {
  source = source.replace(brokenGrid, fixedGrid);
  alterado = true;
  console.log("NeoCooler: truncated alocGrid style repaired before Vite build.");
}

const brokenLimpar = 'setConfirmarLimpeza(false);const exportarXLSX = () => {';
const fixedLimpar = 'setConfirmarLimpeza(false);\n  };\n\n  const exportarXLSX = () => {';

if (source.includes(brokenLimpar)) {
  source = source.replace(brokenLimpar, fixedLimpar);
  alterado = true;
  console.log("NeoCooler: missing closing brace in limparTudo repaired before Vite build.");
}

if (alterado) {
  fs.writeFileSync(path, source, "utf8");
} else {
  console.log("NeoCooler: no known App.jsx build corruption found; continuing build.");
}
