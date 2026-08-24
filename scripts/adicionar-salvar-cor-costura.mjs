import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// Permite definir a cor enquanto o item continua em Aguardando Costura.
if (!source.includes("const salvarCorAguardandoCostura = async")) {
  const anchor = '  const getCosturaForm = (id, restante, corAtual = "") =>';
  const pos = source.indexOf(anchor);
  if (pos === -1) throw new Error("NeoCooler: função getCosturaForm não encontrada.");

  const helper = `  const salvarCorAguardandoCostura = async (id) => {\n    const origem = itens.find((i) => i.id === id && i.etapa === "aguardando_costura");\n    if (!origem) { setErro("Item de Aguardando Costura não encontrado."); return; }\n    const f = getCosturaForm(id, Number(origem.qtd) || 0, origem.cor || "");\n    const cor = String(f.cor || "").trim();\n    if (!cor) { setErro("Selecione uma cor antes de salvar."); return; }\n    await salvar(itens.map((i) => i.id === id ? { ...i, cor } : i));\n    setCosturaForm((x) => ({ ...x, [id]: { ...f, cor } }));\n    setErro(\"Cor salva. O item continua em Aguardando Costura.\");\n  };\n\n`;
  source = source.slice(0, pos) + helper + source.slice(pos);
}

const antigo = '<button type="button" style={styles.enviarBtn} onClick={()=>enviarParcialParaCostura(it.id)}>Enviar p/ costura</button>';
const novo = '<div style={{display:"flex",gap:7,alignItems:"center"}}><button type="button" style={{...styles.enviarBtn,flex:1}} onClick={()=>salvarCorAguardandoCostura(it.id)}>Salvar cor</button><button type="button" style={{...styles.enviarBtn,flex:1}} onClick={()=>enviarParcialParaCostura(it.id)}>Enviar p/ costura</button></div>';

if (source.includes(antigo)) {
  source = source.replace(antigo, novo);
} else if (!source.includes("Salvar cor</button>")) {
  throw new Error("NeoCooler: botão Enviar p/ costura não encontrado.");
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: seleção de cor agora pode ser salva sem enviar para costura.");
