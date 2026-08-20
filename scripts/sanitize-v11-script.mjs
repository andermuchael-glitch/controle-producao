import fs from "node:fs";

const file = "scripts/finalizar-fluxo-producao-v11.mjs";
let source = fs.readFileSync(file, "utf8");

function escapeGeneratedTemplate(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) return source;
  const contentStart = start + startMarker.length;
  const end = source.indexOf(endMarker, contentStart);
  if (end < 0) return source;

  let body = source.slice(contentStart, end);
  body = body.replaceAll("\\`", "`");
  body = body.replaceAll("\\${", "${");
  body = body.replaceAll("`", "\\`");
  body = body.replaceAll("${", "\\${");

  return source.slice(0, contentStart) + body + source.slice(end);
}

// V11 gera JSX dentro de template literals. Tudo dentro desses blocos
// pertence ao App.jsx e não deve ser interpretado pelo próprio script.
source = escapeGeneratedTemplate(
  source,
  "const computedBlock = `",
  "`;\n  if (source.includes(computedAnchor))"
);
source = escapeGeneratedTemplate(
  source,
  "const modais = `",
  "`;\n  if (source.includes(modalAnchor))"
);

fs.writeFileSync(file, source, "utf8");
console.log("NeoCooler: template literals do V11 sanitizados antes da execução.");
