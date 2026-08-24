import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// Estado isolado para os controles de Aguardando Costura.
if (!source.includes("const [costuraForm, setCosturaForm]")) {
  const stateAnchor = '  const [corteForm, setCorteForm] = useState({});';
  if (source.includes(stateAnchor)) source = source.replace(stateAnchor, `${stateAnchor}\n  const [costuraForm, setCosturaForm] = useState({});\n  const [buscaGlobal, setBuscaGlobal] = useState(\"\");`);
} else if (!source.includes("const [buscaGlobal, setBuscaGlobal]")) {
  const stateAnchor = '  const [corteForm, setCorteForm] = useState({});';
  if (source.includes(stateAnchor)) source = source.replace(stateAnchor, `${stateAnchor}\n  const [buscaGlobal, setBuscaGlobal] = useState(\"\");`);
}

// Formulário e ações da Aguardando Costura.
if (!source.includes("const getCosturaForm = (id, restante, corAtual = \"\")")) {
  const anchors = ['  const getCorteForm = (p, prod, restante) =>','  const getAlocForm = (p, prod) =>','  const salvar = async (novaLista) =>'];
  const anchor = anchors.find((a) => source.includes(a));
  if (anchor) {
    const pos = source.indexOf(anchor);
    const helper = `  const getCosturaForm = (id, restante, corAtual = "") => costuraForm[id] || { cor: corAtual || "", qtd: restante, equipe: EQUIPES[0] };\n  const setCosturaFormCampo = (id, restante, campo, valor, corAtual = "") => {\n    setCosturaForm((f) => ({ ...f, [id]: { ...getCosturaForm(id, restante, corAtual), [campo]: valor } }));\n  };\n  const salvarCorAguardandoCostura = async (id) => {\n    const origem = itens.find((i) => i.id === id && i.etapa === "aguardando_costura");\n    if (!origem) { setErro("Item de Aguardando Costura não encontrado. Atualize a tela e tente novamente."); return; }\n    const f = getCosturaForm(id, Number(origem.qtd) || 0, origem.cor || "");\n    const cor = String(f.cor || "").trim();\n    if (!cor) { setErro("Selecione uma cor antes de salvar."); return; }\n    await salvar(itens.map((i) => i.id === id ? { ...i, cor } : i));\n    setCosturaForm((x) => ({ ...x, [id]: { ...f, cor } }));\n    setErro("");\n  };\n  const enviarParcialParaCostura = async (id) => {\n    const origem = itens.find((i) => i.id === id && i.etapa === "aguardando_costura");\n    if (!origem) { setErro("Item de Aguardando Costura não encontrado. Atualize a tela e tente novamente."); return; }\n    const total = Number(origem.qtd) || 0;\n    const f = getCosturaForm(id, total, origem.cor || "");\n    const cor = String(f.cor || origem.cor || "").trim();\n    if (!cor) { setErro("Selecione a cor antes de enviar para a costura."); return; }\n    const qtdEnviar = Number(f.qtd);\n    if (!Number.isFinite(qtdEnviar) || qtdEnviar < 1 || qtdEnviar > total) { setErro("Informe uma quantidade entre 1 e " + total + " unidades."); return; }\n    const restante = total - qtdEnviar;\n    const nova = [];\n    for (const i of itens) {\n      if (i.id !== id) { nova.push(i); continue; }\n      if (restante > 0) nova.push({ ...i, qtd: restante });\n      nova.push({ ...i, id: uid(), qtd: qtdEnviar, cor, equipe: f.equipe || EQUIPES[0], etapa: "costura", feito: false, conferido: false, criadoEm: Date.now() });\n    }\n    await salvar(nova);\n    setCosturaForm((x) => { const y = { ...x }; delete y[id]; return y; });\n    setErro("");\n  };\n\n`;
    source = source.slice(0, pos) + helper + source.slice(pos);
  }
}

// Layout da Aguardando Costura: salvar cor não muda a etapa; envio é separado.
const inicio = source.indexOf('{loaded && aba === "aguardando_costura" && <section style={styles.listWrap}>');
const fim = inicio >= 0 ? source.indexOf('{loaded && aba === "costura" && <section style={styles.listWrap}>', inicio) : -1;
if (inicio !== -1 && fim !== -1 && source.includes("getCosturaForm") && source.includes("salvarCorAguardandoCostura")) {
  const novoBloco = `{loaded && aba === "aguardando_costura" && <section style={styles.listWrap}>{aguardandoCosturaAgrupado.map((p)=><div key={p.numero} style={styles.pedidoCard} data-pedido={String(p.numero)} className="card pedido-card"><div style={styles.pedidoTop}><span style={styles.pedidoNum}>#{p.numero}</span><span style={styles.pctText}>{p.total}un</span></div><div style={styles.itensLista}>{p.itens.map((it)=>{const f=getCosturaForm(it.id,Number(it.qtd)||0,it.cor||"");return <div key={it.id} style={{...styles.corteLinha,marginBottom:10}}><div style={styles.corteLinhaTopo}><span style={styles.itemTexto}><b>{it.produto}</b> · {it.qtd}un</span><span style={styles.equipePill}>restam {it.qtd}un</span></div><div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(82px,0.45fr)",gap:7,alignItems:"center",marginTop:7}}><div style={styles.corSelectWrap}><span style={{...styles.swatch,background:corHex(f.cor||"#999"),borderColor:corClara(corHex(f.cor||"#999"))?"#0002":"transparent"}}/><select style={{...styles.input,paddingLeft:34}} value={f.cor} onChange={(e)=>setCosturaFormCampo(it.id,Number(it.qtd)||0,"cor",e.target.value,it.cor||"")}><option value="">Selecionar cor</option>{CORES.map((c)=><option key={c.nome} value={c.nome}>{c.nome}</option>)}</select></div><input style={styles.input} type="number" min={1} max={Number(it.qtd)||1} value={f.qtd} onChange={(e)=>setCosturaFormCampo(it.id,Number(it.qtd)||0,"qtd",e.target.value,it.cor||"")} placeholder="Qtd" /></div><div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(110px,0.55fr) minmax(135px,0.75fr)",gap:7,alignItems:"center",marginTop:7}}><select style={styles.equipeSelect} value={f.equipe||EQUIPES[0]} onChange={(e)=>setCosturaFormCampo(it.id,Number(it.qtd)||0,"equipe",e.target.value,it.cor||"")}>{EQUIPES.map((eq)=><option key={eq} value={eq}>{eq}</option>)}</select><button type="button" style={styles.exportBtnOutline} onClick={()=>salvarCorAguardandoCostura(it.id)}>Salvar cor</button><button type="button" style={styles.enviarBtn} onClick={()=>enviarParcialParaCostura(it.id)}>Enviar p/ costura</button></div></div>})}</div></div>)}</section>}`;
  source = source.slice(0, inicio) + novoBloco + source.slice(fim);
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: Aguardando Costura com cor salvável separadamente e envio parcial funcional.");
