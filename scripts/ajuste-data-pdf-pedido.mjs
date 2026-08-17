import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("// DATA_PDF_PEDIDO_V1")) {
  console.log("NeoCooler: data única do pedido no PDF já aplicada.");
  process.exit(0);
}

const estadoAnchor = '  const [mostrarImportacaoPdf, setMostrarImportacaoPdf] = useState(false);';
if (!source.includes(estadoAnchor)) throw new Error("NeoCooler: estado da importação PDF não encontrado.");
source = source.replace(estadoAnchor, `${estadoAnchor}\n  // DATA_PDF_PEDIDO_V1\n  const [pdfDataEntrega, setPdfDataEntrega] = useState("");`);

const parserAnchor = '      setPdfLinhas(encontrados);';
if (!source.includes(parserAnchor)) throw new Error("NeoCooler: ponto de carregamento das linhas PDF não encontrado.");
source = source.replace(parserAnchor, `${parserAnchor}\n      setPdfDataEntrega(encontrados[0]?.dataEntrega || "");`);

const inicio = source.indexOf('  const confirmarImportacaoPdf = () => {');
const fim = source.indexOf('  };', inicio);
if (inicio === -1 || fim === -1) throw new Error("NeoCooler: função de confirmação PDF não encontrada.");
const novaConfirmacao = `  const confirmarImportacaoPdf = async () => {\n    const novos = pdfLinhas\n      .filter((l) => l.incluir)\n      .map((l) => ({\n        id: uid(),\n        pedido: String(l.pedido || "").trim(),\n        produto: l.produto === "__MANUAL__" ? String(l.produtoManual || l.textoOriginal || "").trim() : l.produto,\n        qtd: Math.max(1, Number(l.qtd) || 1),\n        passaPeloCorte: l.passaPeloCorte !== false,\n        etapa: l.passaPeloCorte !== false ? "pre_corte" : "aguardando_sublimacao",\n        criadoEm: Date.now(),\n      }))\n      .filter((l) => l.pedido && l.produto);\n\n    await salvar([...itens, ...novos]);\n\n    if (pdfDataEntrega) {\n      const pedidosImportados = [...new Set(novos.map((l) => l.pedido))];\n      const metaAtualizada = { ...pedidosMeta };\n      pedidosImportados.forEach((numero) => {\n        metaAtualizada[numero] = { ...(metaAtualizada[numero] || {}), dataEntrega: pdfDataEntrega, excluidoPreCorte: false };\n      });\n      await salvarMeta(metaAtualizada);\n    }\n\n    setMostrarImportacaoPdf(false);\n    setPdfLinhas([]);\n    setPdfDataEntrega("");\n  };`;
source = source.slice(0, inicio) + novaConfirmacao + source.slice(fim + 4);

const cabecalhoAntigo = '<thead><tr><th style={styles.thPdf}>OK</th><th style={styles.thPdf}>Pedido</th><th style={styles.thPdf}>Texto do PDF</th><th style={styles.thPdf}>Produto no NeoCooler</th><th style={styles.thPdf}>Qtd</th><th style={styles.thPdf}>Entrega</th><th style={styles.thPdf}>Corte?</th></tr></thead>';
const cabecalhoNovo = '<thead><tr><th style={styles.thPdf}>OK</th><th style={styles.thPdf}>Pedido</th><th style={styles.thPdf}>Texto do PDF</th><th style={styles.thPdf}>Produto no NeoCooler</th><th style={styles.thPdf}>Qtd</th><th style={styles.thPdf}>Corte?</th></tr></thead>';
if (!source.includes(cabecalhoAntigo)) throw new Error("NeoCooler: cabeçalho da tabela PDF não encontrado.");
source = source.replace(cabecalhoAntigo, cabecalhoNovo);

const dataColuna = '<td style={styles.tdPdf}><input style={{ ...styles.pdfInput, width: 130 }} type="date" value={l.dataEntrega} onChange={(e) => atualizarLinhaPdf(l.id, "dataEntrega", e.target.value)} /></td>';
if (!source.includes(dataColuna)) throw new Error("NeoCooler: coluna de data individual do PDF não encontrada.");
source = source.replace(dataColuna, '');

const tabelaAnchor = '              <div style={{ overflowX: "auto", maxHeight: "58vh", overflowY: "auto" }}>';
const dataPedido = `              <div style={{ background: "#f6f1e4", border: "1px solid #e4dbc8", borderRadius: 10, padding: 12, marginBottom: 12 }}>\n                <label style={{ display: "flex", flexDirection: "column", gap: 5, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>\n                  <span style={{ fontSize: 11.5, color: "#7a7160", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Data de entrega do pedido</span>\n                  <input style={{ ...styles.pdfInput, maxWidth: 220 }} type="date" value={pdfDataEntrega} onChange={(e) => setPdfDataEntrega(e.target.value)} />\n                </label>\n                <div style={{ marginTop: 6, fontSize: 12, color: "#7a7160", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>Essa data será aplicada a todos os produtos deste pedido.</div>\n              </div>\n\n${tabelaAnchor}`;
if (!source.includes(tabelaAnchor)) throw new Error("NeoCooler: tabela da importação PDF não encontrada.");
source = source.replace(tabelaAnchor, dataPedido);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: importação PDF agora usa uma única data de entrega por pedido.");
