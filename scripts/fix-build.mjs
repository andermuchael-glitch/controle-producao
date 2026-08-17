import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
let alterado = false;

function aplicar(nome, from, to) {
  if (source.includes(from)) {
    source = source.replace(from, to);
    alterado = true;
    console.log("NeoCooler: " + nome + " aplicado.");
  }
}

// Correções estruturais.
aplicar(
  "alocGrid",
  `alocGrid: { display: "grid", g
  };`,
  `alocGrid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr 0.8fr auto", gap: 8 },
};`
);

aplicar(
  "limparTudo",
  `setConfirmarLimpeza(false);const exportarXLSX = () => {`,
  `setConfirmarLimpeza(false);
  };

  const exportarXLSX = () => {`
);

// Produto manual + ordem alfabética + escolha de corte.
aplicar(
  "estadoProdutoManual",
  `const [produto, setProduto] = useState(PRODUTOS[0]);
  const [qtd, setQtd] = useState(1);`,
  `const [produto, setProduto] = useState(PRODUTOS[0]);
  const [produtoManual, setProdutoManual] = useState("");
  const [passaPeloCorte, setPassaPeloCorte] = useState(true);
  const [qtd, setQtd] = useState(1);`
);

aplicar(
  "adicionarProdutoManual",
  `  const adicionarItem = () => {
    if (!pedido.trim()) return;
    const novo = {
      id: uid(),
      pedido: pedido.trim(),
      produto,
      qtd: Math.max(1, Number(qtd) || 1),
      etapa: "pre_corte",
      criadoEm: Date.now(),
    };`,
  `  const adicionarItem = () => {
    if (!pedido.trim()) return;
    const produtoFinal = produto === "__MANUAL__" ? produtoManual.trim() : produto;
    if (!produtoFinal) {
      setErro("Digite o nome do produto novo antes de adicionar.");
      return;
    }
    const novo = {
      id: uid(),
      pedido: pedido.trim(),
      produto: produtoFinal,
      qtd: Math.max(1, Number(qtd) || 1),
      passaPeloCorte,
      etapa: passaPeloCorte ? "pre_corte" : "aguardando_sublimacao",
      criadoEm: Date.now(),
    };`
);

aplicar(
  "limparFormularioProdutoManual",
  `    if (dataEntregaForm) definirDataEntrega(pedido.trim(), dataEntregaForm);
    setQtd(1);`,
  `    if (dataEntregaForm) definirDataEntrega(pedido.trim(), dataEntregaForm);
    setQtd(1);
    setProdutoManual("");
    setProduto(PRODUTOS[0]);
    setPassaPeloCorte(true);`
);

aplicar(
  "campoProdutoManual",
  `            <Field label="Produto">
              <select style={styles.input} value={produto} onChange={(e) => setProduto(e.target.value)}>
                {PRODUTOS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Qtd do pedido">`,
  `            <Field label="Produto">
              <select style={styles.input} value={produto} onChange={(e) => setProduto(e.target.value)}>
                <option value="__MANUAL__">✏️ Escrever manualmente</option>
                {[...PRODUTOS].sort((a, b) => a.localeCompare(b, "pt-BR")).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {produto === "__MANUAL__" && (
                <input style={{ ...styles.input, marginTop: 6 }} value={produtoManual} onChange={(e) => setProdutoManual(e.target.value)} placeholder="Nome do produto novo" autoComplete="off" />
              )}
            </Field>
            <Field label="Passa pelo corte?">
              <select style={styles.input} value={passaPeloCorte ? "sim" : "nao"} onChange={(e) => setPassaPeloCorte(e.target.value === "sim")}>
                <option value="sim">Sim — entra no Pré-Corte</option>
                <option value="nao">Não — vai direto para Aguardando Sublimação</option>
              </select>
            </Field>
            <Field label="Qtd do pedido">`
);

aplicar(
  "tituloLancamento",
  `<h2 style={styles.formTitle}>Lançar item manualmente (entra no pré-corte)</h2>`,
  `<h2 style={styles.formTitle}>Lançar item manualmente</h2>`
);

aplicar(
  "botaoLancamento",
  `<button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim()}>Adicionar ao pré-corte</button>`,
  `<button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim() || (produto === "__MANUAL__" && !produtoManual.trim())}>{passaPeloCorte ? "Adicionar ao pré-corte" : "Adicionar sem passar pelo corte"}</button>`
);

aplicar(
  "avisoLancamento",
  `<p style={styles.aviso}>Assim que o Patrick cortar, marque a quantidade e o dia na aba Pré-Corte.</p>`,
  `<p style={styles.aviso}>Produtos novos podem ser escritos manualmente. Selecione se o item passa pelo corte; quando não passar, ele entra diretamente em Aguardando Sublimação.</p>`
);

