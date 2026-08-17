import fs from "node:fs";

function sanitizarGerador(path, marcadorInicio, marcadorFim) {
  if (!fs.existsSync(path)) return;
  let texto = fs.readFileSync(path, "utf8");
  const inicio = texto.indexOf(marcadorInicio);
  if (inicio === -1) return;
  const conteudoInicio = inicio + marcadorInicio.length;
  const fim = texto.indexOf(marcadorFim, conteudoInicio);
  if (fim === -1) return;

  let miolo = texto.slice(conteudoInicio, fim);
  miolo = miolo.replace(/(?<!\\)`/g, "\\`");
  miolo = miolo.replace(/(?<!\\)\$\{/g, "\\${");

  const novoTexto = texto.slice(0, conteudoInicio) + miolo + texto.slice(fim);
  if (novoTexto !== texto) {
    fs.writeFileSync(path, novoTexto, "utf8");
    console.log(`NeoCooler: template JSX sanitizado em ${path}.`);
  }
}

// ajuste-cores.mjs: large generated JSX template.
sanitizarGerador(
  "scripts/ajuste-cores.mjs",
  "const novo = `",
  "`;\n  source = source.slice(0, inicio) + novo + source.slice(fim);"
);

// retroativo-costura.mjs: generated JSX blocks.
const retroativo = "scripts/retroativo-costura.mjs";
sanitizarGerador(
  retroativo,
  "const novo = `",
  "`;\n  source = source.slice(0, inicio) + novo + source.slice(fim);"
);
sanitizarGerador(
  retroativo,
  "const campoDestinoAtual = `",
  "`;\nconst campoDestinoNovo = `"
);
sanitizarGerador(
  retroativo,
  "const campoDestinoNovo = `",
  "`;\nsubstituir(\"campoHistoricoSublimacao\""
);

// Preserve the earlier font-family safeguard.
const fixBuildPath = "scripts/fix-build.mjs";
if (fs.existsSync(fixBuildPath)) {
  let texto = fs.readFileSync(fixBuildPath, "utf8");
  const antigo = "Helvetica Neue";
  const linhas = texto.split("\n");
  const novo = linhas.map((linha) => {
    if (linha.includes("fontFamily:") && linha.includes(antigo) && !linha.includes("\\\\'Helvetica")) {
      return linha.replace("'Helvetica Neue'", "\\\\'Helvetica Neue\\\\'");
    }
    return linha;
  }).join("\n");
  if (novo !== texto) {
    fs.writeFileSync(fixBuildPath, novo, "utf8");
    console.log("NeoCooler: fontFamily sanitizado em fix-build.");
  }
}
