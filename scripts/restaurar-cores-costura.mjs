import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// Restaura o fluxo de cores + quantidade por cor em Aguardando Costura.
// A alteração é aplicada durante o build para não sobrescrever os demais ajustes do App.
if (!source.includes("const [costuraForm, setCosturaForm]")) {
  const stateAnchor = '  const [corteForm, setCorteForm] = useState({});';
  const stateInsert = `${stateAnchor}\n  const [costuraForm, setCosturaForm] = useState({});`;
  if (!source.includes(stateAnchor)) throw new Error("Âncora de estado da costura não encontrada.");
  source = source.replace(stateAnchor, stateInsert);
}

if (!source.includes("const getCosturaForm = (id, restante) =>")) {
  const anchor = '  const moverParaAguardandoCostura = (id) => salvar(itens.map((i) => i.id === id ? { ...i, etapa: "aguardando_costura" } : i));';
  const helper = `  const getCosturaForm = (id, restante, corAtual = "") => costuraForm[id] || { cor: corAtual || "", qtd: restante, equipe: EQUIPES[0] };\n  const setCosturaFormCampo = (id, restante, campo, valor, corAtual = "") => {\n    setCosturaForm((f) => ({ ...f, [id]: { ...getCosturaForm(id, restante, corAtual), [campo]: valor } }));\n  };\n  const enviarParcialParaCostura = (id) => {\n    const origem = itens.find((i) => i.id === id && i.etapa === "aguardando_costura");\n    if (!origem) return;\n    const f = getCosturaForm(id, origem.qtd, origem.cor || "");\n    if (!f.cor) { setErro("Selecione a cor antes de enviar para a costura."); return; }\n    const qtdEnviar = Math.max(1, Math.min(Number(f.qtd) || 1, Number(origem.qtd) || 0));\n    const restantes = Math.max(0, Number(origem.qtd) - qtdEnviar);\n    const novo = { ...origem, id: uid(), qtd: qtdEnviar, cor: f.cor, equipe: f.equipe || EQUIPES[0], etapa: "costura", feito: false, conferido: false, criadoEm: Date.now() };\n    const base = itens.filter((i) => i.id !== id);\n    if (restantes > 0) base.push({ ...origem, qtd: restantes, cor: origem.cor || "" });\n    salvar([...base, novo]);\n    setCosturaForm((f2) => ({ ...f2, [id]: { cor: "", qtd: restantes || 1, equipe: f.equipe || EQUIPES[0] } }));\n  };\n`;
  if (!source.includes(anchor)) throw new Error("Âncora da etapa Aguardando Costura não encontrada.");
  source = source.replace(anchor, anchor + "\n" + helper);
}

const inicio = source.indexOf('{loaded && aba === "aguardando_costura" && <section style={styles.listWrap}>');
const fim = source.indexOf('{loaded && aba === "costura" && <section style={styles.listWrap}>', inicio);
if (inicio === -1 || fim === -1) throw new Error("Bloco Aguardando Costura não encontrado.");

const novoBloco = `{loaded && aba === "aguardando_costura" && <section style={styles.listWrap}>{aguardandoCosturaAgrupado.map((p)=><div key={p.numero} style={styles.pedidoCard} data-pedido={String(p.numero)} className="card pedido-card"><div style={styles.pedidoTop}><div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span>{p.dataEntrega&&<span style={{...styles.badgeUrgencia,background:urgenciaInfo(p.dataEntrega).fundo,color:urgenciaInfo(p.dataEntrega).cor}}>{formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}</span>}</div><span style={styles.pctText}>{p.totalGeral}un</span></div><div style={styles.itensLista}>{p.linhas.map((linha)=>{const itemOrigem=itens.find((i)=>i.etapa==="aguardando_costura"&&i.pedido===p.numero&&i.produto===linha.produto);if(!itemOrigem)return null;const f=getCosturaForm(itemOrigem.id,linha.restante,itemOrigem.cor||"");return <div key={itemOrigem.id} style={styles.corteLinha}><div style={styles.corteLinhaTopo}><span style={styles.itemTexto}><b>{linha.produto}</b> · {linha.restante}un</span><span style={styles.equipePill}>restam {linha.restante}un</span></div><div style={styles.alocGrid}><div style={styles.corSelectWrap}><span style={{...styles.swatch,background:corHex(f.cor||"#999"),borderColor:corClara(corHex(f.cor||"#999"))?"#0002":"transparent"}}/><select style={{...styles.input,paddingLeft:34}} value={f.cor} onChange={(e)=>setCosturaFormCampo(itemOrigem.id,linha.restante,"cor",e.target.value,itemOrigem.cor||"")}><option value="">Selecionar cor</option>{CORES.map((c)=><option key={c.nome} value={c.nome}>{c.nome}</option>)}</select></div><input style={styles.input} type="number" min={1} max={linha.restante} value={f.qtd} onChange={(e)=>setCosturaFormCampo(itemOrigem.id,linha.restante,"qtd",e.target.value,itemOrigem.cor||"")}/><select style={styles.equipeSelect} value={f.equipe||EQUIPES[0]} onChange={(e)=>setCosturaFormCampo(itemOrigem.id,linha.restante,"equipe",e.target.value,itemOrigem.cor||"")}>{EQUIPES.map((eq)=><option key={eq} value={eq}>{eq}</option>)}</select><button style={styles.enviarBtn} onClick={()=>enviarParcialParaCostura(itemOrigem.id)}>Enviar p/ costura</button></div></div>})}</div></div>)}</section>}`;
source = source.slice(0, inicio) + novoBloco + source.slice(fim);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: seleção de cor e quantidade por cor restauradas em Aguardando Costura.");
