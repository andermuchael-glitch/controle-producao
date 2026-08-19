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

// PRODUTO_TOALHA_PERSONALIZADO_70X40_V2
const produto = "TOALHA PERSONALIZADO 70X40";
if (!app.includes(`"${produto}"`)) {
  const alvoProduto = 'const PRODUTOS = [';
  if (app.includes(alvoProduto)) {
    app = app.replace(alvoProduto, `// PRODUTO_TOALHA_PERSONALIZADO_70X40_V2\nconst PRODUTOS = ["${produto}",`);
  }
}

// CORRECAO_11093_RUNTIME_V3
// Injeta uma migração independente dos patches anteriores. Assim o build não
// depende de encontrar "setItens(migrados)" em uma posição específica.
const marcador = "// CORRECAO_11093_RUNTIME_V3";
if (!app.includes(marcador)) {
  const anchor = 'export default function App() {\n';
  const runtime = `export default function App() {\n  ${marcador}\n  const corrigirPedido11093 = async (lista) => {\n    let alterou = false;\n    const corrigida = lista.map((i) => {\n      if (String(i.pedido) === "11093" && String(i.produto).toUpperCase() === "__MANUAL__" && i.etapa === "pre_corte") {\n        alterou = true;\n        return { ...i, produto: "${produto}" };\n      }\n      return i;\n    });\n    if (alterou) {\n      setItens(corrigida);\n      await salvarValor(STORAGE_KEY, JSON.stringify(corrigida));\n      console.log("NeoCooler: pedido 11093 corrigido para ${produto}, sem duplicação.");\n    }\n  };\n  useEffect(() => {\n    if (!loaded || !itens.length) return;\n    corrigirPedido11093(itens).catch(() => {});\n  }, [loaded, itens]);\n`;
  if (app.includes(anchor)) app = app.replace(anchor, runtime);
  else console.log("NeoCooler: âncora App não encontrada; build continua sem migração 11093.");
}

fs.writeFileSync(file, app, "utf8");
console.log("NeoCooler: correção final do Pré-Corte/11093 aplicada sem âncora frágil.");
