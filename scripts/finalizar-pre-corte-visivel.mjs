import fs from "node:fs";

const file = "src/App.jsx";
let app = fs.readFileSync(file, "utf8");

// CORRECAO_DEFINITIVA_PRE_CORTE_V1
// Um item que ainda possui etapa=pre_corte deve aparecer na aba Pré-Corte.
// O marcador excluidoPreCorte só deve impedir a reinclusão duplicada, nunca esconder
// um lançamento que efetivamente continua salvo em pre_corte.
const antigo = 'const itensPre = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte);';
const correto = 'const itensPre = itens.filter((i) => i.etapa === "pre_corte");';

if (app.includes(antigo)) {
  app = app.replace(antigo, correto);
}

// Garante também que o total da aba conte todos os lançamentos reais de pré-corte.
const antigoTotal = 'const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte).reduce((s, i) => s + i.qtd, 0);';
const corretoTotal = 'const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte").reduce((s, i) => s + i.qtd, 0);';
if (app.includes(antigoTotal)) {
  app = app.replace(antigoTotal, corretoTotal);
}

fs.writeFileSync(file, app, "utf8");
console.log("NeoCooler: correção definitiva do Pré-Corte aplicada.");
