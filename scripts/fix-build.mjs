import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
let changed = false;

const replaceOnce = (from, to, label) => {
  if (source.includes(from) && !source.includes(to)) {
    source = source.replace(from, to);
    changed = true;
    console.log("NeoCooler: " + label);
  }
};

// O fluxo atual não possui mais a etapa Corte. Registros antigos de Corte
// continuam válidos, mas devem aparecer em Aguardando Sublimação.
replaceOnce(
  'const ETAPAS = ["pre_corte", "corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  "etapa Corte removida da navegação"
);

replaceOnce(
  '<h1 style={styles.title}>Corte → Costura</h1>',
  '<h1 style={styles.title}>Pré-Corte → Sublimação → Costura</h1>',
  "cabeçalho do fluxo corrigido"
);

replaceOnce(
  "Do corte até a expedição, pedido por pedido",
  "Do pré-corte até a expedição, pedido por pedido",
  "subtítulo do fluxo corrigido"
);

// Qualquer ação antiga que ainda escreva etapa corte passa diretamente para
// Aguardando Sublimação.
const antesEtapaCorte = 'etapa: "corte"';
const depoisEtapaCorte = 'etapa: "aguardando_sublimacao"';
if (source.includes(antesEtapaCorte)) {
  source = source.replaceAll(antesEtapaCorte, depoisEtapaCorte);
  changed = true;
  console.log("NeoCooler: transição Corte -> Aguardando Sublimação corrigida.");
}

const normalizador = [
  "",
  "const normalizarItensPersistidos = (lista) => {",
  "  const arr = Array.isArray(lista) ? lista : [];",
  "  const resultado = [];",
  "  const vistosExatos = new Set();",
  "  const preCortePorPedidoProduto = new Set();",
  "",
  "  const texto = (v) => String(v ?? '').trim();",
  "  const assinatura = (i) => JSON.stringify({",
  "    pedido: texto(i.pedido),",
  "    produto: texto(i.produto).toUpperCase(),",
  "    etapa: i.etapa === 'corte' ? 'aguardando_sublimacao' : texto(i.etapa),",
  "    qtd: Number(i.qtd) || 0,",
  "    cor: texto(i.cor),",
  "    dataCorte: texto(i.dataCorte),",
  "    sublimador: texto(i.sublimador),",
  "    dataSublimacao: texto(i.dataSublimacao),",
  "    equipe: texto(i.equipe),",
  "    feito: !!i.feito,",
  "    conferido: !!i.conferido",
  "  });",
  "",
  "  for (const original of arr) {",
  "    const i = { ...original };",
  "    if (!i.pedido || !i.produto) continue;",
  "    if (i.etapa === 'corte') i.etapa = 'aguardando_sublimacao';",
  "    if (!i.etapa) i.etapa = 'costura';",
  "",
  "    const pedidoProduto = texto(i.pedido) + '||' + texto(i.produto).toUpperCase();",
  "    if (i.etapa === 'pre_corte') {",
  "      if (preCortePorPedidoProduto.has(pedidoProduto)) continue;",
  "      preCortePorPedidoProduto.add(pedidoProduto);",
  "    }",
  "",
  "    const assinaturaAtual = assinatura(i);",
  "    if (vistosExatos.has(assinaturaAtual)) continue;",
  "    vistosExatos.add(assinaturaAtual);",
  "    resultado.push(i);",
  "  }",
  "",
  "  return resultado;",
  "};",
  ""
].join("\\n");

if (!source.includes("const normalizarItensPersistidos = (lista) =>")) {
  source = source.replace("export default function App() {", normalizador + "export default function App() {");
  changed = true;
  console.log("NeoCooler: normalizador de duplicações adicionado.");
}

// Normaliza os dados antes de renderizar. Se encontrar registros duplicados ou
// antigos da etapa Corte, salva a lista corrigida para não recriar o problema.
const antigoCarregamento = 'const carregados = JSON.parse(raw);\n          const migrados = carregados.map((i) => ({';
const novoCarregamento = 'const carregados = JSON.parse(raw);\n          const normalizados = normalizarItensPersistidos(carregados);\n          const migrados = normalizados.map((i) => ({';
if (source.includes(antigoCarregamento)) {
  source = source.replace(antigoCarregamento, novoCarregamento);
  source = source.replace(
    '          setItens(migrados);\n',
    '          setItens(migrados);\n          if (normalizados.length !== carregados.length) salvarValor(STORAGE_KEY, JSON.stringify(migrados));\n'
  );
  changed = true;
  console.log("NeoCooler: carregamento com limpeza de duplicações aplicado.");
}

