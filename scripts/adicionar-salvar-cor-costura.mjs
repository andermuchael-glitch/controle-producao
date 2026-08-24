import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// A cor deve ser salva sem mudar a etapa. Esta função é adicionada no build.
if (!source.includes("const salvarCorAguardandoCostura = async")) {
  const anchor = '  const getCosturaForm = (id, restante, corAtual = "") =>';
  const pos = source.indexOf(anchor);
  if (pos === -1) throw new Error("NeoCooler: getCosturaForm não encontrada.");
  const helper = `  const salvarCorAguardandoCostura = async (id) => {\n    const origem = itens.find((i) => i.id === id && i.etapa === "aguardando_costura");\n    if (!origem) { setErro("Item não encontrado em Aguardando Costura. Atualize a tela."); return; }\n    const f = getCosturaForm(id, Number(origem.qtd) || 0, origem.cor || "");\n    const cor = String(f.cor || "").trim();\n    if (!cor) { setErro("Selecione uma cor antes de salvar."); return; }\n    try {\n      const novaLista = itens.map((i) => i.id === id ? { ...i, cor } : i);\n      await salvar(novaLista);\n      setCosturaForm((x) => ({ ...x, [id]: { ...f, cor } }));\n      setErro("Cor salva com sucesso. O item continua em Aguardando Costura.");\n    } catch (e) {\n      console.error("NeoCooler salvar cor", e);\n      setErro("Não foi possível salvar a cor. Verifique a conexão com o Firebase.");\n    }\n  };\n\n`;
  source = source.slice(0, pos) + helper + source.slice(pos);
}

// Garante o botão mesmo que uma restauração anterior tenha deixado outro layout.
const antigo = '<button type="button" style={styles.enviarBtn} onClick={()=>enviarParcialParaCostura(it.id)}>Enviar p/ costura</button>';
if (source.includes(antigo) && !source.includes("salvarCorAguardandoCostura(it.id)")) {
  const novo = '<div style={{display:"flex",gap:7,alignItems:"center"}}><button type="button" style={{...styles.enviarBtn,flex:1}} onClick={()=>salvarCorAguardandoCostura(it.id)}>Salvar cor</button><button type="button" style={{...styles.enviarBtn,flex:1}} onClick={()=>enviarParcialParaCostura(it.id)}>Enviar p/ costura</button></div>';
  source = source.replace(antigo, novo);
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: salvar cor da Aguardando Costura corrigido.");
