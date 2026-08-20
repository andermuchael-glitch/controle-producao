import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/App.jsx');
let source = fs.readFileSync(file, 'utf8');
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

function replaceOnce(label, from, to) {
  if (!source.includes(from)) {
    log(`eliminar-etapa-corte: trecho não encontrado: ${label}`);
    return false;
  }
  source = source.replace(from, to);
  log(`eliminar-etapa-corte: ${label} aplicado.`);
  return true;
}

replaceOnce(
  'migração de itens antigos de Corte',
  '            etapa: i.etapa || "costura",',
  '            etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "costura"),'
);

replaceOnce(
  'transição Pré-Corte -> Aguardando Sublimação',
  `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const novo = {\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: "corte",\n      cortador: "Patrick",\n      dataCorte: f.data || hoje(),\n      criadoEm: Date.now(),\n    };\n    salvar([...itens, novo]);\n    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restante - qtdNum, data: f.data } }));\n  };`,
  `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const novo = {\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: "aguardando_sublimacao",\n      cortador: "Patrick",\n      dataCorte: f.data || hoje(),\n      criadoEm: Date.now(),\n    };\n    salvar([...itens, novo]);\n    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restante - qtdNum, data: f.data } }));\n  };`
);

replaceOnce(
  'remoção da aba Corte',
  `  const ABAS = [\n    { id: "pre_corte", label: "Pré-Corte", contagem: totalPreCorte },\n    { id: "corte", label: "Corte", contagem: totalCorte },\n    { id: "aguardando_sublimacao", label: "Aguard. Sublimação", contagem: totalAguardandoSublimacao },\n    { id: "sublimacao", label: "Sublimação", contagem: totalSublimacao },\n    { id: "aguardando_costura", label: "Aguard. Costura", contagem: totalAguardando },\n    { id: "costura", label: "Costura", contagem: totalCosturaAberto },\n    { id: "separacao", label: "Separação", contagem: totalSeparacaoPend },\n  ];`,
  `  const ABAS = [\n    { id: "pre_corte", label: "Pré-Corte", contagem: totalPreCorte },\n    { id: "aguardando_sublimacao", label: "Aguard. Sublimação", contagem: totalAguardandoSublimacao },\n    { id: "sublimacao", label: "Sublimação", contagem: totalSublimacao },\n    { id: "aguardando_costura", label: "Aguard. Costura", contagem: totalAguardando },\n    { id: "costura", label: "Costura", contagem: totalCosturaAberto },\n    { id: "separacao", label: "Separação", contagem: totalSeparacaoPend },\n  ];`
);

const corteBlockStart = '        {loaded && aba === "corte" && (\n';
const corteBlockEnd = '        {loaded && aba === "aguardando_sublimacao" && (\n';
const start = source.indexOf(corteBlockStart);
const end = source.indexOf(corteBlockEnd, start);
if (start >= 0 && end > start) {
  source = source.slice(0, start) + source.slice(end);
  log('bloco visual da aba Corte removido.');
} else {
  log('bloco visual da aba Corte já não estava presente ou não foi localizado.');
}

source = source.replace(
  'o item passa para a aba Corte.',
  'o item passa diretamente para Aguardando Sublimação.'
);
source = source.replace(
  'Mova itens pela aba Corte.',
  'Os itens entram aqui automaticamente quando Patrick confirma o corte.'
);
source = source.replace(
  'Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa para a aba Corte.',
  'Pedidos lançados aqui aguardam o corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa diretamente para Aguardando Sublimação.'
);
source = source.replace('Corte → Costura', 'Pré-Corte → Sublimação → Costura');
source = source.replace('Do corte até a expedição, pedido por pedido', 'Do pré-corte até a expedição, pedido por pedido');

if (source !== original) {
  fs.writeFileSync(file, source, 'utf8');
  log('eliminação da etapa Corte concluída sem apagar dados; itens antigos foram migrados para Aguardando Sublimação.');
} else {
  log('nenhuma alteração necessária.');
}
