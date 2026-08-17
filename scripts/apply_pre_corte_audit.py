from pathlib import Path

APP = Path('src/App.jsx')
STORAGE = Path('src/storage.js')
RULES = Path('firestore.rules')

app = APP.read_text(encoding='utf-8')
storage = STORAGE.read_text(encoding='utf-8')

if '// PRE_CORTE_AUDIT_V1' in app:
    raise SystemExit('already patched')

# --- storage: audit helpers ---
old_storage_import = 'import { doc, onSnapshot, setDoc } from "firebase/firestore";'
new_storage_import = 'import { addDoc, collection, doc, onSnapshot, query, orderBy, limit, onSnapshot as onSnapshotQuery, setDoc } from "firebase/firestore";'
storage = storage.replace(old_storage_import, new_storage_import, 1)

storage += r'''

// PRE_CORTE_AUDIT_V1
const AUDIT_COLLECTION = "auditoriaProducao";

export async function registrarAuditoria(registro) {
  if (!firebaseConfigurado) return false;
  try {
    await addDoc(collection(db, AUDIT_COLLECTION), {
      ...registro,
      criadoEm: Date.now(),
    });
    return true;
  } catch (e) {
    return false;
  }
}

export function inscreverAuditoria(callback) {
  if (!firebaseConfigurado) {
    callback([], null);
    return () => {};
  }
  const q = query(collection(db, AUDIT_COLLECTION), orderBy("criadoEm", "desc"), limit(300));
  return onSnapshotQuery(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })), null);
  }, (erro) => callback([], erro));
}
'''
STORAGE.write_text(storage, encoding='utf-8')

# --- App imports/constants ---
app = app.replace(
    'import { inscrever, salvarValor } from "./storage.js";',
    'import { inscrever, salvarValor, registrarAuditoria, inscreverAuditoria } from "./storage.js";',
    1,
)
app = app.replace(
    'import { firebaseConfigurado } from "./firebase.js";',
    'import { auth, firebaseConfigurado } from "./firebase.js";',
    1,
)
app = app.replace(
    'const META_KEY = "costura:pedidosMeta";',
    'const META_KEY = "costura:pedidosMeta";\nconst AUDIT_ADMIN_EMAIL = "andermuchael@gmail.com";\n// PRE_CORTE_AUDIT_V1',
    1,
)

# state
app = app.replace(
    '  const [mostrarDrive, setMostrarDrive] = useState(false);',
    '  const [mostrarDrive, setMostrarDrive] = useState(false);\n  const [mostrarAuditoria, setMostrarAuditoria] = useState(false);\n  const [auditoria, setAuditoria] = useState([]);',
    1,
)

# audit subscription
needle = '  const salvar = async (novaLista) => {'
audit_effect = r'''
  useEffect(() => {
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
    const alterados = depois.filter((i) => {
      const a = antesMap[i.id];
      if (!a) return false;
      return JSON.stringify(a) !== JSON.stringify(i);
    });
    if (!adicionados.length && !removidos.length && !alterados.length) return;
    const user = auth?.currentUser;
    if (!user) return;
    const acao = removidos.length ? "exclusão" : adicionados.length ? "criação" : "alteração";
    const amostra = [...adicionados, ...removidos, ...alterados][0];
    await registrarAuditoria({
      usuarioEmail: user.email || "desconhecido",
      usuarioNome: user.displayName || user.email || "desconhecido",
      acao,
      pedido: amostra?.pedido || "",
      detalhes: `${adicionados.length} criação(ões), ${alterados.length} alteração(ões), ${removidos.length} exclusão(ões)`,
    });
  };

'''
app = app.replace(needle, audit_effect + needle, 1)

# salvar wrapper
old = '''  const salvar = async (novaLista) => {
    setItens(novaLista);
    const ok = await salvarValor(STORAGE_KEY, JSON.stringify(novaLista));
    setErro(ok ? "" : "Não foi possível salvar. Verifique sua conexão ou as chaves do Firebase.");
  };'''
new = '''  const salvar = async (novaLista) => {
    const anterior = itens;
    setItens(novaLista);
    const ok = await salvarValor(STORAGE_KEY, JSON.stringify(novaLista));
    if (ok) await registrarDiffAuditoria(anterior, novaLista);
    setErro(ok ? "" : "Não foi possível salvar. Verifique sua conexão ou as chaves do Firebase.");
  };'''
if old not in app:
    raise SystemExit('salvar block not found')
app = app.replace(old, new, 1)

# duplicate protection in manual creation: same order+product cannot be added twice as a separate pre-corte line.
old_add = '''  const adicionarItem = () => {
    if (!pedido.trim()) return;
    const novo = {'''
new_add = '''  const adicionarItem = () => {
    const numero = pedido.trim();
    if (!numero) return;
    const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");
    if (existente) {
      setErro(`O pedido #${numero} já possui ${produto} no pré-corte. Para evitar duplicação, altere a quantidade no lançamento existente.`);
      return;
    }
    const novo = {'''
if old_add not in app: raise SystemExit('add start not found')
app = app.replace(old_add, new_add, 1)
app = app.replace('      pedido: pedido.trim(),\n      produto,', '      pedido: numero,\n      produto,', 1)
app = app.replace('    if (dataEntregaForm) definirDataEntrega(pedido.trim(), dataEntregaForm);', '    if (dataEntregaForm) definirDataEntrega(numero, dataEntregaForm);', 1)

