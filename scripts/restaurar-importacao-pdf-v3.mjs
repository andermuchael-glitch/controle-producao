import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("const importarPdf = async")) {
  console.log("NeoCooler: importador PDF já instalado.");
  process.exit(0);
}

const anchor = '  const [pdfGerando, setPdfGerando] = useState(false);';
if (!source.includes(anchor)) throw new Error("NeoCooler: estado pdfGerando não encontrado.");

const bloco = String.raw`  const normalizarTextoPdf = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const equivalenciasCodigoPdf = { LTA: "LATA 350ML", NECG: "NECESSAIRE GRANDE", NEC: "NECESSAIRE", MDR: "MOEDEIRO" };
  const carregarPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    await new Promise((resolve, reject) => { s.onload = resolve; s.onerror = reject; document.head.appendChild(s); });
    return window.pdfjsLib;
  };
  const importarPdf = async (arquivo) => {
    if (!arquivo) return;
    setImportandoPdf(true); setErro("");
    try {
      const pdfjs = await carregarPdfJs();
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const pdf = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise;
      const linhas = [];
      for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
        const page = await pdf.getPage(pagina); const content = await page.getTextContent(); const porY = {};
        for (const item of content.items) { const y = Math.round(item.transform?.[5] || 0); if (!porY[y]) porY[y] = []; porY[y].push({ x: item.transform?.[4] || 0, texto: item.str || "" }); }
        Object.keys(porY).sort((a,b) => Number(b)-Number(a)).forEach((y) => { const texto = porY[y].sort((a,b) => a.x-b.x).map((x) => x.texto).join(" ").replace(/\s+/g, " ").trim(); if (texto) linhas.push(texto); });
      }
      const texto = linhas.join("\n"); const venda = texto.match(/\bVenda\s+(\d+)\b/i); const pedidoPadrao = venda ? venda[1] : ""; const encontrados = [];
      const mapaProduto = (descricao, codigo) => { const cod = String(codigo || "").toUpperCase(); if (equivalenciasCodigoPdf[cod]) return equivalenciasCodigoPdf[cod]; const alvo = normalizarTextoPdf(descricao); const exato = PRODUTOS.find((p) => normalizarTextoPdf(p) === alvo); if (exato) return exato; const parcial = PRODUTOS.find((p) => alvo.includes(normalizarTextoPdf(p)) || normalizarTextoPdf(p).includes(alvo)); return parcial || ""; };
      for (const linha of linhas) {
        const m = linha.match(/^(\d+)\s+([A-Z0-9]{2,10})\s*-\s*NEO\s*-\s*(.+?)\s+(\d+[,.]\d{2})\s+[\d.]+[,.]\d{2}\s*$/i); if (!m) continue;
        const qtdItem = Math.max(1, Number(m[1]) || 1); const codigo = m[2].toUpperCase(); const descricao = m[3].replace(/\bNEO\b/gi, "").replace(/\s+/g, " ").trim(); const produtoPdf = mapaProduto(descricao, codigo); if (!produtoPdf || !pedidoPadrao) continue;
        const chave = pedidoPadrao + "||" + produtoPdf.toUpperCase(); if (encontrados.some((x) => x.chave === chave)) continue; encontrados.push({ chave, produto: produtoPdf, qtd: qtdItem });
      }
      if (!encontrados.length) { setErro("PDF lido, mas nenhum produto foi reconhecido. Verifique o formato do PDF."); return; }
      const resumo = encontrados.map((x) => x.produto + " — " + x.qtd + "un").join("\n");
      if (!window.confirm("Pedido #" + pedidoPadrao + "\n\n" + resumo + "\n\nImportar estes itens para o Pré-Corte?")) return;
      const novos = [];
      for (const x of encontrados) { const existente = itens.some((i) => i.pedido === pedidoPadrao && i.produto === x.produto && i.etapa === "pre_corte"); const posterior = itens.some((i) => i.pedido === pedidoPadrao && i.produto === x.produto && i.etapa !== "pre_corte"); if (!existente && !posterior) novos.push({ id: uid(), pedido: pedidoPadrao, produto: x.produto, qtd: x.qtd, etapa: "pre_corte", criadoEm: Date.now() }); }
      if (!novos.length) { setErro("Nenhum item novo foi importado. Duplicados foram ignorados."); return; }
      await salvar([...itens, ...novos]); setErro("");
    } catch (e) { console.error(e); setErro("Não foi possível ler o PDF."); } finally { setImportandoPdf(false); }
  };
`;
source = source.replace(anchor, anchor + "\n  const [importandoPdf, setImportandoPdf] = useState(false);\n" + bloco);

const botaoAnchor = '          <button style={styles.exportBtn} onClick={exportarPDF} disabled={!itens.length || pdfGerando}>{pdfGerando ? "Gerando PDF..." : "📄 Baixar PDF"}</button>';
if (!source.includes(botaoAnchor)) throw new Error("NeoCooler: botão Baixar PDF não encontrado.");
const botao = botaoAnchor + '\n          <label style={{...styles.exportBtn, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: importandoPdf ? "wait" : "pointer", opacity: importandoPdf ? 0.65 : 1}}>{importandoPdf ? "Lendo PDF..." : "📥 Importar PDF"}<input type="file" accept="application/pdf,.pdf" style={{display:"none"}} disabled={importandoPdf} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; importarPdf(f); }} /></label>';
source = source.replace(botaoAnchor, botao);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: importador PDF restaurado sem template strings aninhadas.");
