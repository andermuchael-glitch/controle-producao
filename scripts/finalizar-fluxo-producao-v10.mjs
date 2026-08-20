import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

const especiais = [
  "TOALHA PERSONALIZADO 70X40",
  "TOALHA 80X30",
  "TOALHA C/ CAPUZ G",
  "TOALHA C/ CAPUZ M",
];

const anchor = 'const CORTADORES = ["Patrick"];';
if (!source.includes("FLUXO_PRODUCAO_V10") && source.includes(anchor)) {
  const bloco = `\n\n// FLUXO_PRODUCAO_V10\nconst PRODUTOS_COSTURA_ANTES_SUBLIMACAO = ${JSON.stringify(especiais)};\nconst precisaCosturaAntesSublimacao = (nome) => PRODUTOS_COSTURA_ANTES_SUBLIMACAO.includes(String(nome || "").trim().toUpperCase());\n`;
  source = source.replace(anchor, anchor + bloco);
}

source = source.replace(/const ETAPAS = \[[^\n]*\];/, 'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];');
source = source.replace(/\n\s*corte:\s*"Corte",/, "\n");

if (!source.includes("NORMALIZACAO_PRODUCAO_V10")) {
  const storageAnchor = 'const AUDIT_ADMIN_EMAIL = "andermuchael@gmail.com";';
  const normalizador = `\n\n// NORMALIZACAO_PRODUCAO_V10\n// Converte o legado que duplicava a mesma quantidade em várias etapas em\n// um estado único por quantidade. A migração é idempotente.\nconst normalizarItensPersistidos = (lista) => {\n  const entrada = Array.isArray(lista) ? lista : [];\n  const semExatos = [];\n  const vistos = new Set();\n  for (const originalItem of entrada) {\n    const i = { ...originalItem };\n    const nome = String(i.produto || "").trim().toUpperCase();\n    if (i.etapa === "corte") {\n      i.etapa = precisaCosturaAntesSublimacao(nome) ? "aguardando_costura" : "aguardando_sublimacao";\n    }\n    i.qtd = Number(i.qtd) || 0;\n    if (i.qtd <= 0) continue;\n    const chave = [String(i.pedido), nome, i.etapa, i.qtd, i.cor || "", i.sublimador || "", i.equipe || "", i.dataCorte || "", i.dataSublimacao || ""].join("||");\n    if (vistos.has(chave)) continue;\n    vistos.add(chave);\n    semExatos.push({ ...i, equipe: i.equipe || "Não decidido", feito: i.feito ?? false, conferido: i.conferido ?? false });\n  }\n\n  const grupos = {};\n  for (const i of semExatos) {\n    const chave = String(i.pedido) + "||" + String(i.produto || "").trim().toUpperCase();\n    if (!grupos[chave]) grupos[chave] = [];\n    grupos[chave].push(i);\n  }\n\n  const resultado = [];\n  for (const grupo of Object.values(grupos)) {\n    const pre = grupo.filter((i) => i.etapa === "pre_corte");\n    if (!pre.length) {\n      resultado.push(...grupo);\n      continue;\n    }\n\n    const nome = String(pre[0].produto || "").trim().toUpperCase();\n    const base = pre.reduce((s, i) => s + i.qtd, 0);\n    const primeira = pre[0];\n    const saldo = {\n      pre_corte: base,\n      aguardando_sublimacao: 0,\n      sublimacao: 0,\n      aguardando_costura: 0,\n      costura: 0,\n      separacao: 0,\n    };\n    const eventos = grupo.filter((i) => i.etapa !== "pre_corte").sort((a, b) => (Number(a.criadoEm) || 0) - (Number(b.criadoEm) || 0));\n\n    for (const evento of eventos) {\n      let origem = null;\n      if (evento.etapa === "aguardando_sublimacao") {\n        origem = precisaCosturaAntesSublimacao(nome) && saldo.aguardando_costura > 0 ? "aguardando_costura" : "pre_corte";\n      } else if (evento.etapa === "sublimacao") origem = "aguardando_sublimacao";\n      else if (evento.etapa === "aguardando_costura") origem = saldo.sublimacao > 0 ? "sublimacao" : "pre_corte";\n      else if (evento.etapa === "costura") origem = "aguardando_costura";\n      else if (evento.etapa === "separacao") origem = "costura";\n\n      const qtd = Math.min(evento.qtd, origem && saldo[origem] > 0 ? saldo[origem] : evento.qtd);\n      if (origem && saldo[origem] > 0) saldo[origem] -= qtd;\n      saldo[evento.etapa] += qtd;\n    }\n\n    const modelos = {};\n    for (const etapa of Object.keys(saldo)) {\n      if (saldo[etapa] <= 0) continue;\n      const baseItem = etapa === "pre_corte" ? primeira : [...eventos].reverse().find((i) => i.etapa === etapa) || primeira;\n      modelos[etapa] = { ...baseItem, id: baseItem.id || Math.random().toString(36).slice(2, 10), etapa, qtd: saldo[etapa] };\n    }\n    resultado.push(...Object.values(modelos));\n  }\n  return resultado;\n};\n`;
  if (source.includes(storageAnchor)) source = source.replace(storageAnchor, storageAnchor + normalizador);
}

