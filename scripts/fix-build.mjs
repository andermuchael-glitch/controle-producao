import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
let changed = false;

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) return false;
  source = source.replace(from, to);
  changed = true;
  console.log("NeoCooler: " + label);
  return true;
};

const replaceAll = (from, to, label) => {
  if (!source.includes(from)) return false;
  source = source.split(from).join(to);
  changed = true;
  console.log("NeoCooler: " + label);
  return true;
};

replaceAll(
  'const ETAPAS = ["pre_corte", "corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  "etapa Corte removida"
);

replaceAll("etapa: \"corte\"", "etapa: \"aguardando_sublimacao\"", "registros antigos de Corte migrados");

replaceOnce(
  'setConfirmarLimpeza(false);const exportarXLSX = () => {',
  'setConfirmarLimpeza(false);\n  };\n\n  const exportarXLSX = () => {',
  "fechamento de limparTudo corrigido"
);

if (!source.includes("const normalizarItensPersistidos = (lista) =>")) {
  const normalizador = `
const normalizarItensPersistidos = (lista) => {
  const arr = Array.isArray(lista) ? lista : [];
  const resultado = [];
  const vistos = new Set();
  const porChavePre = new Set();
  const texto = (v) => String(v ?? "").trim();
  for (const original of arr) {
    const i = { ...original };
    if (!i.pedido || !i.produto) continue;
    if (i.etapa === "corte") i.etapa = "aguardando_sublimacao";
    if (!i.etapa) i.etapa = "costura";
    const chave = texto(i.pedido) + "||" + texto(i.produto).toUpperCase();
    if (i.etapa === "pre_corte") {
      if (porChavePre.has(chave)) continue;
      porChavePre.add(chave);
    }
    const assinatura = JSON.stringify({
      pedido: texto(i.pedido), produto: texto(i.produto).toUpperCase(), etapa: i.etapa,
      qtd: Number(i.qtd) || 0, cor: texto(i.cor), dataCorte: texto(i.dataCorte),
      sublimador: texto(i.sublimador), dataSublimacao: texto(i.dataSublimacao),
      equipe: texto(i.equipe), feito: !!i.feito, conferido: !!i.conferido
    });
    if (vistos.has(assinatura)) continue;
    vistos.add(assinatura);
    resultado.push(i);
  }
  return resultado;
};
`;
  source = source.replace("export default function App() {", normalizador + "\nexport default function App() {");
  changed = true;
  console.log("NeoCooler: normalizador instalado");
}

if (source.includes("const carregados = JSON.parse(raw);") && !source.includes("const normalizados = normalizarItensPersistidos(carregados);")) {
  source = source.replace(
    "const carregados = JSON.parse(raw);",
    "const carregados = JSON.parse(raw);\n          const normalizados = normalizarItensPersistidos(carregados);"
  );
  source = source.replace("const migrados = carregados.map((i) => ({", "const migrados = normalizados.map((i) => ({");
  source = source.replace("setItens(migrados);", "setItens(migrados);\n          if (normalizados.length !== carregados.length) salvarValor(STORAGE_KEY, JSON.stringify(migrados));");
  changed = true;
  console.log("NeoCooler: normalização automática ao carregar instalada");
}

if (!source.includes("const existentePosterior = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa !== \"pre_corte\");")) {
  const alvo = 'const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");';
  const bloco = `${alvo}
    const existentePosterior = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa !== "pre_corte");
    if (existentePosterior) {
      setErro("O pedido #" + numero + " / " + produto + " já está em " + (ETAPA_LABEL[existentePosterior.etapa] || existentePosterior.etapa) + ". Não será criado outro Pré-Corte.");
      return;
    }`;
  replaceOnce(alvo, bloco, "bloqueio de duplicação entre etapas instalado");
}

// Permite corrigir a cor de itens que chegaram à costura sem cor definida.
if (!source.includes("const setCorItem = (id, cor) =>")) {
  const alvo = '  const setEquipeItem = (id, eq) => {\n    salvar(itens.map((i) => (i.id === id ? { ...i, equipe: eq } : i)));\n  };';
  const bloco = `${alvo}
  const setCorItem = (id, cor) => {
    salvar(itens.map((i) => (i.id === id ? { ...i, cor } : i)));
  };`;
  replaceOnce(alvo, bloco, "seletor de cor para itens sem cor instalado");
}