// Estado usado pelo importador PDF. O parser completo é instalado pelo patch-pdf-import.mjs.
aplicar(
  "estadoImportacaoPdf",
  `  const [pdfGerando, setPdfGerando] = useState(false);`,
  `  const [pdfGerando, setPdfGerando] = useState(false);
  const [importandoPdf, setImportandoPdf] = useState(false);
  const [pdfNome, setPdfNome] = useState("");
  const [pdfLinhas, setPdfLinhas] = useState([]);
  const [mostrarImportacaoPdf, setMostrarImportacaoPdf] = useState(false);

  const normalizarTextoPdf = (v) => String(v || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const sugerirProdutoPdf = () => "__MANUAL__";
  const abrirImportacaoPdf = async () => {};
  const atualizarLinhaPdf = (id, campo, valor) => setPdfLinhas((ls) => ls.map((l) => l.id === id ? { ...l, [campo]: valor } : l));
  const confirmarImportacaoPdf = () => {
    const novos = pdfLinhas.filter((l) => l.incluir).map((l) => ({
      id: uid(),
      pedido: String(l.pedido || "").trim(),
      produto: l.produto === "__MANUAL__" ? String(l.produtoManual || l.textoOriginal || "").trim() : l.produto,
      qtd: Math.max(1, Number(l.qtd) || 1),
      passaPeloCorte: l.passaPeloCorte !== false,
      etapa: l.passaPeloCorte !== false ? "pre_corte" : "aguardando_sublimacao",
      criadoEm: Date.now()
    })).filter((l) => l.pedido && l.produto);
    salvar([...itens, ...novos]);
    setMostrarImportacaoPdf(false);
    setPdfLinhas([]);
  };`
);

// Botão e modal de conferência do PDF.
aplicar(
  "botaoImportarPdf",
  `<button style={styles.exportBtn} onClick={exportarXLSX} disabled={itens.length === 0}>⬇ Baixar planilha (.xlsx)</button>`,
  `<label style={{ ...styles.exportBtn, display: "flex", alignItems: "center", justifyContent: "center", cursor: importandoPdf ? "wait" : "pointer" }}>
    <input type="file" accept="application/pdf,.pdf" style={{ display: "none" }} disabled={importandoPdf} onChange={(e) => { abrirImportacaoPdf(e.target.files?.[0]); e.target.value = ""; }} />
    {importandoPdf ? "Lendo PDF..." : "📥 Importar PDF do Trello"}
  </label>
  <button style={styles.exportBtn} onClick={exportarXLSX} disabled={itens.length === 0}>⬇ Baixar planilha (.xlsx)</button>`
);

aplicar(
  "modalImportacaoPdf",
  `        {confirmarLimpeza && (`,
  `        {mostrarImportacaoPdf && (
          <div style={styles.modalOverlay} onClick={() => setMostrarImportacaoPdf(false)}>
            <div style={{ ...styles.modalBox, maxWidth: 980 }} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>Conferir importação do PDF</h3>
              <p style={styles.modalTexto}>Arquivo: <b>{pdfNome}</b>. Nada foi gravado ainda. Revise pedido, produto, quantidade e a passagem pelo corte.</p>
              <div style={{ overflowX: "auto", maxHeight: "58vh", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12 }}>
                  <thead><tr><th style={styles.thPdf}>OK</th><th style={styles.thPdf}>Pedido</th><th style={styles.thPdf}>Texto do PDF</th><th style={styles.thPdf}>Produto no NeoCooler</th><th style={styles.thPdf}>Qtd</th><th style={styles.thPdf}>Entrega</th><th style={styles.thPdf}>Corte?</th></tr></thead>
                  <tbody>{pdfLinhas.map((l) => (
                    <tr key={l.id}>
                      <td style={styles.tdPdf}><input type="checkbox" checked={l.incluir} onChange={(e) => atualizarLinhaPdf(l.id, "incluir", e.target.checked)} /></td>
                      <td style={styles.tdPdf}><input style={styles.pdfInput} value={l.pedido} onChange={(e) => atualizarLinhaPdf(l.id, "pedido", e.target.value)} /></td>
                      <td style={styles.tdPdf}>{l.textoOriginal}</td>
                      <td style={styles.tdPdf}>
                        <select style={styles.pdfInput} value={l.produto} onChange={(e) => atualizarLinhaPdf(l.id, "produto", e.target.value)}>
                          <option value="__MANUAL__">✏️ Produto novo / escrever</option>
                          {[...PRODUTOS].sort((a,b) => a.localeCompare(b,"pt-BR")).map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        {l.produto === "__MANUAL__" && <input style={{ ...styles.pdfInput, marginTop: 4 }} value={l.produtoManual} onChange={(e) => atualizarLinhaPdf(l.id, "produtoManual", e.target.value)} placeholder="Nome correto do produto" />}
                      </td>
                      <td style={styles.tdPdf}><input style={{ ...styles.pdfInput, width: 70 }} type="number" min={1} value={l.qtd} onChange={(e) => atualizarLinhaPdf(l.id, "qtd", e.target.value)} /></td>
                      <td style={styles.tdPdf}><input style={{ ...styles.pdfInput, width: 130 }} type="date" value={l.dataEntrega} onChange={(e) => atualizarLinhaPdf(l.id, "dataEntrega", e.target.value)} /></td>
                      <td style={styles.tdPdf}><select style={{ ...styles.pdfInput, width: 150 }} value={l.passaPeloCorte ? "sim" : "nao"} onChange={(e) => atualizarLinhaPdf(l.id, "passaPeloCorte", e.target.value === "sim")}><option value="sim">Sim</option><option value="nao">Não</option></select></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button style={{ ...styles.modalFechar, flex: 1 }} onClick={confirmarImportacaoPdf} disabled={!pdfLinhas.some((l) => l.incluir)}>✓ Confirmar e importar</button>
                <button style={{ ...styles.modalFechar, background: "transparent", color: "#7a7160", border: "1px solid #ddd3bd", flex: 1 }} onClick={() => setMostrarImportacaoPdf(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {confirmarLimpeza && (`
);

if (alterado) fs.writeFileSync(path, "utf8");
console.log("NeoCooler: fix-build concluído.");
