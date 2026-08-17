import fs from "node:fs";

// ajuste-cores.mjs gera JSX dentro de template literals. Alguns trechos tinham
// template literals internos e fechavam prematuramente o template externo.
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

  // Preserve JSX expressions for the generated App.jsx instead of evaluating
  // them while Node parses this generator.
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