const seletorCor = `<select style={{ ...styles.equipeSelect, minWidth: 118, borderRadius: 8 }} value={it.cor || ""} onChange={(e) => setCorItem(it.id, e.target.value)} aria-label={"Cor de " + it.produto}>
                          <option value="">Selecionar cor</option>
                          {CORES.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
                        </select>`;

// Aguardando Costura: itens sem cor passam a ter seleção de cor diretamente no cartão.
const aguardandoCosturaMarker = '<select style={styles.equipeSelect} value={it.equipe} onChange={(e) => setEquipeItem(it.id, e.target.value)}>';
if (source.includes(aguardandoCosturaMarker) && !source.includes('aria-label={"Cor de " + it.produto}')) {
  source = source.replace(
    aguardandoCosturaMarker,
    seletorCor + '\n                        ' + aguardandoCosturaMarker
  );
  changed = true;
  console.log("NeoCooler: cor disponível em Aguardando Costura");
}

const searchStart = source.indexOf("function GlobalOrderSearch({ itens, onSelectStage }) {");
if (searchStart >= 0) {
  const appStart = source.indexOf("export default function App() {", searchStart);
  if (appStart > searchStart) {
    const novoSearch = `function GlobalOrderSearch({ itens, onSelectStage }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const resultados = useMemo(() => {
    if (!termo) return [];
    const ordem = { pre_corte: 0, aguardando_sublimacao: 1, sublimacao: 2, aguardando_costura: 3, costura: 4, separacao: 5, corte: 1 };
    const mapa = new Map();
    for (const original of itens) {
      if (!String(original.pedido || "").toLowerCase().includes(termo)) continue;
      const item = { ...original, etapa: original.etapa === "corte" ? "aguardando_sublimacao" : original.etapa };
      const chave = String(item.id || item.pedido + "||" + item.produto);
      const anterior = mapa.get(chave);
      if (!anterior || (ordem[item.etapa] ?? -1) > (ordem[anterior.etapa] ?? -1)) mapa.set(chave, item);
    }
    return Array.from(mapa.values());
  }, [itens, termo]);
  const abrirResultado = (item) => {
    const etapa = item.etapa === "corte" ? "aguardando_sublimacao" : item.etapa;
    if (onSelectStage) onSelectStage(etapa, String(item.pedido));
    setTimeout(() => {
      const el = document.querySelector("[data-pedido=\\\"" + String(item.pedido).replace(/\\\"/g, "") + "\\\"]");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      else window.scrollTo({ top: Math.max(0, document.body.scrollHeight / 3), behavior: "smooth" });
    }, 120);
    setBusca("");
  };
  return <div style={{ width: "100%", maxWidth: 760, margin: "0 auto 10px", position: "relative", zIndex: 50 }}>
    <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔎 Buscar pedido em todas as etapas..." aria-label="Buscar pedido em todas as etapas" style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", border: "1px solid #cfc2ad", borderRadius: 9, fontSize: 16 }} />
    {termo && <div style={{ background: "#fff", border: "1px solid #d9cdb8", borderRadius: 10, padding: 8, marginTop: 5, boxShadow: "0 3px 10px rgba(0,0,0,.12)" }}>
      {resultados.length ? resultados.map((item) => <button key={String(item.id || item.pedido + "-" + item.produto)} type="button" onClick={() => abrirResultado(item)} style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 10px", marginTop: 4, border: "1px solid #e0d5c3", borderRadius: 8, background: "#f8f4ec", cursor: "pointer", textAlign: "left" }}><span><strong>#{item.pedido}</strong> · {item.produto || "Produto não informado"}</span><strong style={{ color: "#df5b24", whiteSpace: "nowrap" }}>{ETAPA_LABEL[item.etapa] || item.etapa}</strong></button>) : <div style={{ padding: 8 }}>Pedido não encontrado em nenhuma etapa.</div>}
    </div>}
  </div>;
}

`;
    source = source.slice(0, searchStart) + novoSearch + source.slice(appStart);
    changed = true;
    console.log("NeoCooler: pesquisa global navegável corrigida");
  }
}

