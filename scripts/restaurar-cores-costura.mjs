import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// 1) Estado isolado para os controles de Aguardando Costura.
if (!source.includes("const [costuraForm, setCosturaForm]")) {
  const stateAnchor = '  const [corteForm, setCorteForm] = useState({});';
  if (!source.includes(stateAnchor)) throw new Error("Âncora de estado não encontrada.");
  source = source.replace(stateAnchor, `${stateAnchor}\n  const [costuraForm, setCosturaForm] = useState({});\n  const [buscaGlobal, setBuscaGlobal] = useState(\"\");`);
} else if (!source.includes("const [buscaGlobal, setBuscaGlobal]")) {
  const stateAnchor = '  const [corteForm, setCorteForm] = useState({});';
  source = source.replace(stateAnchor, `${stateAnchor}\n  const [buscaGlobal, setBuscaGlobal] = useState(\"\");`);
}

// 2) Formulário de Aguardando Costura: cor + quantidade + equipe.
if (!source.includes("const getCosturaForm = (id, restante, corAtual = \"\")")) {
  const anchor = '  const moverParaAguardandoCostura = (id) =>';
  const pos = source.indexOf(anchor);
  if (pos === -1) throw new Error("Função moverParaAguardandoCostura não encontrada.");
  const end = source.indexOf('\n  };', pos);
  if (end === -1) throw new Error("Fim da função moverParaAguardandoCostura não encontrado.");
  const helper = `\n  const getCosturaForm = (id, restante, corAtual = "") => costuraForm[id] || { cor: corAtual || "", qtd: restante, equipe: EQUIPES[0] };\n  const setCosturaFormCampo = (id, restante, campo, valor, corAtual = "") => {\n    setCosturaForm((f) => ({ ...f, [id]: { ...getCosturaForm(id, restante, corAtual), [campo]: valor } }));\n  };\n  const enviarParcialParaCostura = (id) => {\n    const origem = itens.find((i) => i.id === id && i.etapa === "aguardando_costura");\n    if (!origem) return;\n    const f = getCosturaForm(id, Number(origem.qtd) || 0, origem.cor || "");\n    if (!f.cor) { setErro("Selecione a cor antes de enviar para a costura."); return; }\n    const total = Number(origem.qtd) || 0;\n    const qtdEnviar = Math.max(1, Math.min(Number(f.qtd) || 1, total));\n    const restante = total - qtdEnviar;\n    const base = itens.filter((i) => i.id !== id);\n    if (restante > 0) base.push({ ...origem, qtd: restante, cor: "" });\n    base.push({ ...origem, id: uid(), qtd: qtdEnviar, cor: f.cor, equipe: f.equipe || EQUIPES[0], etapa: "costura", feito: false, conferido: false, criadoEm: Date.now() });\n    salvar(base);\n    setCosturaForm((x) => ({ ...x, [id]: { cor: "", qtd: restante || 1, equipe: f.equipe || EQUIPES[0] } }));\n  };\n`;
  source = source.slice(0, end + 4) + helper + source.slice(end + 4);
}

// 3) Busca global: localiza o pedido/produto em qualquer etapa e abre a etapa correta.
if (!source.includes("const resultadosBuscaGlobal = useMemo")) {
  const anchor = '  const ABAS = [';
  const pos = source.indexOf(anchor);
  if (pos === -1) throw new Error("Âncora ABAS não encontrada.");
  const helper = `  const resultadosBuscaGlobal = useMemo(() => {\n    const termo = buscaGlobal.trim().toLowerCase();\n    if (!termo) return [];\n    const mapa = new Map();\n    for (const it of itens) {\n      const pedidoTxt = String(it.pedido || "");\n      const produtoTxt = String(it.produto || "");\n      if (!pedidoTxt.toLowerCase().includes(termo) && !produtoTxt.toLowerCase().includes(termo)) continue;\n      const chave = [pedidoTxt, produtoTxt, it.etapa].join("||");\n      if (!mapa.has(chave)) mapa.set(chave, { ...it, qtdTotal: 0 });\n      mapa.get(chave).qtdTotal += Number(it.qtd) || 0;\n    }\n    return Array.from(mapa.values()).sort((a, b) => String(a.pedido).localeCompare(String(b.pedido), undefined, { numeric: true }));\n  }, [itens, buscaGlobal]);\n\n  const abrirResultadoGlobal = (item) => {\n    setBuscaGlobal(\"\");\n    setFiltroPedido(String(item.pedido));\n    setAba(item.etapa);\n    window.scrollTo({ top: 0, behavior: "smooth" });\n    setTimeout(() => {\n      const cards = Array.from(document.querySelectorAll("[data-pedido]"));\n      const alvo = cards.find((el) => el.getAttribute("data-pedido") === String(item.pedido));\n      if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "center" });\n    }, 300);\n  };\n\n`;
  source = source.slice(0, pos) + helper + source.slice(pos);
}

