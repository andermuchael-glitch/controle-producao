import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

let alterado = false;

const reparos = [
  {
    nome: "alocGrid",
    from: 'alocGrid: { display: "grid", g\n  };',
    to: 'alocGrid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr 0.8fr auto", gap: 8 },\n};',
  },
  {
    nome: "limparTudo",
    from: 'setConfirmarLimpeza(false);const exportarXLSX = () => {',
    to: 'setConfirmarLimpeza(false);\n  };\n\n  const exportarXLSX = () => {',
  },
  {
    nome: "estadoProdutoManual",
    from: 'const [produto, setProduto] = useState(PRODUTOS[0]);\n  const [qtd, setQtd] = useState(1);',
    to: 'const [produto, setProduto] = useState(PRODUTOS[0]);\n  const [produtoManual, setProdutoManual] = useState("");\n  const [passaPeloCorte, setPassaPeloCorte] = useState(true);\n  const [qtd, setQtd] = useState(1);',
  },
  {
    nome: "adicionarProdutoManual",
    from: '  const adicionarItem = () => {\n    if (!pedido.trim()) return;\n    const novo = {\n      id: uid(),\n      pedido: pedido.trim(),\n      produto,\n      qtd: Math.max(1, Number(qtd) || 1),\n      etapa: "pre_corte",\n      criadoEm: Date.now(),\n    };',
    to: '  const adicionarItem = () => {\n    if (!pedido.trim()) return;\n    const produtoFinal = produto === "__MANUAL__" ? produtoManual.trim() : produto;\n    if (!produtoFinal) {\n      setErro("Digite o nome do produto novo antes de adicionar.");\n      return;\n    }\n    const novo = {\n      id: uid(),\n      pedido: pedido.trim(),\n      produto: produtoFinal,\n      qtd: Math.max(1, Number(qtd) || 1),\n      passaPeloCorte,\n      etapa: passaPeloCorte ? "pre_corte" : "aguardando_sublimacao",\n      criadoEm: Date.now(),\n    };',
  },
  {
    nome: "limparFormularioProdutoManual",
    from: '    if (dataEntregaForm) definirDataEntrega(pedido.trim(), dataEntregaForm);\n    setQtd(1);',
    to: '    if (dataEntregaForm) definirDataEntrega(pedido.trim(), dataEntregaForm);\n    setQtd(1);\n    setProdutoManual("");\n    setProduto(PRODUTOS[0]);\n    setPassaPeloCorte(true);',
  },
  {
    nome: "campoProdutoManual",
    from: '            <Field label="Produto">\n              <select style={styles.input} value={produto} onChange={(e) => setProduto(e.target.value)}>\n                {PRODUTOS.map((p) => (\n                  <option key={p} value={p}>{p}</option>\n                ))}\n              </select>\n            </Field>\n            <Field label="Qtd do pedido">',
    to: '            <Field label="Produto">\n              <select style={styles.input} value={produto} onChange={(e) => setProduto(e.target.value)}>\n                <option value="__MANUAL__">✏️ Escrever manualmente</option>\n                {[...PRODUTOS].sort((a, b) => a.localeCompare(b, "pt-BR")).map((p) => (\n                  <option key={p} value={p}>{p}</option>\n                ))}\n              </select>\n              {produto === "__MANUAL__" && (\n                <input style={{ ...styles.input, marginTop: 6 }} value={produtoManual} onChange={(e) => setProdutoManual(e.target.value)} placeholder="Nome do produto novo" autoComplete="off" />\n              )}\n            </Field>\n            <Field label="Passa pelo corte?">\n              <select style={styles.input} value={passaPeloCorte ? "sim" : "nao"} onChange={(e) => setPassaPeloCorte(e.target.value === "sim")}>\n                <option value="sim">Sim — entra no Pré-Corte</option>\n                <option value="nao">Não — vai direto para Aguardando Sublimação</option>\n              </select>\n            </Field>\n            <Field label="Qtd do pedido">',
  },
  {
    nome: "tituloLancamento",
    from: '<h2 style={styles.formTitle}>Lançar item manualmente (entra no pré-corte)</h2>',
    to: '<h2 style={styles.formTitle}>Lançar item manualmente</h2>',
  },
  {
    nome: "botaoLancamento",
    from: '<button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim()}>Adicionar ao pré-corte</button>',
    to: '<button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim() || (produto === "__MANUAL__" && !produtoManual.trim())}>{passaPeloCorte ? "Adicionar ao pré-corte" : "Adicionar sem passar pelo corte"}</button>',
  },
  {
    nome: "avisoLancamento",
    from: '<p style={styles.aviso}>Assim que o Patrick cortar, marque a quantidade e o dia na aba Pré-Corte.</p>',
    to: '<p style={styles.aviso}>Produtos novos podem ser escritos manualmente. Selecione se o item passa pelo corte; quando não passar, ele entra diretamente em Aguardando Sublimação.</p>',
  },
  {
    nome: "estadoImportacaoPdf",
    from: '  const [pdfGerando, setPdfGerando] = useState(false);',
    to: '  const [pdfGerando, setPdfGerando] = useState(false);\n  const [importandoPdf, setImportandoPdf] = useState(false);\n  const [pdfNome, setPdfNome] = useState("");\n  const [pdfLinhas, setPdfLinhas] = useState([]);\n  const [mostrarImportacaoPdf, setMostrarImportacaoPdf] = useState(false);\n\n  const normalizarTextoPdf = (v) => (v || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();\n  const sugerirProdutoPdf = (texto) => {\n    const alvo = normalizarTextoPdf(texto);\n    if (!alvo) return "__MANUAL__";\n    const candidatos = [...PRODUTOS].sort((a, b) => {\n      const na = normalizarTextoPdf(a); const nb = normalizarTextoPdf(b);\n      const sa = alvo === na ? 100 : alvo.includes(na) || na.includes(alvo) ? 70 : 0;\n      const sb = alvo === nb ? 100 : alvo.includes(nb) || nb.includes(alvo) ? 70 : 0;\n      return sb - sa;\n    });\n    return candidatos[0] && (normalizarTextoPdf(candidatos[0]) === alvo || alvo.includes(normalizarTextoPdf(candidatos[0])) || normalizarTextoPdf(candidatos[0]).includes(alvo)) ? candidatos[0] : "__MANUAL__";\n  };\n  const carregarPdfJs = async () => {\n    if (window.pdfjsLib) return window.pdfjsLib;\n    await new Promise((resolve, reject) => {\n      const s = document.createElement("script");\n      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";\n      s.type = "module";\n      s.onload = resolve; s.onerror = reject; document.head.appendChild(s);\n    });\n    return window.pdfjsLib;\n  };\n  const abrirImportacaoPdf = async (arquivo) => {\n    if (!arquivo) return;\n    setImportandoPdf(true); setPdfNome(arquivo.name); setErro("");\n    try {\n      let pdfjs = window.pdfjsLib;\n      if (!pdfjs) {\n        const s = document.createElement("script");\n        s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";\n        await new Promise((resolve, reject) => { s.onload = resolve; s.onerror = reject; document.head.appendChild(s); });\n        pdfjs = window.pdfjsLib;\n      }\n      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";\n      const buffer = await arquivo.arrayBuffer();\n      const pdf = await pdfjs.getDocument({ data: buffer }).promise;\n      const textos = [];\n      for (let n = 1; n <= pdf.numPages; n++) {\n        const page = await pdf.getPage(n);\n        const content = await page.getTextContent();\n        textos.push(content.items.map((x) => x.str).join(" "));\n      }\n      const texto = textos.join("\\n");\n      const linhas = texto.split(/\\n+/).map((x) => x.replace(/\\s+/g, " ").trim()).filter(Boolean);\n      const encontrados = [];\n      for (let i = 0; i < linhas.length; i++) {\n        const l = linhas[i];\n        const pedidoMatch = l.match(/(?:pedido|ordem|os|n[ºo]?)[\\s:#-]*([0-9]{2,})/i);\n        const qtdMatch = l.match(/(?:qtd|quantidade|qtde)[\\s:=#-]*([0-9]+)/i);\n        if (pedidoMatch) {\n          const produtoTexto = l.replace(pedidoMatch[0], "").replace(qtdMatch ? qtdMatch[0] : "", "").replace(/[|:;-]+/g, " ").trim();\n          encontrados.push({ id: uid(), pedido: pedidoMatch[1], textoOriginal: produtoTexto || linhas[i + 1] || "", produto: sugerirProdutoPdf(produtoTexto || linhas[i + 1] || ""), produtoManual: "", qtd: qtdMatch ? Number(qtdMatch[1]) : 1, dataEntrega: "", passaPeloCorte: true, incluir: true, confianca: sugerirProdutoPdf(produtoTexto || linhas[i + 1] || "") === "__MANUAL__" ? "revisar" : "provavel" });\n        }\n      }\n      if (!encontrados.length) {\n        const candidatas = linhas.filter((l) => /[0-9]/.test(l)).slice(0, 100);\n        setPdfLinhas(candidatas.map((l) => ({ id: uid(), pedido: "", textoOriginal: l, produto: "__MANUAL__", produtoManual: l, qtd: 1, dataEntrega: "", passaPeloCorte: true, incluir: true, confianca: "revisar" })));\n      } else setPdfLinhas(encontrados);\n      setMostrarImportacaoPdf(true);\n    } catch (e) {\n      setErro("Não foi possível ler este PDF. Se ele for uma imagem/escaneado, envie o PDF aqui e eu posso adaptar o importador ao formato dele.");\n    } finally { setImportandoPdf(false); }\n  };\n  const atualizarLinhaPdf = (id, campo, valor) => setPdfLinhas((ls) => ls.map((l) => l.id === id ? { ...l, [campo]: valor } : l));\n  const confirmarImportacaoPdf = () => {\n    const novos = pdfLinhas.filter((l) => l.incluir).map((l) => ({\n      id: uid(), pedido: String(l.pedido || "").trim(), produto: l.produto === "__MANUAL__" ? String(l.produtoManual || l.textoOriginal || "").trim() : l.produto, qtd: Math.max(1, Number(l.qtd) || 1), passaPeloCorte: l.passaPeloCorte !== false, etapa: l.passaPeloCorte !== false ? "pre_corte" : "aguardando_sublimacao", criadoEm: Date.now()\n    })).filter((l) => l.pedido && l.produto);\n    const meta = { ...pedidosMeta };\n    pdfLinhas.filter((l) => l.incluir && l.pedido && l.dataEntrega).forEach((l) => { meta[l.pedido] = { ...(meta[l.pedido] || {}), dataEntrega: l.dataEntrega }; });\n    salvar([...itens, ...novos]);\n    if (Object.keys(meta).length !== Object.keys(pedidosMeta).length || JSON.stringify(meta) !== JSON.stringify(pedidosMeta)) salvarMeta(meta);\n    setMostrarImportacaoPdf(false); setPdfLinhas([]);\n  };',
  },
  {
    nome: "botaoImportarPdf",
    from: '<button style={styles.exportBtn} onClick={exportarXLSX} disabled={itens.length === 0}>⬇ Baixar planilha (.xlsx)</button>',
    to: '<label style={{ ...styles.exportBtn, display: "flex", alignItems: "center", justifyContent: "center", cursor: importandoPdf ? "wait" : "pointer" }}><input type="file" accept="application/pdf,.pdf" style={{ display: "none" }} disabled={importandoPdf} onChange={(e) => { abrirImportacaoPdf(e.target.files?.[0]); e.target.value = ""; }} />{importandoPdf ? "Lendo PDF..." : "📥 Importar PDF do Trello"}</label><button style={styles.exportBtn} onClick={exportarXLSX} disabled={itens.length === 0}>⬇ Baixar planilha (.xlsx)</button>',
  },
  {
    nome: "modalImportacaoPdf",
    from: '        {confirmarLimpeza && (',
    to: '        {mostrarImportacaoPdf && (\n          <div style={styles.modalOverlay} onClick={() => setMostrarImportacaoPdf(false)}>\n            <div style={{ ...styles.modalBox, maxWidth: 980 }} onClick={(e) => e.stopPropagation()}>\n              <h3 style={styles.modalTitle}>Conferir importação do PDF</h3>\n              <p style={styles.modalTexto}>Arquivo: <b>{pdfNome}</b>. Nada foi gravado ainda. Revise pedido, produto, quantidade e a passagem pelo corte. Quando o nome do PDF não bater exatamente com o cadastro, escolha o produto correto ou escreva um novo.</p>\n              <div style={{ overflowX: "auto", maxHeight: "58vh", overflowY: "auto" }}>\n                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12 }}>\n                  <thead><tr><th style={styles.thPdf}>OK</th><th style={styles.thPdf}>Pedido</th><th style={styles.thPdf}>Texto do PDF</th><th style={styles.thPdf}>Produto no NeoCooler</th><th style={styles.thPdf}>Qtd</th><th style={styles.thPdf}>Entrega</th><th style={styles.thPdf}>Corte?</th></tr></thead>\n                  <tbody>{pdfLinhas.map((l) => (\n                    <tr key={l.id} style={{ background: l.confianca === "revisar" ? "#fff3d6" : "transparent" }}>\n                      <td style={styles.tdPdf}><input type="checkbox" checked={l.incluir} onChange={(e) => atualizarLinhaPdf(l.id, "incluir", e.target.checked)} /></td>\n                      <td style={styles.tdPdf}><input style={styles.pdfInput} value={l.pedido} onChange={(e) => atualizarLinhaPdf(l.id, "pedido", e.target.value)} /></td>\n                      <td style={{ ...styles.tdPdf, minWidth: 180 }}>{l.textoOriginal}</td>\n                      <td style={{ ...styles.tdPdf, minWidth: 230 }}><select style={styles.pdfInput} value={l.produto} onChange={(e) => atualizarLinhaPdf(l.id, "produto", e.target.value)}><option value="__MANUAL__">✏️ Produto novo / escrever</option>{[...PRODUTOS].sort((a,b) => a.localeCompare(b,"pt-BR")).map((p) => <option key={p} value={p}>{p}</option>)}</select>{l.produto === "__MANUAL__" && <input style={{ ...styles.pdfInput, marginTop: 4 }} value={l.produtoManual} onChange={(e) => atualizarLinhaPdf(l.id, "produtoManual", e.target.value)} placeholder="Nome correto do produto" />}</td>\n                      <td style={styles.tdPdf}><input style={{ ...styles.pdfInput, width: 70 }} type="number" min={1} value={l.qtd} onChange={(e) => atualizarLinhaPdf(l.id, "qtd", e.target.value)} /></td>\n                      <td style={styles.tdPdf}><input style={{ ...styles.pdfInput, width: 130 }} type="date" value={l.dataEntrega} onChange={(e) => atualizarLinhaPdf(l.id, "dataEntrega", e.target.value)} /></td>\n                      <td style={styles.tdPdf}><select style={{ ...styles.pdfInput, width: 150 }} value={l.passaPeloCorte ? "sim" : "nao"} onChange={(e) => atualizarLinhaPdf(l.id, "passaPeloCorte", e.target.value === "sim")}><option value="sim">Sim</option><option value="nao">Não</option></select></td>\n                    </tr>\n                  ))}</tbody>\n                </table>\n              </div>\n              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}><button style={{ ...styles.modalFechar, flex: 1 }} onClick={confirmarImportacaoPdf} disabled={!pdfLinhas.some((l) => l.incluir)}>✓ Confirmar e importar</button><button style={{ ...styles.modalFechar, background: "transparent", color: "#7a7160", border: "1px solid #ddd3bd", flex: 1 }} onClick={() => setMostrarImportacaoPdf(false)}>Cancelar</button></div>\n            </div>\n          </div>\n        )}\n\n        {confirmarLimpeza && (',
  },
];

for (const reparo of reparos) {
  if (source.includes(reparo.from)) {
    source = source.replace(reparo.from, reparo.to);
    alterado = true;
    console.log(`NeoCooler: ${reparo.nome} aplicado.`);
  }
}

if (alterado) fs.writeFileSync(path, source, "utf8");
else console.log("NeoCooler: nenhum reparo pendente; continuando build.");
