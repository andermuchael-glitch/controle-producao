import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const fixes = [
  ["limparTudo", 'setConfirmarLimpeza(false);const exportarXLSX = () => {', 'setConfirmarLimpeza(false);\n  };\n\n  const exportarXLSX = () => {'],
  ["cabecalho-fluxo-sem-corte", '<h1 style={styles.title}>Corte → Costura</h1>', '<h1 style={styles.title}>Pré-Corte → Sublimação → Costura</h1>'],
  ["subtitulo-fluxo-sem-corte", 'Do corte até a expedição, pedido por pedido', 'Do pré-corte até a expedição, pedido por pedido'],
  ["remover-contador-corte", '            <Stat label="corte" value={totalCorte} />\n', ''],
  ["remover-aba-corte", '    { id: "corte", label: "Corte", contagem: totalCorte },\n', ''],
  ["migrar-itens-legados-de-corte", '            etapa: i.etapa || "costura",', '            etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "costura"),'],
  ["marcar-cortado-direto-aguardando-sublimacao", '      etapa: "corte",\n      cortador: "Patrick",', '      etapa: "aguardando_sublimacao",\n      cortador: "Patrick",'],
  ["texto-pre-corte-sem-aba-corte", 'Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa para a aba Corte.', 'Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa diretamente para Aguardando Sublimação.'],
  ["texto-aguardando-sem-aba-corte", 'Nada aguardando sublimação. Mova itens pela aba Corte.', 'Nada aguardando sublimação. Marque os itens como cortados no Pré-Corte.']
];

let changed = false;
for (const [name, from, to] of fixes) {
  if (source.includes(from) && from !== to) {
    source = source.replace(from, to);
    changed = true;
    console.log(`NeoCooler: correção ${name} aplicada.`);
  }
}

// A etapa Corte não existe mais no fluxo visual. Qualquer registro legado é
// convertido para Aguardando Sublimação, sem recriar o item no Pré-Corte.
source = source.replace(/\n\s*\{ id: "corte", label: "Corte", contagem: totalCorte \},/g, "");

// Normalização defensiva dos dados carregados do Firebase:
// - remove duplicações exatas;
// - mantém somente o primeiro Pré-Corte de cada pedido/produto (o original);
// - converte registros antigos de Corte para Aguardando Sublimação;
// - nunca permite que uma correção de etapa crie um novo item no Pré-Corte.
const normalizador = `

const normalizarItensPersistidos = (lista) => {
  const arr = Array.isArray(lista) ? lista : [];
  const etapas = {
    pre_corte: 0,
    corte: 1,
    aguardando_sublimacao: 2,
    sublimacao: 3,
    aguardando_costura: 4,
    costura: 5,
    separacao: 6,
  };
  const preOriginais = new Map();
  const resultado = [];
  const vistos = new Set();

  const valor = (v) => String(v ?? "").trim();
  const fingerprint = (i) => JSON.stringify({
    pedido: valor(i.pedido),
    produto: valor(i.produto).toUpperCase(),
    etapa: i.etapa === "corte" ? "aguardando_sublimacao" : valor(i.etapa),
    qtd: Number(i.qtd) || 0,
    cor: valor(i.cor),
    cortador: valor(i.cortador),
    dataCorte: valor(i.dataCorte),
    sublimador: valor(i.sublimador),
    dataSublimacao: valor(i.dataSublimacao),
    equipe: valor(i.equipe),
    feito: !!i.feito,
    conferido: !!i.conferido,
  });

  const ordenados = [...arr].sort((a, b) => {
    const ea = etapas[a.etapa] ?? 99;
    const eb = etapas[b.etapa] ?? 99;
    if (ea !== eb) return ea - eb;
    return Number(a.criadoEm || 0) - Number(b.criadoEm || 0);
  });

  for (const original of ordenados) {
    const i = { ...original };
    if (!i.pedido || !i.produto) continue;
    if (i.etapa === "corte") i.etapa = "aguardando_sublimacao";
    if (!i.etapa) i.etapa = "costura";

    const pedido = valor(i.pedido);
    const produto = valor(i.produto).toUpperCase();
    const chavePre = pedido + "||" + produto;

    if (i.etapa === "pre_corte") {
      if (preOriginais.has(chavePre)) continue;
      preOriginais.set(chavePre, i.id || chavePre);
    }

    const fp = fingerprint(i);
    if (vistos.has(fp)) continue;
    vistos.add(fp);
    resultado.push(i);
  }

  return resultado;
};
`;

if (!source.includes("const normalizarItensPersistidos = (lista) =>")) {
  source = source.replace("export default function App() {", normalizador + "\nexport default function App() {");
  changed = true;
}

