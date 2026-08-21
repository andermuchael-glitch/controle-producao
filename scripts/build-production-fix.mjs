import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

// Etapa Corte não existe mais na interface. Itens legados em "corte" são
// migrados para Aguardando Sublimação durante o carregamento.
source = source.replace(
  /const ETAPAS = \[[^\n]+\];/,
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];'
);

// Normalização única dos dados carregados: remove duplicações idênticas e
// transforma registros antigos da etapa Corte em Aguardando Sublimação.
const marker = 'const hoje = () => new Date().toISOString().slice(0, 10);';
if (!source.includes("const normalizarItens = (lista) =>")) {
  const helper = `const normalizarItens = (lista) => {\n  const migrados = (Array.isArray(lista) ? lista : []).map((i) => {\n    if (i?.etapa === "corte") {\n      return { ...i, etapa: "aguardando_sublimacao", passaPeloCorte: true };\n    }\n    return i;\n  });\n  const vistos = new Set();\n  return migrados.filter((i) => {\n    const chave = [\n      i.pedido, i.produto, i.etapa, Number(i.qtd) || 0, i.cor || "",\n      i.sublimador || "", i.equipe || "", !!i.feito, !!i.conferido,\n      i.dataCorte || "", i.dataSublimacao || ""\n    ].join("|");\n    if (vistos.has(chave)) return false;\n    vistos.add(chave);\n    return true;\n  });\n};\n\n`;
  source = source.replace(marker, helper + marker);
}

source = source.replace(
  /const migrados = carregados\.map\(\(i\) => \(\{[\s\S]*?\n\s*\}\)\);\n\s*setItens\(migrados\);/,
  'setItens(normalizarItens(carregados));'
);

// Marcar como cortado consome o registro do Pré-Corte e cria somente o
// registro correspondente em Aguardando Sublimação. Nunca cria uma cópia.
const marcarRegex = /  const marcarCortado = \(pedidoNum, produtoNome, restante\) => \{[\s\S]*?\n  \};\n\n  \/\/ ---- Corte -> Aguardando Sublimação/;
const marcarReplacement = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdSolicitada = Math.max(1, Math.min(Number(f.qtd) || 1, Number(restante) || 1));\n    let pendente = qtdSolicitada;\n    const lista = [];\n\n    for (const item of itens) {\n      if (item.pedido !== pedidoNum || item.produto !== produtoNome || item.etapa !== "pre_corte" || pendente <= 0) {\n        lista.push(item);\n        continue;\n      }\n      const disponivel = Number(item.qtd) || 0;\n      const consumir = Math.min(disponivel, pendente);\n      pendente -= consumir;\n      const sobra = disponivel - consumir;\n      if (sobra > 0) lista.push({ ...item, qtd: sobra });\n    }\n\n    if (pendente > 0) {\n      setErro("Não foi possível localizar no Pré-Corte a quantidade selecionada. Atualize a tela e tente novamente.");\n      return;\n    }\n\n    lista.push({\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdSolicitada,\n      etapa: "aguardando_sublimacao",\n      passaPeloCorte: true,\n      cortador: "Patrick",\n      dataCorte: f.data || hoje(),\n      criadoEm: Date.now(),\n    });\n\n    salvar(normalizarItens(lista));\n    setCorteForm((f2) => ({\n      ...f2,\n      [chaveAloc(pedidoNum, produtoNome)]: { qtd: Math.max(0, (Number(restante) || qtdSolicitada) - qtdSolicitada), data: f.data },\n    }));\n  };\n\n  // ---- Fluxo sem Corte visível ----`;
if (marcarRegex.test(source)) source = source.replace(marcarRegex, marcarReplacement);

// Produtos que obrigatoriamente retornam para nova sublimação após a costura.
const oldFinal = '  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => (i.pedido === numero && i.etapa === "costura" ? { ...i, etapa: "separacao" } : i)));\n  };';
const newFinal = `  const PRODUTOS_RETORNO_SUBLIMACAO = new Set([\n    "TOALHA PERSONALIZADO 70X40",\n    "TOALHA 80X30",\n    "TOALHA C/ CAPUZ G",\n    "TOALHA C/ CAPUZ M",\n  ]);\n\n  const moverPedidoParaSeparacao = (numero) => {\n    const novaLista = itens.map((i) => {\n      if (i.pedido !== numero || i.etapa !== "costura") return i;\n      const produtoNormalizado = String(i.produto || "").trim().toUpperCase();\n      if (PRODUTOS_RETORNO_SUBLIMACAO.has(produtoNormalizado)) {\n        return { ...i, etapa: "aguardando_sublimacao", feito: false };\n      }\n      return { ...i, etapa: "separacao" };\n    });\n    salvar(normalizarItens(novaLista));\n  };`;
if (source.includes(oldFinal)) source = source.replace(oldFinal, newFinal);

// Remover o agrupador e a aba Corte do dashboard.
source = source.replace(/  const corteAgrupado = useMemo\(\(\) => \{[\s\S]*?\n  \}, \[itens, pedidosMeta, filtroPedido\]\);\n\n/, '');
source = source.replace(/  const totalCorte = itens\.filter\(\(i\) => i\.etapa === "corte"\)\.reduce\(\(s, i\) => s \+ i\.qtd, 0\);\n/, '');
source = source.replace(/    \{ id: "corte", label: "Corte", contagem: totalCorte \},\n/, '');
source = source.replace(/            <Stat label="corte" value=\{totalCorte\} \/>\n/, '');

// A seção visual da aba Corte deixa de existir.
source = source.replace(/\n        \{loaded && aba === "corte" && \(\n          <section style=\{styles\.listWrap\}>[\s\S]*?\n          <\/section>\n        \)}\n\n        \{loaded && aba === "aguardando_sublimacao"/, '\n        {loaded && aba === "aguardando_sublimacao"');

// Textos antigos que apontavam para a aba Corte.
source = source.replace(/o item passa para a aba Corte\./g, 'o item passa diretamente para Aguardando Sublimação.');
source = source.replace(/Mova itens pela aba Corte\./g, 'Os itens cortados aparecem diretamente aqui.');

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("build fix aplicado: build limpo, Corte removido, legado migrado e duplicações idênticas normalizadas.");
} else {
  log("build fix: nenhuma alteração necessária.");
}
