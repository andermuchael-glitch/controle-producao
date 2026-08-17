import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
if (source.includes("// MOVIMENTACAO_ETAPAS_V2")) process.exit(0);

const inicioCorte = source.indexOf("  const marcarCortado = (pedidoNum, produtoNome, restante) => {");
const fimCorte = source.indexOf("\n  // ---- Corte -> Aguardando Sublimação", inicioCorte);
if (inicioCorte === -1 || fimCorte === -1) throw new Error("NeoCooler: função marcarCortado não encontrada.");

const novaCorte = `  // MOVIMENTACAO_ETAPAS_V2\n  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const alvo = itens.find((i) => i.pedido === pedidoNum && i.produto === produtoNome && i.etapa === "pre_corte");\n    if (!alvo) { setErro("Item não encontrado no Pré-Corte."); return; }\n    const novaLista = [];\n    for (const i of itens) {\n      if (i.id !== alvo.id) { novaLista.push(i); continue; }\n      const restantePreCorte = Math.max(0, Number(i.qtd || 0) - qtdNum);\n      if (restantePreCorte > 0) novaLista.push({ ...i, qtd: restantePreCorte });\n    }\n    novaLista.push({\n      id: uid(), pedido: pedidoNum, produto: produtoNome, qtd: qtdNum, etapa: "corte",\n      cortador: "Patrick", dataCorte: f.data || hoje(), criadoEm: Date.now(),\n    });\n    salvar(novaLista);\n    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: Math.max(0, restante - qtdNum), data: f.data } }));\n  };\n`;
source = source.slice(0, inicioCorte) + novaCorte + source.slice(fimCorte);

const inicioSubl = source.indexOf("  const enviarParaSublimacao = (pedidoNum, produtoNome) => {");
const fimSubl = source.indexOf("\n  const moverParaAguardandoCostura", inicioSubl);
if (inicioSubl === -1 || fimSubl === -1) throw new Error("NeoCooler: função enviarParaSublimacao não encontrada.");

const novaSubl = `  const enviarParaSublimacao = (pedidoNum, produtoNome) => {\n    const f = getAlocForm(pedidoNum, produtoNome);\n    const aguardando = itens.filter((i) => i.pedido === pedidoNum && i.produto === produtoNome && i.etapa === "aguardando_sublimacao");\n    const disponivel = aguardando.reduce((s, i) => s + Number(i.qtd || 0), 0);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, disponivel));\n    if (!disponivel || qtdNum > disponivel) { setErro("Quantidade maior que o disponível em Aguardando Sublimação."); return; }\n    let restanteMover = qtdNum;\n    const novaLista = [];\n    for (const i of itens) {\n      if (i.pedido !== pedidoNum || i.produto !== produtoNome || i.etapa !== "aguardando_sublimacao" || restanteMover <= 0) { novaLista.push(i); continue; }\n      const retirar = Math.min(Number(i.qtd || 0), restanteMover);\n      const sobra = Number(i.qtd || 0) - retirar;\n      if (sobra > 0) novaLista.push({ ...i, qtd: sobra });\n      restanteMover -= retirar;\n    }\n    novaLista.push({\n      id: uid(), pedido: pedidoNum, produto: produtoNome, cor: f.cor, qtd: qtdNum, etapa: "sublimacao",\n      sublimador: f.sublimador, dataSublimacao: f.data || hoje(), equipe: "Não decidido",\n      feito: false, conferido: false, criadoEm: Date.now(),\n    });\n    salvar(novaLista);\n    setAlocForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { cor: CORES[0].nome, qtd: 1, sublimador: f.sublimador, data: f.data } }));\n  };\n`;
source = source.slice(0, inicioSubl) + novaSubl + source.slice(fimSubl);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: movimentação por quantidade entre Pré-Corte, Corte, Aguardando Sublimação e Sublimação corrigida.");
