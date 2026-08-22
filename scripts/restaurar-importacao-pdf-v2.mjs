import fs from "node:fs";

// Corrige o próprio script restaurador antes de executá-lo.
// O restaurador gera código JSX dentro de template strings; qualquer ${...}
// que pertença ao código gerado precisa ser escapado para não ser avaliado
// pelo Node durante o build.
const alvo = "scripts/restaurar-importacao-pdf.mjs";
let source = fs.readFileSync(alvo, "utf8");
source = source.replace(/(?<!\\)\$\{/g, "\\${");
fs.writeFileSync(alvo, source, "utf8");
console.log("NeoCooler: placeholders do restaurador PDF escapados antes do build.");
await import("./restaurar-importacao-pdf.mjs?fixed=" + Date.now());
