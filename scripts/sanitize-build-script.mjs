import fs from "node:fs";

const fixBuildPath = "scripts/fix-build.mjs";
let fixBuild = fs.readFileSync(fixBuildPath, "utf8");

// fix-build.mjs contains a generated JSX string. The font family has single quotes
// inside an outer single-quoted JavaScript string, so they must be escaped before
// Node parses fix-build.mjs.
const quebrado = 'fontFamily: "\'Helvetica Neue\', Arial, sans-serif"';
const corrigido = 'fontFamily: "\\\'Helvetica Neue\\\', Arial, sans-serif"';

if (fixBuild.includes(quebrado)) {
  fixBuild = fixBuild.replace(quebrado, corrigido);
  fs.writeFileSync(fixBuildPath, fixBuild, "utf8");
  console.log("NeoCooler: corrigida a string de fontFamily no fix-build.");
} else {
  console.log("NeoCooler: fix-build já está corrigido ou não contém a string problemática.");
}

// Alguns scripts geram JSX dentro de template literals. Expressões ${...}
// destinadas ao JSX precisam ser escapadas no script gerador; caso contrário,
// o próprio Node tenta interpretá-las durante o build e gera "Unexpected identifier '$'".
const geradores = [
  {
    path: "scripts/ajuste-cores.mjs",
    expressões: ["${pct}", "${it.cor}"],
  },
  {
    path: "scripts/retroativo-costura.mjs",
    expressões: ["${destinoLancamento}"],
  },
];

for (const item of geradores) {
  if (!fs.existsSync(item.path)) continue;
  let texto = fs.readFileSync(item.path, "utf8");
  let mudou = false;
  for (const expressao of item.expressões) {
    const escapada = "\\" + expressao;
    if (texto.includes(expressao) && !texto.includes(escapada)) {
      texto = texto.split(expressao).join(escapada);
      mudou = true;
    }
  }
  if (mudou) {
    fs.writeFileSync(item.path, texto, "utf8");
    console.log("NeoCooler: corrigidas expressões JSX aninhadas em " + item.path + ".");
  }
}
