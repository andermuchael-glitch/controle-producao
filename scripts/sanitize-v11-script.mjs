import fs from "node:fs";

const file = "scripts/finalizar-fluxo-producao-v11.mjs";
let source = fs.readFileSync(file, "utf8");

// O V11 gera JSX dentro de template literals. Os backticks internos precisam
// estar escapados para não encerrar prematuramente o template `modais`.
const replacements = [
  ["{it.cor ? ` · ${it.cor}` : \"\"}", "{it.cor ? \\\` · ${it.cor}\\\` : \"\"}"],
  ["{it.sublimador ? ` · ${it.sublimador}` : \"\"}", "{it.sublimador ? \\\` · ${it.sublimador}\\\` : \"\"}"],
  ["{it.dataSublimacao ? ` · ${formatarDataBR(it.dataSublimacao)}` : \"\"}", "{it.dataSublimacao ? \\\` · ${formatarDataBR(it.dataSublimacao)}\\\` : \"\"}"],
  ["`Mês atual (${nomeMes(mesRef(hoje()))})`", "\\\`Mês atual (${nomeMes(mesRef(hoje()))})\\\`"],
  ["{it.cor ? ` · ${it.cor}` : \"\"}", "{it.cor ? \\\` · ${it.cor}\\\` : \"\"}"],
];

for (const [from, to] of replacements) source = source.split(from).join(to);
fs.writeFileSync(file, source, "utf8");
console.log("NeoCooler: script V11 sanitizado antes da execução.");
