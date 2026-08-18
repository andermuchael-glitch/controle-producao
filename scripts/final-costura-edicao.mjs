import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// 1) Save function: edit existing item without creating another record.
if (!source.includes("const editarLancamentoFinal = (id, patch) =>")) {
  const anchor = '  const excluirPedidoPreCorte = async (numero) => {';
  if (!source.includes(anchor)) throw new Error("Âncora da edição não encontrada");
  const helper = `  const editarLancamentoFinal = (id, patch) => {\n    const alvo = itens.find((i) => i.id === id);\n    if (!alvo) return;\n    const novaQtd = Math.max(1, Number(patch.qtd) || 1);\n    const novaLista = itens.map((i) => i.id === id ? { ...i, ...patch, qtd: novaQtd } : i);\n    salvar(novaLista);\n  };\n\n`;
  source = source.replace(anchor, helper + anchor);
}

// 2) Aguardando Costura: always show an Edit button for color, quantity and team.
const aguardandoRegex = /\{p\.itens\.map\(\(it\) => \(\s*<div key=\{it\.id\} style=\{styles\.itemLinha\} className="item-linha">[\s\S]*?<button style=\{styles\.removerBtn\} onClick=\{\(\) => removerItem\(it\.id\)\}>×<\\/button>\s*<\\/div>\s*\)\)\}/;
const aguardandoReplacement = `{p.itens.map((it) => (\n                      <ItemCosturaEditavelFinal key={it.id} it={it} onEdit={editarLancamentoFinal} onEquipe={setEquipeItem} onRemover={removerItem} onEnviar={() => moverParaCostura(it.id)} enviarLabel="Enviar p/ costura" />\n                    ))}`;
if (aguardandoRegex.test(source)) {
  source = source.replace(aguardandoRegex, aguardandoReplacement);
} else if (!source.includes("ItemCosturaEditavelFinal key={it.id}")) {
  throw new Error("Bloco de Aguardando Costura não encontrado");
}

// 3) Costura: replace the whole card component with an editable version.
const componentStart = source.indexOf("function PedidoCosturaCard(");
const stylesStart = source.indexOf("\nconst styles = {", componentStart);
if (componentStart === -1 || stylesStart === -1) throw new Error("Cartão de Costura não encontrado");

