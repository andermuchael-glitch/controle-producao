import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
if (source.includes("// AGUARDANDO_SUBLIMACAO_UI_V2")) process.exit(0);

const marker = '        {loaded && aba === "aguardando_sublimacao" && (';
const inicio = source.indexOf(marker);
if (inicio === -1) throw new Error("NeoCooler: aba Aguardando Sublimação não encontrada.");
const fim = source.indexOf('        {loaded && aba === "sublimacao" && (', inicio);
if (fim === -1) throw new Error("NeoCooler: fim da aba Aguardando Sublimação não encontrado.");

let bloco = source.slice(inicio, fim);
const antigo = `                      const f = getAlocForm(p.numero, linha.produto);\n                      const concluidoLinha = linha.restante <= 0;`;
const novo = `                      // AGUARDANDO_SUBLIMACAO_UI_V2\n                      // A quantidade disponível para envio deve ser a quantidade que realmente existe nesta etapa.\n                      // Isso permite destravar registros antigos mesmo quando o resumo histórico ficou inconsistente.\n                      const restanteReal = itens\n                        .filter((i) => i.etapa === "aguardando_sublimacao" && i.pedido === p.numero && i.produto === linha.produto)\n                        .reduce((s, i) => s + Number(i.qtd || 0), 0);\n                      const f = getAlocForm(p.numero, linha.produto);\n                      const concluidoLinha = restanteReal <= 0;`;
if (!bloco.includes(antigo)) throw new Error("NeoCooler: trecho da linha de alocação não encontrado.");
bloco = bloco.replace(antigo, novo);
bloco = bloco.replace(/linha\.restante/g, "restanteReal");
source = source.slice(0, inicio) + bloco + source.slice(fim);
fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: UI de Aguardando Sublimação agora usa a quantidade real da etapa e destrava registros antigos.");
