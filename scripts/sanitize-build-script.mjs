import fs from "node:fs";

const fixBuildPath = "scripts/fix-build.mjs";
let fixBuild = fs.readFileSync(fixBuildPath, "utf8");

// fix-build.mjs contains a generated JSX string. The font family has single quotes
// inside an outer single-quoted JavaScript string, so they must be escaped before
// Node parses fix-build.mjs.
const quebrado = 'fontFamily: "\\'Helvetica Neue\\', Arial, sans-serif"';
const corrigido = 'fontFamily: "\\\\\\'Helvetica Neue\\\\\\', Arial, sans-serif"';

if (fixBuild.includes(quebrado)) {
  fixBuild = fixBuild.replace(quebrado, corrigido);
  fs.writeFileSync(fixBuildPath, fixBuild, "utf8");
  console.log("NeoCooler: corrigida a string de fontFamily no fix-build.");
} else {
  console.log("NeoCooler: fix-build já está corrigido ou não contém a string problemática.");
}

// ajuste-cores.mjs gera JSX dentro de template literals. Além de ${...},
// havia template literals internos que fechavam prematuramente o template externo.
const ajusteCoresPath = "scripts/ajuste-cores.mjs";
if (fs.existsSync(ajusteCoresPath)) {
  let texto = fs.readFileSync(ajusteCoresPath, "utf8");
  let mudou = false;

  const substituicoes = [
    ['`· ${it.cor}`', '"· " + it.cor'],
    ['`restam ${it.qtd}un para distribuir`', '"restam " + it.qtd + "un para distribuir"'],
  ];

  for (const [from, to] of substituicoes) {
    if (texto.includes(from)) {
      texto = texto.split(from).join(to);
      mudou = true;
    }
  }

  // Escape only ${...} that is not already escaped. These are meant to survive
  // the generator and become JSX expressions in the resulting App.jsx.
  const novoTexto = texto.replace(/(?<!\\)\$\{/g, "\\${");
  if (novoTexto !== texto) {
    texto = novoTexto;
    mudou = true;
  }

  if (mudou) {
    fs.writeFileSync(ajusteCoresPath, texto, "utf8");
    console.log("NeoCooler: corrigidos template literals aninhados em ajuste-cores.");
  }
}

// retroativo-costura também gera JSX dentro de template literals.
const retroativoPath = "scripts/retroativo-costura.mjs";
if (fs.existsSync(retroativoPath)) {
  let texto = fs.readFileSync(retroativoPath, "utf8");
  const novoTexto = texto.replace(/(?<!\\)\$\{/g, "\\${");
  if (novoTexto !== texto) {
    fs.writeFileSync(retroativoPath, novoTexto, "utf8");
    console.log("NeoCooler: corrigidas expressões JSX aninhadas em retroativo-costura.");
  }
}
