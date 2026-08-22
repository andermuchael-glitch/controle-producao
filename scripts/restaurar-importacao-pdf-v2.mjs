import fs from "node:fs";

const path = "scripts/restaurar-importacao-pdf.mjs";
let source = fs.readFileSync(path, "utf8");

const correcoes = [
  ["descricao = limparDescricaoPdf(`${descricao} ${continuacoes.join(\" \")}`);", "descricao = limparDescricaoPdf(\\`\\${descricao} \\${continuacoes.join(\" \")}\\`);"],
  ["textoOriginal: `${codigo} — ${descricao}`", "textoOriginal: \\`\\${codigo} — \\${descricao}\\`"],
  ["const chave = `${pedidoPdf}||${produtoPdf}`;", "const chave = \\`\\${pedidoPdf}||\\${produtoPdf}\\`;"],
];

for (const [antes, depois] of correcoes) source = source.split(antes).join(depois);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: sintaxe do restaurador PDF corrigida antes do build.");
await import("./restaurar-importacao-pdf.mjs?fixed=" + Date.now());
