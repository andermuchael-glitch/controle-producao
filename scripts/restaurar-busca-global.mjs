import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
let alterado = false;

if (!source.includes("const resultadosBuscaGlobal = useMemo")) {
  const anchor = '  const costuraFiltrado = costuraAgrupado;';
  if (!source.includes(anchor)) throw new Error("NeoCooler: âncora da busca global não encontrada.");
  const bloco = `  const resultadosBuscaGlobal = useMemo(() => {\n    const termo = String(buscaGlobal || "").trim().toLowerCase();\n    if (!termo) return [];\n    return itens\n      .filter((it) => {\n        const texto = [it.pedido, it.produto, it.cor, it.sublimador, it.equipe, ETAPA_LABEL[it.etapa] || it.etapa].filter(Boolean).join(" ").toLowerCase();\n        return texto.includes(termo);\n      })\n      .sort((a, b) => (Number(b.criadoEm) || 0) - (Number(a.criadoEm) || 0))\n      .slice(0, 15);\n  }, [itens, buscaGlobal]);\n\n`;
  source = source.replace(anchor, bloco + anchor);
  alterado = true;
}

if (!source.includes('data-global-search="true"')) {
  const anchor = '          <div style={styles.brandRow}>'; 
  if (!source.includes(anchor)) throw new Error("NeoCooler: cabeçalho não encontrado para a busca global.");
  const busca = `          <div data-global-search="true" style={{position:"relative",marginBottom:10}} onKeyDown={(e)=>{if(e.key==="Enter"&&resultadosBuscaGlobal[0]){abrirResultado(resultadosBuscaGlobal[0]);setBuscaGlobal("");}}}>\n            <input\n              value={buscaGlobal}\n              onChange={(e)=>setBuscaGlobal(e.target.value)}\n              placeholder="Buscar pedido ou produto em todas as etapas..."\n              style={{width:"100%",border:"1px solid #d5dbe2",borderRadius:9,padding:"9px 12px",fontSize:14,background:"#fff",color:"#1f2933",outline:"none"}}\n              aria-label="Buscar pedido ou produto em todas as etapas"\n            />\n            {buscaGlobal.trim() && <div style={{position:"absolute",left:0,right:0,top:"calc(100% + 4px)",zIndex:100,background:"#fffdf8",border:"1px solid #d8cfbd",borderRadius:9,boxShadow:"0 8px 24px rgba(0,0,0,.18)",maxHeight:360,overflowY:"auto"}}>\n              {resultadosBuscaGlobal.length ? resultadosBuscaGlobal.map((it)=><button key={it.id} type="button" onClick={()=>{abrirResultado(it);setBuscaGlobal("");}} style={{width:"100%",border:0,borderBottom:"1px solid #eee5d2",background:"transparent",padding:"10px 12px",textAlign:"left",cursor:"pointer",color:"#26384a"}}>\n                <div style={{fontWeight:700}}>#{it.pedido} · {it.produto}</div>\n                <div style={{fontSize:11,color:"#7a7160",marginTop:3}}>{ETAPA_LABEL[it.etapa] || it.etapa} · {it.qtd}un{it.cor ? ` · ${it.cor}` : ""}</div>\n              </button>) : <div style={{padding:12,color:"#7a7160",fontSize:13}}>Nenhum pedido ou produto encontrado.</div>}\n            </div>}\n          </div>\n`;
  source = source.replace(anchor, busca + anchor);
  alterado = true;
}

if (alterado) fs.writeFileSync(path, source, "utf8");
console.log(`NeoCooler: busca global ${alterado ? "restaurada" : "já estava presente"}.`);
