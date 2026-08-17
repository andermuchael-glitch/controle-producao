import fs from "node:fs";
const file = "src/App.jsx";
let app = fs.readFileSync(file, "utf8");
const oldLine = '  const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte").reduce((s, i) => s + i.qtd, 0);';
const newLine = '  const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte).reduce((s, i) => s + i.qtd, 0);';
if (app.includes(oldLine)) {
  app = app.replace(oldLine, newLine);
  fs.writeFileSync(file, app);
}
