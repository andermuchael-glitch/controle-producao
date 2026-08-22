import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const fixes = [
  [
    "limparTudo",
    'setConfirmarLimpeza(false);const exportarXLSX = () => {',
    'setConfirmarLimpeza(false);\n  };\n\n  const exportarXLSX = () => {'
  ],
  [
    "cabecalho-fluxo-sem-corte",
    '<h1 style={styles.title}>Corte → Costura</h1>',
    '<h1 style={styles.title}>Pré-Corte → Sublimação → Costura</h1>'
  ],
  [
    "subtitulo-fluxo-sem-corte",
    'Do corte até a expedição, pedido por pedido',
    'Do pré-corte até a expedição, pedido por pedido'
  ],
  [
    "remover-contador-corte",
    '            <Stat label="corte" value={totalCorte} />\n',
    ''
  ],
  [
    "remover-aba-corte",
    '    { id: "corte", label: "Corte", contagem: totalCorte },\n',
    ''
  ],
  [
    "migrar-itens-legados-de-corte",
    '            etapa: i.etapa || "costura",',
    '            etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "costura"),'
  ],
  [
    "marcar-cortado-direto-aguardando-sublimacao",
    '      etapa: "corte",\n      cortador: "Patrick",',
    '      etapa: "aguardando_sublimacao",\n      cortador: "Patrick",'
  ],
  [
    "texto-pre-corte-sem-aba-corte",
    'Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa para a aba Corte.',
    'Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa diretamente para Aguardando Sublimação.'
  ],
  [
    "texto-aguardando-sem-aba-corte",
    'Nada aguardando sublimação. Mova itens pela aba Corte.',
    'Nada aguardando sublimação. Marque os itens como cortados no Pré-Corte.'
  ]
];

let changed = false;
for (const [name, from, to] of fixes) {
  if (source.includes(from) && from !== to) {
    source = source.replace(from, to);
    changed = true;
    console.log(`NeoCooler: correção ${name} aplicada.`);
  }
}

// Corte não faz mais parte do fluxo visual. Dados antigos em Corte são tratados
// como Aguardando Sublimação para não fazer o pedido voltar para o Pré-Corte.
source = source.replace(/\n\s*\{ id: "corte", label: "Corte", contagem: totalCorte \},/g, "");

// Pesquisa global: procura o pedido em TODOS os itens, independentemente da aba
// atualmente selecionada, e mostra imediatamente a etapa encontrada.
const globalSearchComponent = `

function GlobalOrderSearch({ itens, onSelectStage }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const encontrados = useMemo(() => {
    if (!termo) return [];
    const vistos = new Set();
    return itens
      .filter((i) => String(i.pedido || "").toLowerCase().includes(termo))
      .filter((i) => {
        const chave = [i.pedido, i.produto, i.etapa].join("||");
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
      })
      .sort((a, b) => Number(a.pedido || 0) - Number(b.pedido || 0));
  }, [itens, termo]);

  const etapaReal = (etapa) => etapa === "corte" ? "aguardando_sublimacao" : etapa;
  const etapaTexto = (etapa) => ETAPA_LABEL[etapaReal(etapa)] || etapa || "Sem etapa";

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
            ) : (
              encontrados.map((item) => (
                <button
                  key={`${item.id || item.pedido}-${item.produto}-${item.etapa}`}
                  type="button"
                  onClick={() => onSelectStage?.(etapaReal(item.etapa))}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 5, padding: "8px 10px", border: "1px solid #e0d5c3", borderRadius: 8, background: "#f8f4ec", cursor: "pointer", textAlign: "left" }}
                >
                  <span><strong>#{item.pedido}</strong> · {item.produto || "Produto não informado"}</span>
                  <strong style={{ color: "#df5b24", whiteSpace: "nowrap" }}>{etapaTexto(item.etapa)}</strong>
                </button>
              ))
            )}
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

// Renderiza a busca no cabeçalho, antes do título, para que ela fique sempre disponível.
const headerAnchor = '<h1 style={styles.title}>Pré-Corte → Sublimação → Costura</h1>';
if (source.includes(headerAnchor) && !source.includes('<GlobalOrderSearch itens={itens} onSelectStage={setAba} />')) {
  source = source.replace(headerAnchor, '<GlobalOrderSearch itens={itens} onSelectStage={setAba} />\n' + headerAnchor);
  changed = true;
}

if (changed) fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: preparação do build concluída.");
`;

if (changed) fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: preparação do build concluída.");