const component = `function ItemCosturaEditavelFinal({ it, onEdit, onEquipe, onRemover, onEnviar, enviarLabel, showFeito = false, onToggle }) {\n  const [editando, setEditando] = useState(false);\n  const [cor, setCor] = useState(it.cor || CORES[0].nome);\n  const [quantidade, setQuantidade] = useState(it.qtd);\n  const [equipe, setEquipe] = useState(it.equipe || EQUIPES[0]);\n\n  useEffect(() => {\n    if (!editando) {\n      setCor(it.cor || CORES[0].nome);\n      setQuantidade(it.qtd);\n      setEquipe(it.equipe || EQUIPES[0]);\n    }\n  }, [it.id, it.cor, it.qtd, it.equipe, editando]);\n\n  const salvarEdicao = () => {\n    onEdit(it.id, { cor, qtd: quantidade, equipe });\n    setEditando(false);\n  };\n\n  if (editando) {\n    return (\n      <div style={styles.edicaoCosturaBox}>\n        <b style={styles.edicaoCosturaTitulo}>Editar lançamento</b>\n        <div style={styles.edicaoCosturaGrid}>\n          <div style={styles.corSelectWrap}>\n            <span style={{ ...styles.swatch, background: corHex(cor) }} />\n            <select style={{ ...styles.input, paddingLeft: 34 }} value={cor} onChange={(e) => setCor(e.target.value)}>\n              {CORES.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}\n            </select>\n          </div>\n          <input style={styles.input} type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />\n          <select style={styles.input} value={equipe} onChange={(e) => setEquipe(e.target.value)}>\n            {EQUIPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}\n          </select>\n        </div>\n        <div style={styles.edicaoCosturaAcoes}>\n          <button style={styles.enviarBtn} onClick={salvarEdicao}>Salvar alteração</button>\n          <button style={styles.cancelarEdicaoBtn} onClick={() => setEditando(false)}>Cancelar</button>\n        </div>\n      </div>\n    );\n  }\n\n  return (\n    <div style={styles.itemLinha} className="item-linha">\n      {showFeito && (\n        <button onClick={() => onToggle(it.id)} style={{ ...styles.checkbox, background: it.feito ? "#1f8a3d" : "#fff", borderColor: it.feito ? "#1f8a3d" : "#cfc6b8" }}>\n          {it.feito && "✓"}\n        </button>\n      )}\n      <span style={{ ...styles.swatchSm, background: corHex(it.cor) }} />\n      <span style={{ ...styles.itemTexto, textDecoration: it.feito ? "line-through" : "none", opacity: it.feito ? 0.55 : 1 }}>\n        {it.produto} <b>· {it.cor || "SEM COR"}</b> · {it.qtd}un\n      </span>\n      <select style={styles.equipeSelect} value={it.equipe || EQUIPES[0]} onChange={(e) => onEquipe(it.id, e.target.value)}>\n        {EQUIPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}\n      </select>\n      {onEnviar && <button style={styles.enviarBtn} onClick={onEnviar}>{enviarLabel}</button>}\n      <button style={styles.editarBtn} onClick={() => setEditando(true)}>Editar</button>\n      <button style={styles.removerBtn} onClick={() => onRemover(it.id)}>×</button>\n    </div>\n  );\n}\n\nfunction PedidoCosturaCard({ pedido, onToggle, onRemover, onEquipe, onFinalizar, onEdit }) {\n  const pctInt = Math.round(pedido.pct * 100);\n  const urg = pedido.dataEntrega ? urgenciaInfo(pedido.dataEntrega) : null;\n  return (\n    <div style={{ ...styles.pedidoCard, ...(pedido.completo ? styles.pedidoCompleto : {}) }} className="card pedido-card">\n      <div style={styles.pedidoTop}>\n        <div style={styles.pedidoNumWrap}>\n          <span style={styles.pedidoNum}>#{pedido.numero}</span>\n          {pedido.completo && <span style={styles.badgeCompleto}>pronto p/ expedir</span>}\n          {!pedido.completo && urg && <span style={{ ...styles.badgeUrgencia, background: urg.fundo, color: urg.cor }}>{formatarDataBR(pedido.dataEntrega)} · {urg.texto}</span>}\n        </div>\n        <span style={styles.pctText}>{pctInt}%</span>\n      </div>\n      <div style={styles.barraTrack}><div style={{ ...styles.barraFill, width: pctInt + "%", background: pedido.completo ? "#1f8a3d" : "#d8622c" }} /></div>\n      <div style={styles.itensLista}>\n        {pedido.itens.map((it) => (\n          <ItemCosturaEditavelFinal key={it.id} it={it} onToggle={onToggle} onRemover={onRemover} onEquipe={onEquipe} onEdit={onEdit} showFeito />\n        ))}\n      </div>\n      {pedido.completo && <button style={styles.finalizarBtn} onClick={() => onFinalizar(pedido.numero)}>Mover pedido p/ separação →</button>}\n    </div>\n  );\n}\n`;
source = source.slice(0, componentStart) + component + source.slice(stylesStart);

// 4) Pass the edit callback to Costura.
source = source.replace(
  /<PedidoCosturaCard key=\{p\.numero\} pedido=\{p\} onToggle=\{toggleFeito\} onRemover=\{removerItem\} onEquipe=\{setEquipeItem\} onFinalizar=\{moverPedidoParaSeparacao\} \/>/,
  '<PedidoCosturaCard key={p.numero} pedido={p} onToggle={toggleFeito} onRemover={removerItem} onEquipe={setEquipeItem} onEdit={editarLancamentoFinal} onFinalizar={moverPedidoParaSeparacao} />'
);

// 5) Add visible editor styles.
if (!source.includes("editarBtn:")) {
  const anchor = '  removerBtn: {';
  const styles = `  editarBtn: { background: "#fffdf8", color: "#1c2a3a", border: "1px solid #9aa8b8", borderRadius: 8, padding: "7px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },\n  edicaoCosturaBox: { background: "#edf3f7", border: "2px solid #8ea0b1", borderRadius: 10, padding: 10, width: "100%" },\n  edicaoCosturaTitulo: { display: "block", fontSize: 12, color: "#39495b", marginBottom: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif" },\n  edicaoCosturaGrid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr", gap: 7 },\n  edicaoCosturaAcoes: { display: "flex", gap: 7, marginTop: 8 },\n  cancelarEdicaoBtn: { border: "1px solid #b8ac95", background: "#fff", color: "#5c5343", borderRadius: 7, padding: "7px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" },\n`;
  if (!source.includes(anchor)) throw new Error("Estilo removerBtn não encontrado");
  source = source.replace(anchor, styles + anchor);
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: FINAL — edição em Aguardando Costura e Costura aplicada diretamente antes do build.");