// Carregamento persistente: corrige Corte/duplicações uma vez e grava o estado canônico.
const cargaRegex = /const carregados = JSON\.parse\(raw\);[\s\S]*?setItens\(migrados\);/;
if (cargaRegex.test(source)) {
  source = source.replace(cargaRegex, `const carregados = JSON.parse(raw);\n          const migrados = normalizarItensPersistidos(carregados);\n          setItens(migrados);\n          if (JSON.stringify(migrados) !== JSON.stringify(carregados)) {\n            salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});\n          }`);
  log("normalização persistente do carregamento aplicada.");
}

// Pré-Corte -> próxima etapa: reduz o saldo do Pré-Corte e cria somente a quantidade movida.
const corteStart = source.indexOf('  // ---- Pré-Corte -> Corte (marcado conforme Patrick vai cortando) ----');
const alocStart = source.indexOf('  // ---- Alocação: aguardando sublimação', corteStart);
if (corteStart >= 0 && alocStart > corteStart) {
  const bloco = `  // ---- Pré-Corte -> próxima etapa ----\n  const getCorteForm = (p, prod, restante) => corteForm[chaveAloc(p, prod)] || { qtd: restante, data: hoje() };\n  const setCorteFormCampo = (p, prod, restante, campo, valor) => {\n    const chave = chaveAloc(p, prod);\n    setCorteForm((f) => ({ ...f, [chave]: { ...getCorteForm(p, prod, restante), [campo]: valor } }));\n  };\n  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const etapaDestino = precisaCosturaAntesSublimacao(produtoNome) ? "aguardando_costura" : "aguardando_sublimacao";\n    let saldo = qtdNum;\n    const novaLista = [];\n    for (const item of itens) {\n      if (saldo > 0 && String(item.pedido) === String(pedidoNum) && String(item.produto) === String(produtoNome) && item.etapa === "pre_corte") {\n        const novoSaldo = Math.max(0, (Number(item.qtd) || 0) - saldo);\n        if (novoSaldo > 0) novaLista.push({ ...item, qtd: novoSaldo });\n        saldo = 0;\n      } else {\n        novaLista.push(item);\n      }\n    }\n    novaLista.push({ id: uid(), pedido: pedidoNum, produto: produtoNome, qtd: qtdNum, etapa: etapaDestino, cortador: "Patrick", dataCorte: f.data || hoje(), criadoEm: Date.now(), equipe: "Não decidido", feito: false, conferido: false });\n    salvar(novaLista);\n    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: Math.max(1, restante - qtdNum), data: f.data } }));\n  };\n\n`;
  source = source.slice(0, corteStart) + bloco + source.slice(alocStart);
  log("movimentação parcial do Pré-Corte corrigida.");
}