// Usa a normalização no carregamento inicial e persiste a limpeza no Firebase.
const trechoCarregamento = 'const carregados = JSON.parse(raw);\n          const migrados = carregados.map((i) => ({';
if (source.includes(trechoCarregamento) && !source.includes('const normalizados = normalizarItensPersistidos(carregados);')) {
  source = source.replace(
    trechoCarregamento,
    'const carregados = JSON.parse(raw);\n          const normalizados = normalizarItensPersistidos(carregados);\n          const migrados = normalizados.map((i) => ({'
  );
  const fechamento = '          setItens(migrados);\n';
  source = source.replace(fechamento, '          setItens(migrados);\n          if (normalizados.length !== carregados.length) salvarValor(STORAGE_KEY, JSON.stringify(migrados));\n');
  changed = true;
}

// Impede novo lançamento no Pré-Corte quando o mesmo pedido/produto já possui
// qualquer item no fluxo. Isso evita que uma etapa posterior volte a aparecer
// como uma nova entrada de Pré-Corte.
const blocoDuplicacao = 'const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");';
if (source.includes(blocoDuplicacao) && !source.includes('const existenteEmQualquerEtapa = itens.find((i) => i.pedido === numero && i.produto === produto);')) {
  source = source.replace(
    blocoDuplicacao,
    'const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");\n    const existenteEmQualquerEtapa = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa !== "pre_corte");\n    if (existenteEmQualquerEtapa) {\n      setErro(`O pedido #${numero} / ${produto} já está em uma etapa posterior (${ETAPA_LABEL[existenteEmQualquerEtapa.etapa] || existenteEmQualquerEtapa.etapa}). Não será criado outro Pré-Corte.`);\n      return;\n    }'
  );
  changed = true;
}

const globalSearchComponent = `

function GlobalOrderSearch({ itens, onSelectStage }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const encontrados = useMemo(() => {
    if (!termo) return [];
    const grupos = new Map();
    const ordem = { pre_corte: 0, corte: 1, aguardando_sublimacao: 2, sublimacao: 3, aguardando_costura: 4, costura: 5, separacao: 6 };
    for (const item of itens) {
      if (!String(item.pedido || "").toLowerCase().includes(termo)) continue;
      const chave = [item.pedido, item.produto].join("||");
      const atual = grupos.get(chave);
      const etapa = item.etapa === "corte" ? "aguardando_sublimacao" : item.etapa;
      if (!atual || (ordem[etapa] ?? -1) > (ordem[atual.etapa] ?? -1)) grupos.set(chave, { ...item, etapa });
    }
    return [...grupos.values()].sort((a, b) => Number(a.pedido || 0) - Number(b.pedido || 0));
  }, [itens, termo]);

  const etapaTexto = (etapa) => ETAPA_LABEL[etapa === "corte" ? "aguardando_sublimacao" : etapa] || etapa || "Sem etapa";

  return (
    <div style={{ width: "100%", maxWidth: 760, margin: "0 auto 14px", position: "relative", zIndex: 20 }}>
      <div style={{ background: "#fff", border: "1px solid #d9cdb8", borderRadius: 12, padding: 10, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="🔎 Buscar pedido em todas as etapas..."
          aria-label="Buscar pedido em todas as etapas"
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", border: "1px solid #cfc2ad", borderRadius: 9, fontSize: 16, outline: "none" }}
        />
        {termo && (
          <div style={{ marginTop: 8 }}>
            {encontrados.length === 0 ? (
              <div style={{ padding: 8, color: "#8b8172", fontSize: 13 }}>Pedido não encontrado em nenhuma etapa.</div>
            ) : encontrados.map((item) => (
              <button key={`${item.pedido}-${item.produto}`} type="button" onClick={() => onSelectStage?.(item.etapa)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 5, padding: "8px 10px", border: "1px solid #e0d5c3", borderRadius: 8, background: "#f8f4ec", cursor: "pointer", textAlign: "left" }}>
                <span><strong>#{item.pedido}</strong> · {item.produto || "Produto não informado"}</span>
                <strong style={{ color: "#df5b24", whiteSpace: "nowrap" }}>{etapaTexto(item.etapa)}</strong>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
`;

if (!source.includes("function GlobalOrderSearch({ itens, onSelectStage })")) {
  source = source.replace("export default function App() {", globalSearchComponent + "\nexport default function App() {");
  changed = true;
}

const headerAnchor = '<h1 style={styles.title}>Pré-Corte → Sublimação → Costura</h1>';
if (source.includes(headerAnchor) && !source.includes('<GlobalOrderSearch itens={itens} onSelectStage={setAba} />')) {
  source = source.replace(headerAnchor, '<GlobalOrderSearch itens={itens} onSelectStage={setAba} />\n' + headerAnchor);
  changed = true;
}

if (changed) fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: preparação do build concluída.");