// 4) Campo de busca global no topo azul, antes das abas/indicadores.
if (!source.includes('placeholder="Buscar pedido ou produto em todas as etapas..."')) {
  const anchor = '          <div style={styles.brandRow}>';
  const pos = source.indexOf(anchor);
  if (pos === -1) throw new Error("Cabeçalho não encontrado.");
  const bloco = `          <div style={{ position: "relative", marginBottom: 10 }}>\n            <input value={buscaGlobal} onChange={(e) => setBuscaGlobal(e.target.value)} placeholder="Buscar pedido ou produto em todas as etapas..." style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d7cbb7", fontSize: 16, background: "#fff", color: "#172535", outline: "none" }} />\n            {buscaGlobal.trim() && <div style={{ position: "absolute", zIndex: 30, left: 0, right: 0, top: "calc(100% + 5px)", background: "#fff", borderRadius: 10, padding: 6, boxShadow: "0 10px 28px rgba(0,0,0,.25)", maxHeight: 360, overflowY: "auto" }}>\n              {resultadosBuscaGlobal.length === 0 ? <div style={{ padding: 12, color: "#6f6658" }}>Nenhum pedido ou produto encontrado.</div> : resultadosBuscaGlobal.map((r) => <button key={[r.id, r.pedido, r.produto, r.etapa].join("-")} onClick={() => abrirResultadoGlobal(r)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", border: "0", borderBottom: "1px solid #eee5d7", background: "#fff", cursor: "pointer", textAlign: "left", color: "#172535" }}><span><b>#{r.pedido}</b> · {r.produto} · {r.qtdTotal}un</span><strong style={{ color: "#e15f22", whiteSpace: "nowrap" }}>{ETAPA_LABEL[r.etapa] || r.etapa}</strong></button>)}\n            </div>}\n          </div>\n`;
  source = source.slice(0, pos) + bloco + source.slice(pos);
}

// 5) Substitui somente o bloco Aguardando Costura por uma versão segura.
const inicio = source.indexOf('{loaded && aba === "aguardando_costura" && <section style={styles.listWrap}>');
const fim = source.indexOf('{loaded && aba === "costura" && <section style={styles.listWrap}>', inicio);
if (inicio === -1 || fim === -1) throw new Error("Bloco Aguardando Costura não encontrado.");

const novoBloco = `{loaded && aba === "aguardando_costura" && <section style={styles.listWrap}>{aguardandoCosturaAgrupado.map((p)=><div key={p.numero} style={styles.pedidoCard} data-pedido={String(p.numero)} className="card pedido-card"><div style={styles.pedidoTop}><span style={styles.pedidoNum}>#{p.numero}</span><span style={styles.pctText}>{p.total}un</span></div><div style={styles.itensLista}>{p.itens.map((it)=>{const f=getCosturaForm(it.id,Number(it.qtd)||0,it.cor||"");return <div key={it.id} style={styles.corteLinha}><div style={styles.corteLinhaTopo}><span style={styles.itemTexto}><b>{it.produto}</b> · {it.qtd}un</span><span style={styles.equipePill}>restam {it.qtd}un</span></div><div style={styles.alocGrid}><div style={styles.corSelectWrap}><span style={{...styles.swatch,background:corHex(f.cor||"#999"),borderColor:corClara(corHex(f.cor||"#999"))?"#0002":"transparent"}}/><select style={{...styles.input,paddingLeft:34}} value={f.cor} onChange={(e)=>setCosturaFormCampo(it.id,Number(it.qtd)||0,"cor",e.target.value,it.cor||"")}><option value="">Selecionar cor</option>{CORES.map((c)=><option key={c.nome} value={c.nome}>{c.nome}</option>)}</select></div><input style={styles.input} type="number" min={1} max={Number(it.qtd)||1} value={f.qtd} onChange={(e)=>setCosturaFormCampo(it.id,Number(it.qtd)||0,"qtd",e.target.value,it.cor||"")}/><select style={styles.equipeSelect} value={f.equipe||EQUIPES[0]} onChange={(e)=>setCosturaFormCampo(it.id,Number(it.qtd)||0,"equipe",e.target.value,it.cor||"")}>{EQUIPES.map((eq)=><option key={eq} value={eq}>{eq}</option>)}</select><button style={styles.enviarBtn} onClick={()=>enviarParcialParaCostura(it.id)}>Enviar p/ costura</button></div></div>})}</div></div>)}</section>}`;
source = source.slice(0, inicio) + novoBloco + source.slice(fim);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: Aguardando Costura corrigida e busca global restaurada.");
