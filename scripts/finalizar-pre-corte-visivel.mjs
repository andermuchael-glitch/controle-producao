import fs from "node:fs";

const file = "src/App.jsx";
let app = fs.readFileSync(file, "utf8");

// CORRECAO_DEFINITIVA_PRE_CORTE_V1
const antigo = 'const itensPre = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte);';
const correto = 'const itensPre = itens.filter((i) => i.etapa === "pre_corte");';
if (app.includes(antigo)) app = app.replace(antigo, correto);

const antigoTotal = 'const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte).reduce((s, i) => s + i.qtd, 0);';
const corretoTotal = 'const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte").reduce((s, i) => s + i.qtd, 0);';
if (app.includes(antigoTotal)) app = app.replace(antigoTotal, corretoTotal);

// CORRECAO_11093_TOALHA_PERSONALIZADO_V2
const produto = "TOALHA PERSONALIZADO 70X40";
if (!app.includes(`"${produto}"`)) {
  const alvoProduto = '"TOALHA C/ CAPUZ M"';
  if (app.includes(alvoProduto)) app = app.replace(alvoProduto, `${alvoProduto},"${produto}"`);
}

// Corrige o dado na memória antes de setItens e persiste no Firebase.
// Não depende da posição exata do bloco de migração.
const marcador = "// CORRECAO_11093_RUNTIME_V2";
if (!app.includes(marcador)) {
  const alvo = '          setItens(migrados);';
  const substituto = `          ${marcador}\n          const migradosCorrigidos = migrados.map((i) => (\n            String(i.pedido) === "11093" && String(i.produto).toUpperCase() === "__MANUAL__"\n              ? { ...i, produto: "${produto}" }\n              : i\n          ));\n          if (JSON.stringify(migradosCorrigidos) !== JSON.stringify(migrados)) {\n            salvarValor(STORAGE_KEY, JSON.stringify(migradosCorrigidos)).catch(() => {});\n          }\n          setItens(migradosCorrigidos);`;
  if (!app.includes(alvo)) throw new Error("NeoCooler: ponto de carregamento dos itens não encontrado.");
  app = app.replace(alvo, substituto);
}

fs.writeFileSync(file, app, "utf8");
console.log("NeoCooler: Pré-Corte e pedido 11093 corrigidos.");
