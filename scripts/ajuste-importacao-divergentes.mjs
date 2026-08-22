import fs from 'node:fs';
const path = 'src/App.jsx';
let source = fs.readFileSync(path, 'utf8');
if (!source.includes('const importarPdf = async')) process.exit(0);

if (!source.includes('"MOUSE PAD ERGONÔMICO"')) {
  source = source.replace('"MOUSEPAD PADRÃO","MOUSEPAD GAMER"', '"MOUSEPAD PADRÃO","MOUSEPAD GAMER","MOUSE PAD ERGONÔMICO"');
}

const stateAnchor = '  const [importandoPdf, setImportandoPdf] = useState(false);';
if (!source.includes('pdfRevisaoDivergentes')) {
  source = source.replace(stateAnchor, stateAnchor + '\n  const [pdfRevisaoDivergentes, setPdfRevisaoDivergentes] = useState([]);\n  const [pdfPedidoRevisao, setPdfPedidoRevisao] = useState("");\n  const [mostrarPdfRevisao, setMostrarPdfRevisao] = useState(false);');
}

const oldLoop = 'const produtoPdf = mapaProduto(descricao, codigo); if (!produtoPdf || !pedidoPadrao) continue;\n        const chave = pedidoPadrao + "||" + produtoPdf.toUpperCase(); if (encontrados.some((x) => x.chave === chave)) continue; encontrados.push({ chave, produto: produtoPdf, qtd: qtdItem });';
const newLoop = 'const produtoPdf = mapaProduto(descricao, codigo); if (!pedidoPadrao) continue;\n        const produtoFinal = produtoPdf || "__DIVERGENTE__";\n        const chaveProduto = produtoPdf ? produtoPdf.toUpperCase() : normalizarTextoPdf(descricao);\n        const chave = pedidoPadrao + "||" + chaveProduto; if (encontrados.some((x) => x.chave === chave)) continue; encontrados.push({ chave, produto: produtoFinal, produtoOriginal: descricao, qtd: qtdItem, id: uid() });';
if (source.includes(oldLoop)) source = source.replace(oldLoop, newLoop);

if (!source.includes('const concluirImportacaoPdf = async')) {
  const before = '  const importarPdf = async (arquivo) => {';
  const fn = `  const concluirImportacaoPdf = async (registros) => {\n    const resolvidos = registros.map((x) => ({ ...x, produto: x.produto === "__DIVERGENTE__" ? (x.produtoEscolhido || "") : x.produto }));\n    if (resolvidos.some((x) => !x.produto || x.produto === "__DIVERGENTE__")) { setErro("Escolha um produto para todos os itens divergentes."); return; }\n    const resumo = resolvidos.map((x) => x.produto + " — " + x.qtd + "un").join("\\n");\n    if (!window.confirm("Pedido #" + pdfPedidoRevisao + "\\n\\n" + resumo + "\\n\\nImportar estes itens para o Pré-Corte?")) return;\n    const novos = [];\n    for (const x of resolvidos) { const existente = itens.some((i) => i.pedido === pdfPedidoRevisao && i.produto === x.produto && i.etapa === "pre_corte"); const posterior = itens.some((i) => i.pedido === pdfPedidoRevisao && i.produto === x.produto && i.etapa !== "pre_corte"); if (!existente && !posterior) novos.push({ id: uid(), pedido: pdfPedidoRevisao, produto: x.produto, qtd: x.qtd, etapa: "pre_corte", criadoEm: Date.now() }); }\n    if (!novos.length) { setErro("Nenhum item novo foi importado. Duplicados foram ignorados."); return; }\n    await salvar([...itens, ...novos]); setPdfRevisaoDivergentes([]); setPdfPedidoRevisao(""); setMostrarPdfRevisao(false); setErro("");\n  };\n\n`;
  if (!source.includes(before)) throw new Error('âncora importarPdf não encontrada');
  source = source.replace(before, fn + before);
}

const oldConfirm = 'const resumo = encontrados.map((x) => x.produto + " — " + x.qtd + "un").join("\\n");\n      if (!window.confirm("Pedido #" + pedidoPadrao + "\\n\\n" + resumo + "\\n\\nImportar estes itens para o Pré-Corte?")) return;\n      const novos = [];\n      for (const x of encontrados) { const existente = itens.some((i) => i.pedido === pedidoPadrao && i.produto === x.produto && i.etapa === "pre_corte"); const posterior = itens.some((i) => i.pedido === pedidoPadrao && i.produto === x.produto && i.etapa !== "pre_corte"); if (!existente && !posterior) novos.push({ id: uid(), pedido: pedidoPadrao, produto: x.produto, qtd: x.qtd, etapa: "pre_corte", criadoEm: Date.now() }); }\n      if (!novos.length) { setErro("Nenhum item novo foi importado. Duplicados foram ignorados."); return; }\n      await salvar([...itens, ...novos]); setErro("");';
const newConfirm = 'const divergentes = encontrados.filter((x) => x.produto === "__DIVERGENTE__");\n      if (divergentes.length) { setPdfPedidoRevisao(pedidoPadrao); setPdfRevisaoDivergentes(encontrados); setMostrarPdfRevisao(true); return; }\n      await concluirImportacaoPdf(encontrados);';
if (source.includes(oldConfirm)) source = source.replace(oldConfirm, newConfirm);

