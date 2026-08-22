import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("// RESTAURAR_IMPORTACAO_PDF_V1")) {
  console.log("NeoCooler: importador PDF já instalado.");
  process.exit(0);
}

const estadoAnchor = '  const [pdfGerando, setPdfGerando] = useState(false);';
if (!source.includes(estadoAnchor)) throw new Error("NeoCooler: estado pdfGerando não encontrado.");

const estado = `${estadoAnchor}
  // RESTAURAR_IMPORTACAO_PDF_V1
  const [importandoPdf, setImportandoPdf] = useState(false);
  const [pdfNome, setPdfNome] = useState("");
  const [pdfLinhas, setPdfLinhas] = useState([]);
  const [mostrarImportacaoPdf, setMostrarImportacaoPdf] = useState(false);
`;
source = source.replace(estadoAnchor, estado);

const funcAnchor = '  const exportarXLSX = () => {';
if (!source.includes(funcAnchor)) throw new Error("NeoCooler: âncora exportarXLSX não encontrada.");

const funcoes = `  const normalizarTextoPdf = (v) => String(v || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const limparDescricaoPdf = (texto) => String(texto || "").replace(/\\bNEO\\b/gi, " ").replace(/\\s+/g, " ").replace(/\\s*-\\s*$/g, "").trim();
  const equivalenciasCodigoPdf = { LTA: "LATA 350ML", NECG: "NECESSAIRE GRANDE", NEC: "NECESSAIRE", MDR: "MOEDEIRO", BP: "BOLSA FEMININA" };
  const sugerirProdutoPdf = (texto, codigo = "") => {
    const alvo = normalizarTextoPdf(texto);
    const codigoLimpo = String(codigo || "").toUpperCase().trim();
    if (equivalenciasCodigoPdf[codigoLimpo]) return equivalenciasCodigoPdf[codigoLimpo];
    if (!alvo) return "__MANUAL__";
    const candidatos = [...PRODUTOS].map((nome) => {
      const n = normalizarTextoPdf(nome);
      if (alvo === n) return { nome, score: 100 };
      if (alvo.includes(n) || n.includes(alvo)) return { nome, score: 80 };
      const palavras = n.split(" ").filter((p) => p.length >= 3);
      const acertos = palavras.filter((p) => alvo.includes(p)).length;
      return { nome, score: palavras.length ? (acertos / palavras.length) * 60 : 0 };
    }).sort((a, b) => b.score - a.score);
    return candidatos[0]?.score >= 80 ? candidatos[0].nome : "__MANUAL__";
  };
  const carregarPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    await new Promise((resolve, reject) => { s.onload = resolve; s.onerror = reject; document.head.appendChild(s); });
    return window.pdfjsLib;
  };
  const extrairLinhasPdf = async (arquivo) => {
    const pdfjs = await carregarPdfJs();
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise;
    const linhas = [];
    for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
      const page = await pdf.getPage(pagina);
      const content = await page.getTextContent();
      const porY = {};
      for (const item of content.items) {
        const y = Math.round(item.transform?.[5] || 0);
        if (!porY[y]) porY[y] = [];
        porY[y].push({ x: item.transform?.[4] || 0, texto: item.str || "" });
      }
      Object.keys(porY).sort((a, b) => Number(b) - Number(a)).forEach((y) => {
        const texto = porY[y].sort((a, b) => a.x - b.x).map((x) => x.texto).join(" ").replace(/\\s+/g, " ").trim();
        if (texto) linhas.push(texto);
      });
    }
    return linhas;
  };
  const abrirImportacaoPdf = async (arquivo) => {
    if (!arquivo) return;
    setImportandoPdf(true); setPdfNome(arquivo.name); setErro("");
    try {
      const linhas = await extrairLinhasPdf(arquivo);
      const textoCompleto = linhas.join("\\n");
      const venda = textoCompleto.match(/\\bVenda\\s+(\\d+)\\b/i);
      const pedidoPadrao = venda?.[1] || "";
      const encontrados = [];
      const indiceCabecalho = linhas.findIndex((l) => /Qt\\.?\\s*Produto\\/Servi/i.test(l));
      const linhasTabela = indiceCabecalho >= 0 ? linhas.slice(indiceCabecalho + 1) : linhas;
      for (let i = 0; i < linhasTabela.length; i++) {
        const linha = linhasTabela[i];
        const m = linha.match(/^(\\d+)\\s+([A-Z0-9]{2,10})\\s*-\\s*NEO\\s*-\\s*(.+?)\\s+(\\d+[,.]\\d{2})\\s+[\\d.]+[,.]\\d{2}\\s*$/i);
        if (!m) continue;
        const qtdItem = Number(m[1]);
        const codigo = m[2].toUpperCase();
        let descricao = limparDescricaoPdf(m[3]);
        const continuacoes = [];
        for (let j = i + 1; j < linhasTabela.length; j++) {
          if (/^\\d+\\s+[A-Z0-9]{2,10}\\s*-\\s*NEO\\s*-/i.test(linhasTabela[j])) break;
          if (/^(?:Valor líquido|Total|Condição de pagamento|Forma de pagamento|Página)\\b/i.test(linhasTabela[j])) break;
          if (linhasTabela[j] && !/^\\d+[\\s]/.test(linhasTabela[j])) continuacoes.push(linhasTabela[j]);
        }
        if (continuacoes.length) descricao = limparDescricaoPdf(`${descricao} ${continuacoes.join(" ")}`);
        const produtoSugerido = sugerirProdutoPdf(descricao, codigo);
        encontrados.push({ id: uid(), pedido: pedidoPadrao, textoOriginal: `${codigo} — ${descricao}`, codigoPdf: codigo, produto: produtoSugerido, produtoManual: "", qtd: qtdItem, dataEntrega: "", incluir: true, confianca: produtoSugerido === "__MANUAL__" ? "revisar" : (equivalenciasCodigoPdf[codigo] ? "confirmado" : "provavel") });
      }
      setPdfLinhas(encontrados);
      if (!encontrados.length) {
        setErro("O PDF foi lido, mas nenhuma linha de produto foi reconhecida. Se o formato mudou, envie o PDF para ajustarmos o importador.");
        return;
      }
      setMostrarImportacaoPdf(true);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível ler este PDF. Tente novamente ou envie o PDF para ajustarmos o formato.");
    } finally { setImportandoPdf(false); }
  };
  const atualizarLinhaPdf = (id, campo, valor) => setPdfLinhas((ls) => ls.map((l) => l.id === id ? { ...l, [campo]: valor } : l));
  const confirmarImportacaoPdf = async () => {
    const novos = [];
    const meta = { ...pedidosMeta };
    const chavesNovas = new Set();
    for (const l of pdfLinhas.filter((x) => x.incluir)) {
      const pedidoPdf = String(l.pedido || "").trim();
      const produtoPdf = l.produto === "__MANUAL__" ? String(l.produtoManual || "").trim() : String(l.produto || "").trim();
      if (!pedidoPdf || !produtoPdf) continue;
      const chave = `${pedidoPdf}||${produtoPdf}`;
      if (chavesNovas.has(chave)) continue;
      chavesNovas.add(chave);
      const existente = itens.find((i) => i.pedido === pedidoPdf && i.produto === produtoPdf && i.etapa === "pre_corte");
      if (existente) continue;
      const posterior = itens.find((i) => i.pedido === pedidoPdf && i.produto === produtoPdf && i.etapa !== "pre_corte");
      if (posterior) continue;
      novos.push({ id: uid(), pedido: pedidoPdf, produto: produtoPdf, qtd: Math.max(1, Number(l.qtd) || 1), etapa: "pre_corte", criadoEm: Date.now() });
      if (l.dataEntrega) meta[pedidoPdf] = { ...(meta[pedidoPdf] || {}), dataEntrega: l.dataEntrega };
    }
    if (!novos.length) { setErro("Nenhum item novo foi importado. Os itens já existentes ou duplicados foram ignorados."); return; }
    await salvar([...itens, ...novos]);
    await salvarMeta(meta);
    setMostrarImportacaoPdf(false); setPdfLinhas([]); setPdfNome(""); setErro("");
  };

`;
source = source.replace(funcAnchor, funcoes + funcAnchor);

