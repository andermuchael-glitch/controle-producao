import fs from "node:fs";

const file = "src/App.jsx";
let app = fs.readFileSync(file, "utf8");

const antigo = 'const itensPre = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte);';
const correto = 'const itensPre = itens.filter((i) => i.etapa === "pre_corte");';
if (app.includes(antigo)) app = app.replace(antigo, correto);

const antigoTotal = 'const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte).reduce((s, i) => s + i.qtd, 0);';
const corretoTotal = 'const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte").reduce((s, i) => s + i.qtd, 0);';
if (app.includes(antigoTotal)) app = app.replace(antigoTotal, corretoTotal);

const produto = "TOALHA PERSONALIZADO 70X40";
if (!app.includes(`"${produto}"`)) {
  const alvoProduto = 'const PRODUTOS = [';
  if (app.includes(alvoProduto)) app = app.replace(alvoProduto, `// PRODUTO_TOALHA_PERSONALIZADO_70X40_V2\nconst PRODUTOS = ["${produto}",`);
}

// Corrige a origem do item para que um lançamento feito diretamente em
// Aguardando Sublimação não seja confundido com algo que foi cortado a partir
// do Pré-Corte. Isso evita que, por exemplo, 200 un no Pré-Corte desapareçam
// porque existem 700 un do mesmo pedido/produto em uma etapa posterior.
const marcadorOrigem = "// CORRECAO_ORIGEM_PRE_CORTE_V1";
if (!app.includes(marcadorOrigem)) {
  const antigoCortado = `const novo = {\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: "corte",\n      cortador: "Patrick",`;
  const novoCortado = `const novo = {\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: "corte",\n      origemPreCorte: true,\n      cortador: "Patrick",`;
  if (app.includes(antigoCortado)) app = app.replace(antigoCortado, novoCortado);

  const antigoMover = `i.etapa === "corte" && i.pedido === pedidoNum && i.produto === produtoNome\n          ? { ...i, etapa: "aguardando_sublimacao" }`;
  const novoMover = `i.etapa === "corte" && i.pedido === pedidoNum && i.produto === produtoNome\n          ? { ...i, etapa: "aguardando_sublimacao", origemPreCorte: i.origemPreCorte !== false }`;
  if (app.includes(antigoMover)) app = app.replace(antigoMover, novoMover);

  const antigoMapa = `const cortadoPorChave = {};\n    for (const it of itens) {\n      if (it.etapa === "pre_corte") continue;\n      const chave = chaveAloc(it.pedido, it.produto);\n      cortadoPorChave[chave] = (cortadoPorChave[chave] || 0) + it.qtd;\n    }`;
  const novoMapa = `const cortadoPorChave = {};\n    for (const it of itens) {\n      const veioDoPreCorte = it.origemPreCorte === true || (it.etapa === "corte" && it.origemPreCorte !== false);\n      if (!veioDoPreCorte) continue;\n      const chave = chaveAloc(it.pedido, it.produto);\n      cortadoPorChave[chave] = (cortadoPorChave[chave] || 0) + it.qtd;\n    }`;
  if (app.includes(antigoMapa)) app = app.replace(antigoMapa, novoMapa);

  app = app.replace('const marcador = "// CORRECAO_11093_RUNTIME_V4";', `const marcador = "// CORRECAO_11093_RUNTIME_V4";\n  ${marcadorOrigem}`);
}

const marcador = "// CORRECAO_11093_RUNTIME_V4";
if (!app.includes(marcador)) {
  const anchor = 'export default function App() {\n';
  const runtime = `export default function App() {\n  ${marcador}\n  const corrigirPedido11093 = async (lista) => {\n    let alterou = false;\n    const corrigida = lista.map((i) => {\n      if (String(i.pedido) === "11093" && String(i.produto).toUpperCase() === "__MANUAL__" && i.etapa === "pre_corte") {\n        alterou = true;\n        return { ...i, produto: "${produto}" };\n      }\n      return i;\n    });\n    if (alterou) {\n      setItens(corrigida);\n      await salvarValor(STORAGE_KEY, JSON.stringify(corrigida));\n      console.log("NeoCooler: pedido 11093 corrigido para ${produto}, sem duplicação.");\n    }\n  };\n  useEffect(() => {\n    if (!itens.length) return;\n    corrigirPedido11093(itens).catch(() => {});\n  });\n`;
  if (app.includes(anchor)) app = app.replace(anchor, runtime);
  else console.log("NeoCooler: âncora App não encontrada; build continua sem migração 11093.");
}

fs.writeFileSync(file, app, "utf8");
console.log("NeoCooler: correção final do Pré-Corte/11093/origem aplicada.");