if (!source.includes('const setPdfRevisaoDivergente =')) {
  const before = '  const exportarXLSX = () => {';
  const fn = '  const setPdfRevisaoDivergente = (id, valor, textoNovo) => setPdfRevisaoDivergentes((ls) => ls.map((x) => x.id === id ? { ...x, produtoEscolhido: valor, produtoNovo: textoNovo !== undefined ? textoNovo : x.produtoNovo } : x));\n\n';
  if (!source.includes(before)) throw new Error('âncora exportarXLSX não encontrada');
  source = source.replace(before, fn + before);
}

if (!source.includes('Conferir produtos do PDF')) {
  const pos = source.indexOf('onClick={exportarPDF}');
  if (pos < 0) throw new Error('botão exportar PDF não encontrado');
  const start = source.lastIndexOf('<button', pos);
  if (start < 0) throw new Error('início do botão PDF não encontrado');
  const modal = `          {mostrarPdfRevisao && <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>\n            <div style={{background:"#fffdf7",borderRadius:14,padding:16,width:"100%",maxWidth:620,maxHeight:"90vh",overflowY:"auto",boxSizing:"border-box"}}>\n              <h3 style={{marginTop:0}}>Conferir produtos do PDF</h3>\n              <p>Os itens abaixo não foram reconhecidos automaticamente. Escolha o produto correto antes de importar.</p>\n              {pdfRevisaoDivergentes.filter((x)=>x.produto==="__DIVERGENTE__").map((x)=>{ const valor=x.produtoEscolhido||""; return <div key={x.id} style={{padding:10,marginBottom:10,border:"1px solid #ddd2c0",borderRadius:10}}>\n                <div style={{fontWeight:700,marginBottom:6}}>PDF: {x.produtoOriginal||"Produto não identificado"} · {x.qtd}un</div>\n                <select style={{width:"100%",padding:10,boxSizing:"border-box"}} value={valor} onChange={(e)=>setPdfRevisaoDivergente(x.id,e.target.value)}>\n                  <option value="">Escolha o produto...</option>\n                  {[...PRODUTOS].sort((a,b)=>a.localeCompare(b,"pt-BR")).map((p)=><option key={p} value={p}>{p}</option>)}\n                  <option value="__NOVO__">Cadastrar este nome como produto novo</option>\n                </select>\n                {valor==="__NOVO__" && <input style={{width:"100%",padding:10,marginTop:6,boxSizing:"border-box"}} placeholder="Nome do produto" value={x.produtoNovo||""} onChange={(e)=>setPdfRevisaoDivergente(x.id,"__NOVO__",e.target.value)} />}\n              </div>; })}\n              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>\n                <button onClick={()=>{setMostrarPdfRevisao(false);setPdfRevisaoDivergentes([]);}}>Cancelar</button>\n                <button style={{background:"#df5b25",color:"white",border:0,padding:"10px 14px",borderRadius:8}} onClick={()=>{ const linhas=pdfRevisaoDivergentes.map((x)=>x.produto==="__DIVERGENTE__"?({...x,produtoEscolhido:x.produtoEscolhido==="__NOVO__"?(x.produtoNovo||""):x.produtoEscolhido}):x); concluirImportacaoPdf(linhas); }}>Confirmar importação</button>\n              </div>\n            </div>\n          </div>}\n`;
  source = source.slice(0,start) + modal + source.slice(start);
}

if (!source.includes('MIGRACAO_11109_MOUSE_PAD')) {
  const mapAnchor = '.map((i) => ({ ...i, etapa:';
  const mapReplacement = '.map((i) => ({ ...i, produto: (String(i.pedido) === "11109" && (i.produto === "Manual" || i.produto === "__MANUAL__")) ? "MOUSE PAD ERGONÔMICO" : i.produto, etapa:';
  if (!source.includes(mapAnchor)) throw new Error('mapa de normalização não encontrado');
  source = source.replace('const normalizarItens = (lista) => {', 'const normalizarItens = (lista) => {\n  // MIGRACAO_11109_MOUSE_PAD');
  source = source.replace(mapAnchor, mapReplacement);
}

fs.writeFileSync(path, source, 'utf8');
console.log('NeoCooler: revisão de produtos divergentes do PDF corrigida.');
