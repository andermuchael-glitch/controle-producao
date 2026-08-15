import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// The PDF exported from the user's sales system is structured as:
// "Venda 11063" followed by rows such as
// "36 MBAG - NEO - MINI BAG GRANDE 36,90 1.328,40"
// with continuation lines such as "LATERAL MBAG - NEO".
// Replace the generic parser injected by fix-build.mjs with one that understands
// this real format and keeps ambiguous products for manual review.
const inicio = source.indexOf("  const normalizarTextoPdf =");
const fim = source.indexOf("  const atualizarLinhaPdf =", inicio);

if (inicio !== -1 && fim !== -1) {
  const novoParser = `  const normalizarTextoPdf = (v) => (v || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const limparDescricaoPdf = (texto) => String(texto || "")
    .replace(/\\bNEO\\b/gi, " ")
    .replace(/\\b[A-Z0-9]{2,8}\\s*-?\\s*NEO\\b/gi, " ")
    .replace(/\\s+/g, " ")
    .replace(/\\s*-\\s*$/g, "")
    .trim();

  const equivalenciasCodigoPdf = {
    LTA: "LATA 350ML",
    NECG: "NECESSAIRE GRANDE",
    NEC: "NECESSAIRE",
    MDR: "MOEDEIRO",
    BP: "BOLSA FEMININA",
  };

  const sugerirProdutoPdf = (texto, codigo = "") => {
    const alvo = normalizarTextoPdf(texto);
    const codigoLimpo = String(codigo || "").toUpperCase().trim();
    if (equivalenciasCodigoPdf[codigoLimpo]) return equivalenciasCodigoPdf[codigoLimpo];
    if (!alvo) return "__MANUAL__";

    const candidatos = [...PRODUTOS].map((nome) => {
      const n = normalizarTextoPdf(nome);
      let score = 0;
      if (alvo === n) score = 100;
      else if (alvo.includes(n) || n.includes(alvo)) score = 80;
      else {
        const palavras = n.split(" ").filter((p) => p.length >= 3);
        const acertos = palavras.filter((p) => alvo.includes(p)).length;
        score = palavras.length ? (acertos / palavras.length) * 60 : 0;
      }
      return { nome, score };
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
      const inicioTabela = Math.max(0, linhas.findIndex((l) => /Qt\\.?\\s*\\.? Produto\\/Servi/i.test(l)));
      const linhasTabela = inicioTabela >= 0 ? linhas.slice(inicioTabela + 1) : linhas;

      for (let i = 0; i < linhasTabela.length; i++) {
        const linha = linhasTabela[i];
        const m = linha.match(/^(\\d+)\\s+([A-Z0-9]{2,10})\\s*-\\s*NEO\\s*-\\s*(.+?)\\s+(\\d+[,.]\\d{2})\\s+[\\d.]+[,.]\\d{2}\\s*$/i);
        if (!m) continue;

        const qtdItem = Number(m[1]);
        const codigo = m[2].toUpperCase();
        let descricao = limparDescricaoPdf(m[3]);

        // Continuation lines are part of the same product description until the next quantity row.
        const continuacoes = [];
        for (let j = i + 1; j < linhasTabela.length; j++) {
          if (/^\\d+\\s+[A-Z0-9]{2,10}\\s*-\\s*NEO\\s*-/i.test(linhasTabela[j])) break;
          if (/^(?:Valor líquido|Total|Condição de pagamento|Forma de pagamento|Página)\\b/i.test(linhasTabela[j])) break;
          if (linhasTabela[j] && !/^\\d+[\\s]/.test(linhasTabela[j])) continuacoes.push(linhasTabela[j]);
        }
        if (continuacoes.length) descricao = limparDescricaoPdf(`${descricao} ${continuacoes.join(" ")}`);

        const produtoSugerido = sugerirProdutoPdf(descricao, codigo);
        const confianca = produtoSugerido === "__MANUAL__" ? "revisar" : (equivalenciasCodigoPdf[codigo] ? "confirmado" : "provavel");
        encontrados.push({
          id: uid(), pedido: pedidoPadrao, textoOriginal: `${codigo} — ${descricao}`, codigoPdf: codigo,
          produto: produtoSugerido, produtoManual: "", qtd: qtdItem, dataEntrega: "", passaPeloCorte: true,
          incluir: true, confianca,
        });
      }

      setPdfLinhas(encontrados);
      if (!encontrados.length) {
        setErro("O PDF foi lido, mas nenhuma linha de produto foi reconhecida no formato esperado. Você pode enviar o arquivo aqui para ajustarmos outro modelo de PDF.");
        return;
      }
      setMostrarImportacaoPdf(true);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível ler este PDF. Tente novamente ou envie o PDF aqui para ajustarmos o formato.");
    } finally { setImportandoPdf(false); }
  };
`;
  source = source.slice(0, inicio) + novoParser + source.slice(fim);
}

// Add small table styles if the injected modal uses them.
if (!source.includes("thPdf:")) {
  const marker = "const styles = {";
  const pos = source.indexOf(marker);
  if (pos !== -1) {
    source = source.slice(0, pos) + marker + '\n  thPdf: { textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #d8cfbf", background: "#f2ede2", position: "sticky", top: 0 },\n  tdPdf: { padding: "7px 6px", borderBottom: "1px solid #eee7da", verticalAlign: "top" },' + source.slice(pos + marker.length);
  }
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: importador PDF ajustado ao formato real de vendas e revisão manual.");
