import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

const oldCorte = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {
    const f = getCorteForm(pedidoNum, produtoNome, restante);
    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));
    const novo = {
      id: uid(),
      pedido: pedidoNum,
      produto: produtoNome,
      qtd: qtdNum,
      etapa: "corte",
      cortador: "Patrick",
      dataCorte: f.data || hoje(),
      criadoEm: Date.now(),
    };
    salvar([...itens, novo]);
    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restante - qtdNum, data: f.data } }));
  };`;

const newCorte = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {
    const f = getCorteForm(pedidoNum, produtoNome, restante);
    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));
    let restanteParaConsumir = qtdNum;
    const listaSemDuplicacao = [];
    for (const item of itens) {
      if (item.pedido !== pedidoNum || item.produto !== produtoNome || item.etapa !== "pre_corte" || restanteParaConsumir <= 0) {
        listaSemDuplicacao.push(item);
        continue;
      }
      const disponivel = Number(item.qtd) || 0;
      const consumir = Math.min(disponivel, restanteParaConsumir);
      const sobra = disponivel - consumir;
      restanteParaConsumir -= consumir;
      if (sobra > 0) listaSemDuplicacao.push({ ...item, qtd: sobra });
    }
    if (restanteParaConsumir > 0) return;
    const novo = {
      id: uid(), pedido: pedidoNum, produto: produtoNome, qtd: qtdNum,
      etapa: "corte", cortador: "Patrick", dataCorte: f.data || hoje(), criadoEm: Date.now(),
    };
    salvar([...listaSemDuplicacao, novo]);
    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: Math.max(0, restante - qtdNum), data: f.data } }));
  };`;

const oldSub = `  const enviarParaSublimacao = (pedidoNum, produtoNome) => {
    const f = getAlocForm(pedidoNum, produtoNome);
    const qtdNum = Math.max(1, Number(f.qtd) || 1);
    const novo = {
      id: uid(),
      pedido: pedidoNum,
      produto: produtoNome,
      cor: f.cor,
      qtd: qtdNum,
      etapa: "sublimacao",
      sublimador: f.sublimador,
      dataSublimacao: f.data || hoje(),
      equipe: "Não decidido",
      feito: false,
      conferido: false,
      criadoEm: Date.now(),
    };
    salvar([...itens, novo]);
    setAlocForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { cor: CORES[0].nome, qtd: 1, sublimador: f.sublimador, data: f.data } }));
  };`;

const newSub = `  const enviarParaSublimacao = (pedidoNum, produtoNome) => {
    const f = getAlocForm(pedidoNum, produtoNome);
    const disponivel = itens.filter((i) => i.pedido === pedidoNum && i.produto === produtoNome && i.etapa === "aguardando_sublimacao").reduce((s, i) => s + (Number(i.qtd) || 0), 0);
    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, disponivel));
    if (!disponivel || qtdNum <= 0) return;
    let restanteParaConsumir = qtdNum;
    const listaSemDuplicacao = [];
    for (const item of itens) {
      if (item.pedido !== pedidoNum || item.produto !== produtoNome || item.etapa !== "aguardando_sublimacao" || restanteParaConsumir <= 0) {
        listaSemDuplicacao.push(item);
        continue;
      }
      const disponivelItem = Number(item.qtd) || 0;
      const consumir = Math.min(disponivelItem, restanteParaConsumir);
      const sobra = disponivelItem - consumir;
      restanteParaConsumir -= consumir;
      if (sobra > 0) listaSemDuplicacao.push({ ...item, qtd: sobra });
    }
    if (restanteParaConsumir > 0) return;
    const novo = {
      id: uid(), pedido: pedidoNum, produto: produtoNome, cor: f.cor, qtd: qtdNum,
      etapa: "sublimacao", sublimador: f.sublimador, dataSublimacao: f.data || hoje(),
      equipe: "Não decidido", feito: false, conferido: false, criadoEm: Date.now(),
    };
    salvar([...listaSemDuplicacao, novo]);
    setAlocForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { cor: CORES[0].nome, qtd: 1, sublimador: f.sublimador, data: f.data } }));
  };`;

if (source.includes(oldCorte)) source = source.replace(oldCorte, newCorte);
if (source.includes(oldSub)) source = source.replace(oldSub, newSub);

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("V14 aplicado: avançar etapa agora consome o restante da etapa anterior e não cria cópias.");
} else {
  log("V14: nenhuma alteração necessária.");
}
