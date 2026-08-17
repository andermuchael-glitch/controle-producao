import fs from "node:fs";

const path = "scripts/fix-build.mjs";
let source = fs.readFileSync(path, "utf8");

// fix-build.mjs contains a generated JSX string. The font family has single quotes
// inside an outer single-quoted JavaScript string, so they must be escaped before
// Node parses fix-build.mjs.
const quebrado = 'fontFamily: "\'Helvetica Neue\', Arial, sans-serif"';
const corrigido = 'fontFamily: "\\\'Helvetica Neue\\\', Arial, sans-serif"';

if (source.includes(quebrado)) {
  source = source.replace(quebrado, corrigido);
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: corrigida a string de fontFamily no fix-build.");
} else {
  console.log("NeoCooler: fix-build já está corrigido ou não contém a string problemática.");
}
