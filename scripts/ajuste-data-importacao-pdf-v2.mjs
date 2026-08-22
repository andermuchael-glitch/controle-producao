import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
if (source.includes("PDF_DATA_UNICA_V2")) process.exit(0);

const stateAnchor = '  const [mostrarImportacaoPdf, setMostrarImportacaoPdf] = useState(false);';
if (!source.includes(stateAnchor)) throw new Error("NeoCooler: estado da importação PDF não encontrado.");
source = source.replace(stateAnchor, `${stateAnchor}\n  // PDF_DATA_UNICA_V2\n  const [pdfDataEntrega, setPdfDataEntrega] = useState("");`);

const metaOld = '    const metaAtualizada = { ...pedidosMeta };\n    resolvidos.forEach((x) => { if (x.dataEntrega) metaAtualizada[x.pedido] = { ...(metaAtualizada[x.pedido] || {}), dataEntrega: x.dataEntrega, excluidoPreCorte: false }; });';
const metaNew = '    const metaAtualizada = { ...pedidosMeta };\n    if (pdfDataEntrega) {\n      [...new Set(resolvidos.map((x) => x.pedido))].forEach((numero) => { metaAtualizada[numero] = { ...(metaAtualizada[numero] || {}), dataEntrega: pdfDataEntrega, excluidoPreCorte: false }; });\n    }';
if (!source.includes(metaOld)) throw new Error("NeoCooler: gravação da data PDF não encontrada.");
source = source.replace(metaOld, metaNew);
source = source.replace('setMostrarImportacaoPdf(false); setPdfLinhas([]); setPdfNome(""); setErro("");', 'setMostrarImportacaoPdf(false); setPdfLinhas([]); setPdfNome(""); setPdfDataEntrega(""); setErro("");');

const headerOld = '<th style={{padding:8,textAlign:"left"}}>Data de entrega</th>';
const cellOld = '<td style={{padding:8}}><input style={{width:135,padding:7}} type="date" value={l.dataEntrega || ""} onChange={(e)=>atualizarLinhaPdf(l.id,"dataEntrega",e.target.value)} /></td>';
if (!source.includes(headerOld) || !source.includes(cellOld)) throw new Error("NeoCooler: campo de data da tabela PDF não encontrado.");
source = source.replace(headerOld, '');
source = source.replace(cellOld, '');

const tableAnchor = '              <div style={{ overflow: "auto", maxHeight: "68vh", padding: 12 }}>';
const dateBox = '              <div style={{ background: "#f6f1e4", border: "1px solid #e4dbc8", borderRadius: 10, padding: 12, margin: "12px 12px 0" }}>\n                <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "#6f6658" }}>\n                  DATA DE ENTREGA DO PEDIDO\n                  <input type="date" style={{ width: 220, padding: 8, marginTop: 2 }} value={pdfDataEntrega} onChange={(e) => setPdfDataEntrega(e.target.value)} />\n                </label>\n                <div style={{ marginTop: 5, fontSize: 11, color: "#7a7160" }}>A data escolhida será aplicada a todos os produtos deste pedido.</div>\n              </div>\n';
if (!source.includes(tableAnchor)) throw new Error("NeoCooler: tabela PDF não encontrada.");
source = source.replace(tableAnchor, dateBox + tableAnchor);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: importação PDF restaurada com uma única data de entrega por pedido.");
