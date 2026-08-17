import fs from "node:fs";

const APP = "src/App.jsx";
const STORAGE = "src/storage.js";
const RULES = "firestore.rules";

let app = fs.readFileSync(APP, "utf8");
let storage = fs.readFileSync(STORAGE, "utf8");

if (app.includes("// PRE_CORTE_AUDIT_V1")) process.exit(0);

storage = storage.replace(
  'import { doc, onSnapshot, setDoc } from "firebase/firestore";',
  'import { addDoc, collection, doc, onSnapshot, query, orderBy, limit, onSnapshot as onSnapshotQuery, setDoc } from "firebase/firestore";'
);
storage += `

// PRE_CORTE_AUDIT_V1
const AUDIT_COLLECTION = "auditoriaProducao";

export async function registrarAuditoria(registro) {
  if (!firebaseConfigurado) return false;
  try {
    await addDoc(collection(db, AUDIT_COLLECTION), { ...registro, criadoEm: Date.now() });
    return true;
  } catch (e) {
    return false;
  }
}

export function inscreverAuditoria(callback) {
  if (!firebaseConfigurado) { callback([], null); return () => {}; }
  const q = query(collection(db, AUDIT_COLLECTION), orderBy("criadoEm", "desc"), limit(300));
  return onSnapshotQuery(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })), null), (erro) => callback([], erro));
}
`;
fs.writeFileSync(STORAGE, storage);

app = app.replace('import { inscrever, salvarValor } from "./storage.js";', 'import { inscrever, salvarValor, registrarAuditoria, inscreverAuditoria } from "./storage.js";');
app = app.replace('import { firebaseConfigurado } from "./firebase.js";', 'import { auth, firebaseConfigurado } from "./firebase.js";');
app = app.replace('const META_KEY = "costura:pedidosMeta";', 'const META_KEY = "costura:pedidosMeta";\nconst AUDIT_ADMIN_EMAIL = "andermuchael@gmail.com";\n// PRE_CORTE_AUDIT_V1');
app = app.replace('  const [mostrarDrive, setMostrarDrive] = useState(false);', '  const [mostrarDrive, setMostrarDrive] = useState(false);\n  const [mostrarAuditoria, setMostrarAuditoria] = useState(false);\n  const [auditoria, setAuditoria] = useState([]);');

app = app.replace('  const salvar = async (novaLista) => {', `  useEffect(() => {
    if (!mostrarAuditoria || auth?.currentUser?.email?.toLowerCase() !== AUDIT_ADMIN_EMAIL) return () => {};
    return inscreverAuditoria((registros, erroSnap) => {
      if (erroSnap) setErro("Não foi possível carregar o histórico de auditoria.");
      else setAuditoria(registros);
    });
  }, [mostrarAuditoria]);

  const registrarDiffAuditoria = async (antes, depois) => {
    const antesMap = Object.fromEntries(antes.map((i) => [i.id, i]));
    const depoisMap = Object.fromEntries(depois.map((i) => [i.id, i]));
    const adicionados = depois.filter((i) => !antesMap[i.id]);
    const removidos = antes.filter((i) => !depoisMap[i.id]);
    const alterados = depois.filter((i) => antesMap[i.id] && JSON.stringify(antesMap[i.id]) !== JSON.stringify(i));
    if (!adicionados.length && !removidos.length && !alterados.length) return;
    const user = auth?.currentUser;
    if (!user) return;
    const amostra = [...adicionados, ...removidos, ...alterados][0];
    await registrarAuditoria({
      usuarioEmail: user.email || "desconhecido",
      usuarioNome: user.displayName || user.email || "desconhecido",
      acao: removidos.length ? "exclusão" : adicionados.length ? "criação" : "alteração",
      pedido: amostra?.pedido || "",
      detalhes: `${adicionados.length} criação(ões), ${alterados.length} alteração(ões), ${removidos.length} exclusão(ões)`,
    });
  };

  const salvar = async (novaLista) => {`);
app = app.replace(`  const salvar = async (novaLista) => {
    setItens(novaLista);
    const ok = await salvarValor(STORAGE_KEY, JSON.stringify(novaLista));
    setErro(ok ? "" : "Não foi possível salvar. Verifique sua conexão ou as chaves do Firebase.");
  };`, `  const salvar = async (novaLista) => {
    const anterior = itens;
    setItens(novaLista);
    const ok = await salvarValor(STORAGE_KEY, JSON.stringify(novaLista));
    if (ok) await registrarDiffAuditoria(anterior, novaLista);
    setErro(ok ? "" : "Não foi possível salvar. Verifique sua conexão ou as chaves do Firebase.");
  };`);

app = app.replace(`  const adicionarItem = () => {
    if (!pedido.trim()) return;
    const novo = {`, `  const adicionarItem = () => {
    const numero = pedido.trim();
    if (!numero) return;
    const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");
    if (existente) {
      setErro(\`O pedido #\${numero} já possui \${produto} no pré-corte. Para evitar duplicação, use o lançamento existente.\`);
      return;
    }
    const novo = {`);
