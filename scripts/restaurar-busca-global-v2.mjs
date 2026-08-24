import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// Garante que estados injetados por versões anteriores do restaurador existam apenas uma vez.
const buscaState = '  const [buscaGlobal, setBuscaGlobal] = useState("");';
const buscaLines = source.split("\n").filter((line) => line.trim() === buscaState.trim());
if (buscaLines.length > 1) {
  let first = true;
  source = source.split("\n").filter((line) => {
    if (line.trim() !== buscaState.trim()) return true;
    if (first) { first = false; return true; }
    return false;
  }).join("\n");
}


if (!source.includes('const [buscaGlobal, setBuscaGlobal]')) {
  const a = '  const [corteForm, setCorteForm] = useState({});';
  if (!source.includes(a)) throw new Error("NeoCooler: estado base não encontrado.");
  source = source.replace(a, a + '\n  const [buscaGlobal, setBuscaGlobal] = useState("");');
}

if (!source.includes('const resultadosBuscaGlobal = useMemo')) {
  const a = '  const chaveAloc = (p, prod) => `${p}||${prod}`;';
  if (!source.includes(a)) throw new Error("NeoCooler: âncora das funções não encontrada.");
  const b = `  const resultadosBuscaGlobal = useMemo(() => {\n    const termo = String(buscaGlobal || "").trim().toLowerCase();\n    if (!termo) return [];\n    return itens.filter((it) => {\n      const texto = [it.pedido, it.produto, it.cor, it.equipe, it.sublimador, ETAPA_LABEL[it.etapa] || it.etapa].filter(Boolean).join(" ").toLowerCase();\n      return texto.includes(termo);\n    }).slice(0, 20);\n  }, [itens, buscaGlobal]);\n  const abrirResultadoBuscaGlobal = (it) => {\n    setAba(it.etapa === "corte" ? "aguardando_sublimacao" : it.etapa);\n    setBuscaGlobal("");\n    setTimeout(() => {\n      const el = document.querySelector('[data-pedido="' + String(it.pedido).replace(/"/g, "") + '"]');\n      el?.scrollIntoView({ behavior: "smooth", block: "center" });\n    }, 120);\n  };\n`;
  source = source.replace(a, b + a);
}

if (!source.includes('data-global-search-v2="true"')) {
  const a = '  return (';
  const pos = source.indexOf(a);
  if (pos === -1) throw new Error("NeoCooler: retorno principal não encontrado.");
  const ui = `  return (\n    <>\n      <div data-global-search-v2="true" style={{position:"relative",margin:"0 auto 12px",maxWidth:1100,padding:"0 12px"}}>\n        <input value={buscaGlobal} onChange={(e)=>setBuscaGlobal(e.target.value)} placeholder="Buscar pedido ou produto em todas as etapas..." aria-label="Busca global" style={{width:"100%",boxSizing:"border-box",padding:"11px 14px",border:"1px solid #cfd6de",borderRadius:10,fontSize:14,background:"#fff",color:"#26384a"}} />\n        {buscaGlobal.trim() && <div style={{position:"absolute",left:12,right:12,top:"calc(100% + 3px)",zIndex:9999,background:"#fff",border:"1px solid #d8cfbd",borderRadius:10,boxShadow:"0 10px 28px rgba(0,0,0,.2)",maxHeight:360,overflowY:"auto"}}>\n          {resultadosBuscaGlobal.length ? resultadosBuscaGlobal.map((it)=><button key={it.id} type="button" onClick={()=>abrirResultadoBuscaGlobal(it)} style={{display:"block",width:"100%",padding:"10px 12px",border:0,borderBottom:"1px solid #eee5d2",background:"transparent",textAlign:"left",cursor:"pointer"}}>\n            <b>#{it.pedido} · {it.produto}</b><div style={{fontSize:11,marginTop:3,color:"#6b7280"}}>{ETAPA_LABEL[it.etapa] || it.etapa} · {it.qtd} un{it.cor ? " · " + it.cor : ""}</div>\n          </button>) : <div style={{padding:12,color:"#777"}}>Nenhum resultado encontrado.</div>}\n        </div>}\n      </div>\n`;
  source = source.slice(0, pos) + ui + source.slice(pos + a.length);
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: busca global V2 restaurada diretamente no build.");
