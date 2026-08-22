import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
let changed = false;

function replaceAllText(from, to, label) {
  if (source.includes(from)) {
    source = source.split(from).join(to);
    changed = true;
    console.log("NeoCooler: " + label);
  }
}

replaceAllText(
  'const ETAPAS = ["pre_corte", "corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  "aba Corte removida do fluxo"
);

replaceAllText(
  '<h1 style={styles.title}>Corte → Costura</h1>',
  '<h1 style={styles.title}>Pré-Corte → Sublimação → Costura</h1>',
  "cabeçalho corrigido"
);

replaceAllText(
  "Do corte até a expedição, pedido por pedido",
  "Do pré-corte até a expedição, pedido por pedido",
  "subtítulo corrigido"
);

// Nunca mais gravar uma etapa Corte. Registros antigos são convertidos.
replaceAllText('etapa: "corte"', 'etapa: "aguardando_sublimacao"', "transição Corte -> Aguardando Sublimação corrigida");

// Correção estrutural: uma alteração anterior deixou a função limparTudo sem a chave de fechamento.
replaceAllText(
  'setConfirmarLimpeza(false);const exportarXLSX = () => {',
  'setConfirmarLimpeza(false);\n  };\n\n  const exportarXLSX = () => {',
  "fechamento de limparTudo corrigido"
);

// Corte não aparece mais como aba nem como contador no cabeçalho. A etapa Separação permanece.
replaceAllText(
  '    { id: "corte", label: "Corte", contagem: totalCorte },\n',
  '',
  "aba Corte removida da navegação"
);
replaceAllText(
  '            <Stat label="corte" value={totalCorte} />\n',
  '',
  "contador Corte removido do cabeçalho"
);

const normalizador = [
  "",
  "const normalizarItensPersistidos = (lista) => {",
  "  const arr = Array.isArray(lista) ? lista : [];",
  "  const resultado = [];",
  "  const vistos = new Set();",
  "  const preCorte = new Set();",
  "  const texto = (v) => String(v ?? '').trim();",
  "  const assinatura = (i) => JSON.stringify({ pedido: texto(i.pedido), produto: texto(i.produto).toUpperCase(), etapa: i.etapa, qtd: Number(i.qtd) || 0, cor: texto(i.cor), dataCorte: texto(i.dataCorte), sublimador: texto(i.sublimador), dataSublimacao: texto(i.dataSublimacao), equipe: texto(i.equipe), feito: !!i.feito, conferido: !!i.conferido });",
  "  for (const original of arr) {",
  "    const i = { ...original };",
  "    if (!i.pedido || !i.produto) continue;",
  "    if (i.etapa === 'corte') i.etapa = 'aguardando_sublimacao';",
  "    if (!i.etapa) i.etapa = 'costura';",
  "    const chave = texto(i.pedido) + '||' + texto(i.produto).toUpperCase();",
  "    if (i.etapa === 'pre_corte') { if (preCorte.has(chave)) continue; preCorte.add(chave); }",
  "    const fp = assinatura(i);",
  "    if (vistos.has(fp)) continue;",
  "    vistos.add(fp);",
  "    resultado.push(i);",
  "  }",
  "  return resultado;",
  "};",
  ""
].join("\n");

if (!source.includes("const normalizarItensPersistidos = (lista) =>")) {
  source = source.replace("export default function App() {", normalizador + "export default function App() {");
  changed = true;
  console.log("NeoCooler: normalizador de duplicações instalado");
}

const antigo = 'const carregados = JSON.parse(raw);\n          const migrados = carregados.map((i) => ({';
const novo = 'const carregados = JSON.parse(raw);\n          const normalizados = normalizarItensPersistidos(carregados);\n          const migrados = normalizados.map((i) => ({';
if (source.includes(antigo)) {
  source = source.replace(antigo, novo);
  source = source.replace(
    '          setItens(migrados);\n',
    '          setItens(migrados);\n          if (normalizados.length !== carregados.length) salvarValor(STORAGE_KEY, JSON.stringify(migrados));\n'
  );
  changed = true;
  console.log("NeoCooler: limpeza automática ao carregar dados instalada");
}

const blocoExistente = 'const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");';
const blocoProtegido = [
  blocoExistente,
  '    const existentePosterior = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa !== "pre_corte");',
  '    if (existentePosterior) {',
  '      setErro("O pedido #" + numero + " / " + produto + " já está em " + (ETAPA_LABEL[existentePosterior.etapa] || existentePosterior.etapa) + ". Não será criado outro Pré-Corte.");',
  '      return;',
  '    }'
].join("\n");
if (source.includes(blocoExistente) && !source.includes("const existentePosterior = itens.find")) {
  source = source.replace(blocoExistente, blocoProtegido);
  changed = true;
  console.log("NeoCooler: bloqueio de nova duplicação instalado");
}

const globalSearch = [
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
  "    return Array.from(mapa.values());",
  "  }, [itens, termo]);",
  "  const label = (etapa) => ETAPA_LABEL[etapa] || etapa || 'Sem etapa';",
  "  return <div style={{ width: '100%', maxWidth: 760, margin: '0 auto 14px', position: 'relative', zIndex: 30 }}>",
  "    <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder='🔎 Buscar pedido em todas as etapas...' aria-label='Buscar pedido em todas as etapas' style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: '1px solid #cfc2ad', borderRadius: 9, fontSize: 16 }} />",
  "    {termo && <div style={{ background: '#fff', border: '1px solid #d9cdb8', borderRadius: 10, padding: 8, marginTop: 5, boxShadow: '0 3px 10px rgba(0,0,0,.12)' }}>",
  "      {resultados.length ? resultados.map((item) => <button key={String(item.pedido) + '-' + String(item.produto)} type='button' onClick={() => onSelectStage && onSelectStage(item.etapa)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 10px', marginTop: 4, border: '1px solid #e0d5c3', borderRadius: 8, background: '#f8f4ec', cursor: 'pointer', textAlign: 'left' }}><span><strong>#{item.pedido}</strong> · {item.produto || 'Produto não informado'}</span><strong style={{ color: '#df5b24', whiteSpace: 'nowrap' }}>{label(item.etapa)}</strong></button>) : <div style={{ padding: 8 }}>Pedido não encontrado em nenhuma etapa.</div>}",
  "    </div>}",
  "  </div>;",
  "}",
  ""
].join("\n");

if (!source.includes("function GlobalOrderSearch({ itens, onSelectStage })")) {
  source = source.replace("export default function App() {", globalSearch + "export default function App() {");
  changed = true;
  console.log("NeoCooler: pesquisa global instalada");
}

const titulo = '<h1 style={styles.title}>Pré-Corte → Sublimação → Costura</h1>';
if (source.includes(titulo) && !source.includes('<GlobalOrderSearch itens={itens} onSelectStage={setAba} />')) {
  source = source.replace(titulo, '<GlobalOrderSearch itens={itens} onSelectStage={setAba} />\n' + titulo);
  changed = true;
}

if (changed) fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: fix-build executado com sucesso.");