if (!source.includes("function EtapasNoTopo({ itens, aba, setAba }) {")) {
  const topTabs = `function EtapasNoTopo({ itens, aba, setAba }) {
  const etapas = [
    ["pre_corte", "Pré-Corte"],
    ["aguardando_sublimacao", "Aguard. Sublimação"],
    ["sublimacao", "Sublimação"],
    ["aguardando_costura", "Aguard. Costura"],
    ["costura", "Costura"],
    ["separacao", "Separação"]
  ];
  const total = (etapa) => itens.filter((i) => (i.etapa === "corte" ? "aguardando_sublimacao" : i.etapa) === etapa).reduce((s, i) => s + (Number(i.qtd) || 0), 0);
  return <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", margin: "12px auto 2px", padding: "0 4px" }}>
    {etapas.map(([id, label]) => <button key={id} type="button" onClick={() => setAba(id)} style={{ border: "1px solid rgba(255,255,255,.18)", borderRadius: 9, padding: "8px 12px", background: aba === id ? "#ef6427" : "#29435d", color: "#fff", fontWeight: 700, cursor: "pointer", boxShadow: aba === id ? "0 0 0 2px rgba(239,100,39,.2)" : "none" }}>{label} <span style={{ opacity: .85 }}>({total(id)})</span></button>)}
  </div>;
}

`;
  source = source.replace("export default function App() {", topTabs + "export default function App() {");
  changed = true;
  console.log("NeoCooler: abas funcionais movidas para o topo azul");
}

// Remove completamente as abas antigas da área bege para não duplicar a navegação.
const oldTabsStart = source.indexOf('        <div style={styles.tabs} className="tabs-row">');
if (oldTabsStart >= 0) {
  const oldTabsEnd = source.indexOf('        <div style={styles.listHeader}', oldTabsStart);
  if (oldTabsEnd > oldTabsStart) {
    source = source.slice(0, oldTabsStart) + source.slice(oldTabsEnd);
    changed = true;
    console.log("NeoCooler: abas antigas da área bege removidas");
  }
}

replaceAll(
  '    { id: "corte", label: "Corte", contagem: totalCorte },\n',
  '',
  "aba Corte removida do array original"
);

const topTabsCall = '<EtapasNoTopo itens={itens} aba={aba} setAba={setAba} />';
replaceAll(topTabsCall + '\n        ', '', "posição antiga das abas limpa");
if (!source.includes(topTabsCall)) {
  replaceOnce(
    '          <div style={styles.stats} className="stats-row">',
    `          ${topTabsCall}\n          <div style={styles.stats} className="stats-row">`,
    "abas colocadas no cabeçalho azul"
  );
}

const chamadaPesquisa = '<GlobalOrderSearch itens={itens} onSelectStage={setAba} />';
replaceOnce(
  chamadaPesquisa,
  '<GlobalOrderSearch itens={itens} onSelectStage={(etapa, numero) => { setAba(etapa); setFiltroPedido(numero); }} />',
  "pesquisa ligada ao filtro da etapa"
);

if (!source.includes("<GlobalOrderSearch")) {
  replaceOnce(
    '      <main style={styles.main} className="app-main">',
    '      <GlobalOrderSearch itens={itens} onSelectStage={(etapa, numero) => { setAba(etapa); setFiltroPedido(numero); }} />\n      <main style={styles.main} className="app-main">',
    "pesquisa global adicionada ao topo"
  );
}

if (!source.includes('data-pedido={String(item.pedido)}')) {
  source = source.replace(/<div([^>]*?)key=\{item\.id\}([^>]*?)>/g, '<div$1key={item.id} data-pedido={String(item.pedido)}$2>');
  source = source.replace(/<article([^>]*?)key=\{item\.id\}([^>]*?)>/g, '<article$1key={item.id} data-pedido={String(item.pedido)}$2>');
  changed = true;
  console.log("NeoCooler: âncoras de pedido instaladas");
}

if (changed) fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: fix-build concluído com sucesso.");
