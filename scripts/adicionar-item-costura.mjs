import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
const marker = "/* ADICIONAR_ITEM_COSTURA_V1 */";
if (source.includes(marker)) {
  console.log("NeoCooler: adicionar item extra na Costura já aplicado.");
  process.exit(0);
}

const fnAnchor = '  const excluirPedidoPreCorte = async (numero) => {';
const fn = `  ${marker}\n  const adicionarItemCostura = (numero, dados) => {\n    const novo = {\n      id: uid(),\n      pedido: numero,\n      produto: dados.produto || PRODUTOS[0],\n      cor: dados.cor || CORES[0].nome,\n      qtd: Math.max(1, Number(dados.qtd) || 1),\n      etapa: "costura",\n      equipe: dados.equipe || EQUIPES[0],\n      feito: false,\n      conferido: false,\n      criadoEm: Date.now(),\n      adicionadoManualCostura: true,\n    };\n    salvar([...itens, novo]);\n  };\n\n`;
if (!source.includes(fnAnchor)) throw new Error("NeoCooler: âncora para adicionar item na Costura não encontrada.");
source = source.replace(fnAnchor, fn + fnAnchor);

const oldCall = '<PedidoCosturaCard key={p.numero} pedido={p} onToggle={toggleFeito} onRemover={removerItem} onEquipe={setEquipeItem} onEdit={editarLancamentoCostura} onFinalizar={moverPedidoParaSeparacao} />';
const newCall = '<PedidoCosturaCard key={p.numero} pedido={p} onToggle={toggleFeito} onRemover={removerItem} onEquipe={setEquipeItem} onEdit={editarLancamentoCostura} onAddItem={adicionarItemCostura} onFinalizar={moverPedidoParaSeparacao} />';
if (source.includes(oldCall)) source = source.replace(oldCall, newCall);

const oldStart = 'function PedidoCosturaCard({ pedido, onToggle, onRemover, onEquipe, onEdit, onFinalizar }) {';
const start = source.indexOf(oldStart);
const end = source.indexOf('\nconst styles = {', start);
if (start === -1 || end === -1) throw new Error("NeoCooler: componente PedidoCosturaCard não encontrado.");

const component = `function AdicionarItemCostura({ pedido, onAddItem }) {\n  const [aberto, setAberto] = useState(false);\n  const [produto, setProduto] = useState(PRODUTOS[0]);\n  const [cor, setCor] = useState(CORES[0].nome);\n  const [qtd, setQtd] = useState(1);\n  const [equipe, setEquipe] = useState(EQUIPES[0]);\n\n  const salvarNovo = () => {\n    onAddItem(pedido.numero, { produto, cor, qtd, equipe });\n    setQtd(1);\n    setAberto(false);\n  };\n\n  if (!aberto) return <button style={styles.adicionarItemCosturaBtn} onClick={() => setAberto(true)}>+ Adicionar item produzido</button>;\n\n  return (\n    <div style={styles.adicionarItemCosturaBox}>\n      <div style={styles.edicaoCosturaTitulo}>Adicionar item produzido fora do pedido</div>\n      <div style={styles.adicaoCosturaGrid}>\n        <select style={styles.input} value={produto} onChange={(e) => setProduto(e.target.value)}>\n          {PRODUTOS.map((p) => <option key={p} value={p}>{p}</option>)}\n        </select>\n        <select style={styles.input} value={cor} onChange={(e) => setCor(e.target.value)}>\n          {CORES.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}\n        </select>\n        <input style={styles.input} type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} />\n        <select style={styles.input} value={equipe} onChange={(e) => setEquipe(e.target.value)}>\n          {EQUIPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}\n        </select>\n      </div>\n      <div style={styles.edicaoCosturaAcoes}>\n        <button style={styles.enviarBtn} onClick={salvarNovo}>Adicionar à costura</button>\n        <button style={styles.removerBtn} onClick={() => setAberto(false)}>Cancelar</button>\n      </div>\n    </div>\n  );\n}\n\nfunction PedidoCosturaCard({ pedido, onToggle, onRemover, onEquipe, onEdit, onAddItem, onFinalizar }) {\n  const pctInt = Math.round(pedido.pct * 100);\n  const urg = pedido.dataEntrega ? urgenciaInfo(pedido.dataEntrega) : null;\n  return (\n    <div style={{ ...styles.pedidoCard, ...(pedido.completo ? styles.pedidoCompleto : {}) }} className="card pedido-card">\n      <div style={styles.pedidoTop}>\n        <div style={styles.pedidoNumWrap}>\n          <span style={styles.pedidoNum}>#{pedido.numero}</span>\n          {pedido.completo && <span style={styles.badgeCompleto}>pronto p/ expedir</span>}\n          {!pedido.completo && urg && <span style={{ ...styles.badgeUrgencia, background: urg.fundo, color: urg.cor }}>{formatarDataBR(pedido.dataEntrega)} · {urg.texto}</span>}\n        </div>\n        <span style={styles.pctText}>{pctInt}%</span>\n      </div>\n      <div style={styles.barraTrack}><div style={{ ...styles.barraFill, width: (pctInt + "%"), background: pedido.completo ? "#1f8a3d" : "#d8622c" }} /></div>\n      <div style={styles.itensLista}>\n        {pedido.itens.map((it) => <ItemCosturaEditavel key={it.id} it={it} onToggle={onToggle} onRemover={onRemover} onEquipe={onEquipe} onEdit={onEdit} showFeito />)}\n      </div>\n      <AdicionarItemCostura pedido={pedido} onAddItem={onAddItem} />\n      {pedido.completo && <button style={styles.finalizarBtn} onClick={() => onFinalizar(pedido.numero)}>Mover pedido p/ separação →</button>}\n    </div>\n  );\n}\n`;
source = source.slice(0, start) + component + source.slice(end);

const styleAnchor = '  removerBtn: {';
const stylesInsert = `  adicionarItemCosturaBtn: { marginTop: 10, width: "100%", background: "#fffdf8", color: "#1c2a3a", border: "1px dashed #9aa8b8", borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif" },\n  adicionarItemCosturaBox: { marginTop: 10, background: "#f4f7fa", border: "1px solid #9aa8b8", borderRadius: 10, padding: 10 },\n  adicaoCosturaGrid: { display: "grid", gridTemplateColumns: "1.4fr 1fr 0.6fr 1fr", gap: 7 },\n`;
if (!source.includes(styleAnchor)) throw new Error("NeoCooler: âncora de estilos não encontrada.");
source = source.replace(styleAnchor, stylesInsert + styleAnchor);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: Costura agora permite adicionar itens produzidos fora do pedido.");