const botaoAnchor = '          <button style={styles.exportBtn} onClick={exportarPDF} disabled={!itens.length || pdfGerando}>{pdfGerando ? "Gerando PDF..." : "📄 Baixar PDF"}</button>';
if (!source.includes(botaoAnchor)) throw new Error("NeoCooler: botão Baixar PDF não encontrado.");
const botaoImportar = `${botaoAnchor}\n          <label style={{ ...styles.exportBtn, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: importandoPdf ? "wait" : "pointer", opacity: importandoPdf ? 0.65 : 1 }}>${importandoPdf ? "Lendo PDF..." : "📥 Importar PDF"}<input type="file" accept="application/pdf,.pdf" style={{ display: "none" }} disabled={importandoPdf} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; abrirImportacaoPdf(f); }} /></label>`;
source = source.replace(botaoAnchor, botaoImportar);

const modalAnchor = '        {confirmarLimpeza && <div style={styles.modalOverlay}';
if (!source.includes(modalAnchor)) throw new Error("NeoCooler: modal de limpeza não encontrado.");
const modal = `        {mostrarImportacaoPdf && <div style={styles.modalOverlay} onClick={() => setMostrarImportacaoPdf(false)}><div style={{ ...styles.modalBox, maxWidth: 1050, maxHeight: "85vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}><h3 style={styles.modalTitle}>Importar pedidos do PDF</h3><p style={styles.modalTexto}>{pdfNome || "Arquivo PDF"} — confira os itens antes de importar.</p><div style={{ overflowX: "auto", border: "1px solid #ddd3bd", borderRadius: 8 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, fontSize: 12 }}><thead><tr><th style={{ padding: 7, textAlign: "left", background: "#f2ede2" }}>Pedido</th><th style={{ padding: 7, textAlign: "left", background: "#f2ede2" }}>Produto</th><th style={{ padding: 7, textAlign: "left", background: "#f2ede2" }}>Qtd</th><th style={{ padding: 7, textAlign: "left", background: "#f2ede2" }}>Data entrega</th><th style={{ padding: 7, textAlign: "left", background: "#f2ede2" }}>Conferência</th><th style={{ padding: 7, textAlign: "left", background: "#f2ede2" }}>Incluir</th></tr></thead><tbody>{pdfLinhas.map((l) => <tr key={l.id}><td style={{ padding: 7, borderBottom: "1px solid #eee7da" }}><input style={{ ...styles.input, minWidth: 100 }} value={l.pedido} onChange={(e) => atualizarLinhaPdf(l.id, "pedido", e.target.value)} /></td><td style={{ padding: 7, borderBottom: "1px solid #eee7da" }}><select style={{ ...styles.input, minWidth: 220 }} value={l.produto} onChange={(e) => atualizarLinhaPdf(l.id, "produto", e.target.value)}><option value="__MANUAL__">✏️ Escrever manualmente</option>{PRODUTOS.map((p) => <option key={p} value={p}>{p}</option>)}</select>{l.produto === "__MANUAL__" && <input style={{ ...styles.input, marginTop: 5 }} value={l.produtoManual} onChange={(e) => atualizarLinhaPdf(l.id, "produtoManual", e.target.value)} placeholder="Nome do produto" />}</td><td style={{ padding: 7, borderBottom: "1px solid #eee7da" }}><input type="number" min="1" style={{ ...styles.input, width: 80 }} value={l.qtd} onChange={(e) => atualizarLinhaPdf(l.id, "qtd", e.target.value)} /></td><td style={{ padding: 7, borderBottom: "1px solid #eee7da" }}><input type="date" style={{ ...styles.input, width: 150 }} value={l.dataEntrega || ""} onChange={(e) => atualizarLinhaPdf(l.id, "dataEntrega", e.target.value)} /></td><td style={{ padding: 7, borderBottom: "1px solid #eee7da" }}>{l.confianca === "confirmado" ? "✓ confirmado" : l.confianca === "provavel" ? "⚠ provável" : "✎ revisar"}<div style={{ fontSize: 10, opacity: .7, marginTop: 3 }}>{l.textoOriginal}</div></td><td style={{ padding: 7, borderBottom: "1px solid #eee7da", textAlign: "center" }}><input type="checkbox" checked={!!l.incluir} onChange={(e) => atualizarLinhaPdf(l.id, "incluir", e.target.checked)} /></td></tr>)}</tbody></table></div><div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}><button style={{ ...styles.modalFechar, flex: 1 }} onClick={confirmarImportacaoPdf} disabled={!pdfLinhas.some((l) => l.incluir)}>✓ Confirmar e importar</button><button style={{ ...styles.modalFechar, background: "transparent", color: "#7a7160", flex: 1 }} onClick={() => setMostrarImportacaoPdf(false)}>Cancelar</button></div></div></div>}

`;
source = source.replace(modalAnchor, modal + modalAnchor);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: botão e importador de pedidos por PDF restaurados.");
