import fs from "node:fs";
const file = "src/App.jsx";
let app = fs.readFileSync(file, "utf8");
const withExclusao = '  const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte).reduce((s, i) => s + i.qtd, 0);';
const withoutExclusao = '  const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte").reduce((s, i) => s + i.qtd, 0);';
if (app.includes(withExclusao)) {
  app = app.replace(withExclusao, withoutExclusao);
  fs.writeFileSync(file, app);
}
