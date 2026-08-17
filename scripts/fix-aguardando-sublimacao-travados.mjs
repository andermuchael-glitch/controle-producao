import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
if (source.includes("// FIX_AGUARDANDO_SUBLIMACAO_TRAVADOS_V1")) process.exit(0);

const inicio = source.indexOf("  const enviarParaSublimacao = (pedidoNum, produtoNome) => {");
const fim = source.indexOf("  const moverParaAguardandoCostura = (id) => {", inicio);
if (inicio === -1 || fim === -1) throw new Error("NeoCooler: função enviarParaSublimacao não encontrada.");

const nova = `  // FIX_AGUARDANDO_SUBLIMACAO_TRAVADOS_V1\n  const enviarParaSublimacao = (pedidoNum, produtoNome) => {\n    const f = getAlocForm(pedidoNum, produtoNome);\n    const candidatos = itens.filter((i) => i.etapa === "aguardando_sublimacao" && i.pedido === pedidoNum && i.produto === produtoNome);\n    const disponivel = candidatos.reduce((s, i) => s + (Number(i.qtd) || 0), 0);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, disponivel));\n    if (!disponivel || qtdNum > disponivel) return;\n\n    let restanteParaMover = qtdNum;\n    const atualizados = [];\n    for (const item of itens) {\n      if (item.etapa !== "aguardando_sublimacao" || item.pedido !== pedidoNum || item.produto !== produtoNome || restanteParaMover <= 0) {\n        atualizados.push(item);\n        continue;\n      }\n      const qtdItem = Number(item.qtd) || 0;\n      const mover = Math.min(qtdItem, restanteParaMover);\n      const sobra = qtdItem - mover;\n      if (sobra > 0) atualizados.push({ ...item, qtd: sobra });\n      restanteParaMover -= mover;\n    }\n\n    const novo = {\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      cor: f.cor,\n      qtd: qtdNum,\n      etapa: "sublimacao",\n      sublimador: f.sublimador,\n      dataSublimacao: f.data || hoje(),\n      equipe: "Não decidido",\n      feito: false,\n      conferido: false,\n      criadoEm: Date.now(),\n    };\n\n    salvar([...atualizados, novo]);\n    setAlocForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { ...f, qtd: Math.max(1, disponivel - qtdNum) } }));\n  };\n\n`;

source = source.slice(0, inicio) + nova + source.slice(fim);
fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: corrigida transferência de Aguardando Sublimação para Sublimação, inclusive registros antigos/travados.");