// O lançamento manual não pode criar um novo Pré-Corte se o mesmo pedido/produto
// já estiver em qualquer etapa posterior.
const blocoExistente = 'const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");';
const blocoProtegido = [
  'const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");',
  '    const existentePosterior = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa !== "pre_corte");',
  '    if (existentePosterior) {',
  '      setErro("O pedido #" + numero + " / " + produto + " já está em uma etapa posterior (" + (ETAPA_LABEL[existentePosterior.etapa] || existentePosterior.etapa) + "). Não será criado outro Pré-Corte.");',
  '      return;',
  '    }'
].join("\n");
if (source.includes(blocoExistente) && !source.includes("const existentePosterior = itens.find")) {
  source = source.replace(blocoExistente, blocoProtegido);
  changed = true;
  console.log("NeoCooler: bloqueio de duplicação entre etapas aplicado.");
}

// Barra de pesquisa global. Ela consulta todas as etapas sem exigir que o
// operador clique primeiro em cada aba.
const globalSearchComponent = [
  "",
  "function GlobalOrderSearch({ itens, onSelectStage }) {",
  "  const [busca, setBusca] = useState('');",
  "  const termo = busca.trim().toLowerCase();",
  "  const resultados = useMemo(() => {",
  "    if (!termo) return [];",
  "    const ordem = { pre_corte: 0, corte: 1, aguardando_sublimacao: 2, sublimacao: 3, aguardando_costura: 4, costura: 5, separacao: 6 };",
  "    const mapa = new Map();",
  "    for (const original of itens) {",
  "      if (!String(original.pedido || '').toLowerCase().includes(termo)) continue;",
  "      const item = { ...original, etapa: original.etapa === 'corte' ? 'aguardando_sublimacao' : original.etapa };",
  "      const chave = String(item.pedido) + '||' + String(item.produto || '').toUpperCase();",
  "      const atual = mapa.get(chave);",
  "      if (!atual || (ordem[item.etapa] ?? -1) > (ordem[atual.etapa] ?? -1)) mapa.set(chave, item);",
  "    }",
  "    return Array.from(mapa.values()).sort((a, b) => Number(a.pedido || 0) - Number(b.pedido || 0));",
  "  }, [itens, termo]);",
  "  const label = (etapa) => ETAPA_LABEL[etapa] || etapa || 'Sem etapa';",
  "  return (",
  "    <div style={{ width: '100%', maxWidth: 760, margin: '0 auto 14px', position: 'relative', zIndex: 30 }}>",
  "      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder='🔎 Buscar pedido em todas as etapas...' aria-label='Buscar pedido em todas as etapas' style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: '1px solid #cfc2ad', borderRadius: 9, fontSize: 16 }} />",
  "      {termo && <div style={{ background: '#fff', border: '1px solid #d9cdb8', borderRadius: 10, padding: 8, marginTop: 5, boxShadow: '0 3px 10px rgba(0,0,0,.12)' }}>",
  "        {resultados.length === 0 ? <div style={{ padding: 8, color: '#8b8172' }}>Pedido não encontrado em nenhuma etapa.</div> : resultados.map((item) => (",
  "          <button key={String(item.pedido) + '-' + String(item.produto)} type='button' onClick={() => onSelectStage && onSelectStage(item.etapa)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 10px', marginTop: 4, border: '1px solid #e0d5c3', borderRadius: 8, background: '#f8f4ec', cursor: 'pointer', textAlign: 'left' }}>",
  "            <span><strong>#{item.pedido}</strong> · {item.produto || 'Produto não informado'}</span>",
  "            <strong style={{ color: '#df5b24', whiteSpace: 'nowrap' }}>{label(item.etapa)}</strong>",
  "          </button>",
  "        ))}",
  "      </div>}",
  "    </div>",
  "  );",
  "}",
  ""
].join("\n");

if (!source.includes("function GlobalOrderSearch({ itens, onSelectStage })")) {
  source = source.replace("export default function App() {", globalSearchComponent + "export default function App() {");
  changed = true;
  console.log("NeoCooler: pesquisa global adicionada.");
}

const tituloAtual = '<h1 style={styles.title}>Pré-Corte → Sublimação → Costura</h1>';
if (source.includes(tituloAtual) && !source.includes('<GlobalOrderSearch itens={itens} onSelectStage={setAba} />')) {
  source = source.replace(tituloAtual, '<GlobalOrderSearch itens={itens} onSelectStage={setAba} />\n' + tituloAtual);
  changed = true;
}

// Se a aba Corte ainda estiver escrita de forma fixa no JSX, remova apenas a
// navegação. A etapa separação nunca é removida.
source = source.replace(/<button([^>]*onClick=\{\(\) => setAba\(["']corte["']\)[^>]*>)[\\s\\S]*?<\\/button>/g, "");

if (changed) fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: fix-build concluído sem alterações de dados no build.");