// Aguardando Sublimação -> Sublimação: move a quantidade, não duplica o lote de origem.
const enviarOld = /  const enviarParaSublimacao = \(pedidoNum, produtoNome\) => \{[\s\S]*?\n  \};\n\n  const moverParaAguardandoCostura/;
if (enviarOld.test(source)) {
  source = source.replace(enviarOld, `  const enviarParaSublimacao = (pedidoNum, produtoNome) => {\n    const f = getAlocForm(pedidoNum, produtoNome);\n    const qtdNum = Math.max(1, Number(f.qtd) || 1);\n    let saldo = qtdNum;\n    const novaLista = [];\n    for (const item of itens) {\n      if (saldo > 0 && item.pedido === pedidoNum && item.produto === produtoNome && item.etapa === "aguardando_sublimacao") {\n        const novoSaldo = Math.max(0, (Number(item.qtd) || 0) - saldo);\n        if (novoSaldo > 0) novaLista.push({ ...item, qtd: novoSaldo });\n        saldo = 0;\n      } else {\n        novaLista.push(item);\n      }\n    }\n    const efetivo = qtdNum - saldo;\n    if (efetivo <= 0) return;\n    novaLista.push({ id: uid(), pedido: pedidoNum, produto: produtoNome, cor: f.cor, qtd: efetivo, etapa: "sublimacao", sublimador: f.sublimador, dataSublimacao: f.data || hoje(), equipe: "Não decidido", feito: false, conferido: false, criadoEm: Date.now() });\n    salvar(novaLista);\n    setAlocForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { cor: CORES[0].nome, qtd: 1, sublimador: f.sublimador, data: f.data } }));\n  };\n\n  const moverParaAguardandoCostura`);
  log("alocação para Sublimação deixou de duplicar a origem.");
}

// Costura concluída para os quatro produtos especiais volta para Aguardando Sublimação.
const toggleOld = /  const toggleFeito = \(id\) => \{[\s\S]*?\n  \};/;
if (toggleOld.test(source)) {
  source = source.replace(toggleOld, `  const toggleFeito = (id) => {\n    const alvo = itens.find((i) => i.id === id);\n    if (!alvo) return;\n    if (!alvo.feito && precisaCosturaAntesSublimacao(alvo.produto)) {\n      salvar(itens.map((i) => i.id === id ? { ...i, feito: false, etapa: "aguardando_sublimacao" } : i));\n      return;\n    }\n    salvar(itens.map((i) => (i.id === id ? { ...i, feito: !i.feito } : i)));\n  };`);
  log("retorno dos produtos especiais após Costura corrigido.");
}

// Remove a aba Corte do menu e da interface.
source = source.replace(/  const ABAS = \[[\s\S]*?\n  \];/, `  const ABAS = [\n    { id: "pre_corte", label: "Pré-Corte", contagem: totalPreCorte },\n    { id: "aguardando_sublimacao", label: "Aguard. Sublimação", contagem: totalAguardandoSublimacao },\n    { id: "sublimacao", label: "Sublimação", contagem: totalSublimacao },\n    { id: "aguardando_costura", label: "Aguard. Costura", contagem: totalAguardando },\n    { id: "costura", label: "Costura", contagem: totalCosturaAberto },\n    { id: "separacao", label: "Separação", contagem: totalSeparacaoPend },\n  ];`);

const visualCorte = source.indexOf('        {loaded && aba === "corte" && (');
const visualAguardando = source.indexOf('        {loaded && aba === "aguardando_sublimacao" && (', visualCorte);
if (visualCorte >= 0 && visualAguardando > visualCorte) {
  source = source.slice(0, visualCorte) + source.slice(visualAguardando);
  log("bloco visual da aba Corte removido.");
}

source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");
source = source.replaceAll("o item passa para a aba Corte", "o item passa diretamente para a próxima etapa");
source = source.replaceAll("Mova itens pela aba Corte.", "Os itens entram aqui automaticamente quando Patrick confirma o corte.");
source = source.replaceAll("Itens ficam aqui até serem movidos manualmente — o corte nem sempre segue a mesma ordem da sublimação.", "Patrick confirma o que foi cortado diretamente no Pré-Corte; não existe etapa intermediária Corte.");
source = source.replaceAll("Nada no corte. Importe um PDF ou lance manualmente acima.", "Nada aguardando nesta etapa.");

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("fluxo de produção V10 aplicado com sucesso.");
} else {
  log("fluxo de produção V10 já estava aplicado.");
}
