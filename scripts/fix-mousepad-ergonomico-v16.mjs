import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);
const PRODUTO = "MOUSEPAD ERGONÔMICO";

// Cadastra o produto no catálogo para o importador PDF reconhecê-lo.
if (!source.includes(PRODUTO)) {
  const m = source.match(/const PRODUTOS = \[(.*?)\];/s);
  if (!m) throw new Error("V16: catálogo PRODUTOS não encontrado.");
  source = source.replace(m[0], `const PRODUTOS = [${m[1].trimEnd()},"${PRODUTO}"];`);
}

// Regra operacional: este modelo não passa pelo corte.
if (!source.includes("PRODUTOS_SEM_CORTE_V16")) {
  const anchor = 'const CORTADORES = ["Patrick"];';
  source = source.replace(anchor, `${anchor}\nconst PRODUTOS_SEM_CORTE_V16 = new Set(["${PRODUTO}"]);\nconst produtoSemCorteV16 = (nome) => PRODUTOS_SEM_CORTE_V16.has(String(nome || "").trim().toUpperCase());`);
}

// Corrige especificamente o registro mostrado na tela: #11109 / 20 un que entrou como __MANUAL__.
const oldLoad = `          const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa || "costura",\n            equipe: i.equipe || "Não decidido",\n            feito: i.feito ?? false,\n            conferido: i.conferido ?? false,\n          }));\n          setItens(migrados);`;
const newLoad = `          const migrados = carregados.map((i) => {\n            const corrigirMousepad = String(i.pedido) === "11109" && String(i.produto || "").trim().toUpperCase() === "__MANUAL__" && Number(i.qtd) === 20;\n            const produtoCorrigido = corrigirMousepad ? "${PRODUTO}" : i.produto;\n            return {\n              ...i,\n              produto: produtoCorrigido,\n              passaPeloCorte: produtoSemCorteV16(produtoCorrigido) ? false : (i.passaPeloCorte ?? true),\n              etapa: i.etapa || "costura",\n              equipe: i.equipe || "Não decidido",\n              feito: i.feito ?? false,\n              conferido: i.conferido ?? false,\n            };\n          });\n          setItens(migrados);\n          if (JSON.stringify(migrados) !== JSON.stringify(carregados)) salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});`;
if (source.includes(oldLoad)) source = source.replace(oldLoad, newLoad);

// Movimento sem corte: sai do Pré-Corte e entra em Aguardando Sublimação sem gerar registro de corte.
if (!source.includes("moverSemCorteV16")) {
  const anchor = '  const marcarCortado = (pedidoNum, produtoNome, restante) => {';
  const helper = `  const moverSemCorteV16 = (pedidoNum, produtoNome, restante) => {\n    if (!produtoSemCorteV16(produtoNome)) return;\n    const qtdEnviar = Number(restante) || 0;\n    if (qtdEnviar <= 0) return;\n    let pendente = qtdEnviar;\n    const lista = [];\n    for (const item of itens) {\n      if (item.pedido !== pedidoNum || item.produto !== produtoNome || item.etapa !== "pre_corte" || pendente <= 0) {\n        lista.push(item);\n        continue;\n      }\n      const disponivel = Number(item.qtd) || 0;\n      const consumir = Math.min(disponivel, pendente);\n      const sobra = disponivel - consumir;\n      pendente -= consumir;\n      if (sobra > 0) lista.push({ ...item, qtd: sobra });\n    }\n    if (pendente > 0) return;\n    lista.push({ id: uid(), pedido: pedidoNum, produto: produtoNome, qtd: qtdEnviar, etapa: "aguardando_sublimacao", passaPeloCorte: false, criadoEm: Date.now() });\n    salvar(lista);\n  };\n\n`;
  if (source.includes(anchor)) source = source.replace(anchor, helper + anchor);
}

// O botão do Pré-Corte usa a rota direta para este produto.
source = source.replace(
  'onClick={() => marcarCortado(p.numero, linha.produto, linha.restante)}>',
  'onClick={() => produtoSemCorteV16(linha.produto) ? moverSemCorteV16(p.numero, linha.produto, linha.restante) : marcarCortado(p.numero, linha.produto, linha.restante)}>'
);
source = source.replace(
  '>Marcar como cortado</button>',
  '>{produtoSemCorteV16(linha.produto) ? "Enviar p/ aguardando sublimação" : "Marcar como cortado"}</button>'
);

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("V16 aplicado: MOUSEPAD ERGONÔMICO reconhecido e configurado como produto sem corte; #11109 corrigido.");
} else {
  log("V16: nenhuma alteração necessária.");
}
