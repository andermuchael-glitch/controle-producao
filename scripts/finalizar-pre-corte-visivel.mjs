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

// CORRECAO_11093_TOALHA_PERSONALIZADO_V1
// Adiciona o produto à lista e corrige, sem duplicar, o lançamento manual do pedido 11093.
const produto = "TOALHA PERSONALIZADO 70X40";
if (!app.includes(`"${produto}"`)) {
  const alvoProduto = '"TOALHA C/ CAPUZ M"';
  if (app.includes(alvoProduto)) {
    app = app.replace(alvoProduto, `${alvoProduto},"${produto}"`);
    console.log("NeoCooler: TOALHA PERSONALIZADO 70X40 adicionado à lista de produtos.");
  }
}

const loadAnchor = `          const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa || "costura",\n            equipe: i.equipe || "Não decidido",\n            feito: i.feito ?? false,\n            conferido: i.conferido ?? false,\n          }));`;

const loadReplacement = `${loadAnchor}\n          // CORRECAO_11093_TOALHA_PERSONALIZADO_V1_RUNTIME\n          let corrigiu11093 = false;\n          const migradosCorrigidos = migrados.map((i) => {\n            if (String(i.pedido) === "11093" && String(i.produto).toUpperCase() === "__MANUAL__" && i.etapa === "pre_corte") {\n              corrigiu11093 = true;\n              return { ...i, produto: "${produto}" };\n            }\n            return i;\n          });\n          if (corrigiu11093) {\n            salvarValor(STORAGE_KEY, JSON.stringify(migradosCorrigidos)).catch(() => {});\n            console.log("NeoCooler: pedido 11093 corrigido para TOALHA PERSONALIZADO 70X40, sem duplicação.");\n          }`;

if (!app.includes("CORRECAO_11093_TOALHA_PERSONALIZADO_V1_RUNTIME")) {
  if (!app.includes(loadAnchor)) {
    throw new Error("NeoCooler: âncora de carregamento dos itens não encontrada para corrigir o pedido 11093.");
  }
  app = app.replace(loadAnchor, loadReplacement);
  app = app.replace("          setItens(migrados);", "          setItens(migradosCorrigidos);");
}

fs.writeFileSync(file, app, "utf8");
console.log("NeoCooler: correção definitiva do Pré-Corte aplicada.");