# logical exclusion marker + UI action. Keep items for audit/history, but hide them from pre-corte.
old_pre = '    const itensPre = itens.filter((i) => i.etapa === "pre_corte");'
new_pre = '    const itensPre = itens.filter((i) => i.etapa === "pre_corte" && !pedidosMeta[i.pedido]?.excluidoPreCorte);'
if old_pre not in app: raise SystemExit('pre filter not found')
app = app.replace(old_pre, new_pre, 1)

# Insert exclusion function before generic removerItem.
needle = '  const removerItem = (id) => {'
excluir = r'''  const excluirPedidoPreCorte = async (numero) => {
    const confirmar = window.confirm(`Excluir o pedido #${numero} do Pré-Corte?\n\nEle ficará oculto do Pré-Corte e a ação será registrada no histórico.`);
    if (!confirmar) return;
    const user = auth?.currentUser;
    const novoMeta = {
      ...pedidosMeta,
      [numero]: { ...(pedidosMeta[numero] || {}), excluidoPreCorte: true, excluidoPreCorteEm: Date.now() },
    };
    setPedidosMeta(novoMeta);
    await salvarValor(META_KEY, JSON.stringify(novoMeta));
    if (user) {
      await registrarAuditoria({
        usuarioEmail: user.email || "desconhecido",
        usuarioNome: user.displayName || user.email || "desconhecido",
        acao: "exclusão de pedido do pré-corte",
        pedido: numero,
        detalhes: "Pedido ocultado do Pré-Corte por exclusão manual.",
      });
    }
  };

'''
app = app.replace(needle, excluir + needle, 1)

# Button in pre-corte card.
old_card = '                    <span style={styles.pctText}>{p.cortadoGeral}/{p.totalGeral} cortado</span>\n                  </div>'
new_card = '                    <span style={styles.pctText}>{p.cortadoGeral}/{p.totalGeral} cortado</span>\n                    <button style={styles.excluirPedidoBtn} onClick={() => excluirPedidoPreCorte(p.numero)}>Excluir pedido</button>\n                  </div>'
if old_card not in app: raise SystemExit('pre card header not found')
app = app.replace(old_card, new_card, 1)

# Hide fully cut groups, not just lines.
old_return = '    return pedidosArr.filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase()));\n  }, [itens, pedidosMeta, filtroPedido]);'
new_return = '    return pedidosArr.filter((p) => p.linhas.some((l) => l.restante > 0)).filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase()));\n  }, [itens, pedidosMeta, filtroPedido]);'
# Only first occurrence is pre-corte.
if old_return not in app: raise SystemExit('pre return not found')
app = app.replace(old_return, new_return, 1)

# Audit button in export row.
old_export = '          <button style={styles.limparBtn} onClick={() => setConfirmarLimpeza(true)} disabled={itens.length === 0}>🗑 Limpar tudo</button>'
new_export = '          {auth?.currentUser?.email?.toLowerCase() === AUDIT_ADMIN_EMAIL && (\n            <button style={styles.exportBtnOutline} onClick={() => setMostrarAuditoria(true)}>🕘 Histórico</button>\n          )}\n          <button style={styles.limparBtn} onClick={() => setConfirmarLimpeza(true)} disabled={itens.length === 0}>🗑 Limpar tudo</button>'
if old_export not in app: raise SystemExit('export row not found')
app = app.replace(old_export, new_export, 1)

# Audit modal before Drive modal.
needle_modal = '        {mostrarDrive && ('
audit_modal = r'''        {mostrarAuditoria && auth?.currentUser?.email?.toLowerCase() === AUDIT_ADMIN_EMAIL && (
          <div style={styles.modalOverlay} onClick={() => setMostrarAuditoria(false)}>
            <div style={{ ...styles.modalBox, maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <h3 style={styles.modalTitle}>Histórico de alterações</h3>
                <button style={styles.modalFechar} onClick={() => setMostrarAuditoria(false)}>Fechar</button>
              </div>
              {auditoria.length === 0 ? (
                <p style={styles.vazio}>Nenhum registro encontrado.</p>
              ) : (
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

'''
if needle_modal not in app: raise SystemExit('drive modal not found')
app = app.replace(needle_modal, audit_modal + needle_modal, 1)

# Add button style before limparBtn style.
style_anchor = '  limparBtn: {'
style_add = '  excluirPedidoBtn: { border: "1px solid #c81e2c", color: "#a51d2d", background: "#fff7f7", borderRadius: 8, padding: "7px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" },\n'
if style_anchor not in app: raise SystemExit('style anchor not found')
app = app.replace(style_anchor, style_add + style_anchor, 1)

APP.write_text(app, encoding='utf-8')

# --- Firestore security: authenticated users may create audit entries only for themselves; only admin may read. ---
RULES.write_text("""rules_version = '2';\n\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /controleProducao/{document} {\n      allow read, write: if request.auth != null;\n    }\n\n    match /auditoriaProducao/{registro} {\n      allow create: if request.auth != null\n        && request.resource.data.usuarioEmail == request.auth.token.email;\n      allow read: if request.auth != null\n        && request.auth.token.email == 'andermuchael@gmail.com';\n      allow update, delete: if false;\n    }\n  }\n}\n""", encoding='utf-8')

print('patch applied')