app = app.replace('      pedido: pedido.trim(),\n      produto,', '      pedido: numero,\n      produto,');
app = app.replace('    if (dataEntregaForm) definirDataEntrega(pedido.trim(), dataEntregaForm);', '    if (dataEntregaForm) definirDataEntrega(numero, dataEntregaForm);');

app = app.replace('    const itensPre = itens.filter((i) => i.etapa === "pre_corte");', '    const itensPre = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte);');
app = app.replace('    return pedidosArr.filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase()));\n  }, [itens, pedidosMeta, filtroPedido]);', '    return pedidosArr.filter((p) => p.linhas.some((l) => l.restante > 0)).filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase()));\n  }, [itens, pedidosMeta, filtroPedido]);', 1);

app = app.replace('  const removerItem = (id) => {', `  const excluirPedidoPreCorte = async (numero) => {
    if (!window.confirm(\`Excluir o pedido #\${numero} do Pré-Corte?\\n\\nEle ficará oculto do Pré-Corte e a ação será registrada no histórico.\`)) return;
    const user = auth?.currentUser;
    const novoMeta = { ...pedidosMeta, [numero]: { ...(pedidosMeta[numero] || {}), excluidoPreCorte: true, excluidoPreCorteEm: Date.now() } };
    setPedidosMeta(novoMeta);
    await salvarValor(META_KEY, JSON.stringify(novoMeta));
    if (user) await registrarAuditoria({
      usuarioEmail: user.email || "desconhecido",
      usuarioNome: user.displayName || user.email || "desconhecido",
      acao: "exclusão de pedido do pré-corte",
      pedido: numero,
      detalhes: "Pedido ocultado do Pré-Corte por exclusão manual.",
    });
  };

  const removerItem = (id) => {`);

app = app.replace('                    <span style={styles.pctText}>{p.cortadoGeral}/{p.totalGeral} cortado</span>\n                  </div>', '                    <span style={styles.pctText}>{p.cortadoGeral}/{p.totalGeral} cortado</span>\n                    <button style={styles.excluirPedidoBtn} onClick={() => excluirPedidoPreCorte(p.numero)}>Excluir pedido</button>\n                  </div>');
app = app.replace('          <button style={styles.limparBtn} onClick={() => setConfirmarLimpeza(true)} disabled={itens.length === 0}>🗑 Limpar tudo</button>', '          {auth?.currentUser?.email?.toLowerCase() === AUDIT_ADMIN_EMAIL && (\n            <button style={styles.exportBtnOutline} onClick={() => setMostrarAuditoria(true)}>🕘 Histórico</button>\n          )}\n          <button style={styles.limparBtn} onClick={() => setConfirmarLimpeza(true)} disabled={itens.length === 0}>🗑 Limpar tudo</button>');

app = app.replace('        {mostrarDrive && (', `        {mostrarAuditoria && auth?.currentUser?.email?.toLowerCase() === AUDIT_ADMIN_EMAIL && (
          <div style={styles.modalOverlay} onClick={() => setMostrarAuditoria(false)}>
            <div style={{ ...styles.modalBox, maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <h3 style={styles.modalTitle}>Histórico de alterações</h3>
                <button style={styles.modalFechar} onClick={() => setMostrarAuditoria(false)}>Fechar</button>
              </div>
              {auditoria.length === 0 ? <p style={styles.vazio}>Nenhum registro encontrado.</p> : (
                <div style={{ maxHeight: 520, overflow: "auto" }}>
                  {auditoria.map((r) => (
                    <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #e4dbc8" }}>
                      <b>{r.acao}</b> · pedido <b>#{r.pedido || "-"}</b><br />
                      <span style={{ fontSize: 12, color: "#6f6658" }}>{r.usuarioEmail} · {new Date(r.criadoEm).toLocaleString("pt-BR")}</span><br />
                      <span style={{ fontSize: 12 }}>{r.detalhes || ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {mostrarDrive && (`);
app = app.replace('  limparBtn: {', '  excluirPedidoBtn: { border: "1px solid #c81e2c", color: "#a51d2d", background: "#fff7f7", borderRadius: 8, padding: "7px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" },\n  limparBtn: {');

fs.writeFileSync(APP, app);
fs.writeFileSync(RULES, `rules_version = '2';\n\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /controleProducao/{document} {\n      allow read, write: if request.auth != null;\n    }\n    match /auditoriaProducao/{registro} {\n      allow create: if request.auth != null && request.resource.data.usuarioEmail == request.auth.token.email;\n      allow read: if request.auth != null && request.auth.token.email == 'andermuchael@gmail.com';\n      allow update, delete: if false;\n    }\n  }\n}\n`);

console.log("Pre-Corte audit patch applied");
