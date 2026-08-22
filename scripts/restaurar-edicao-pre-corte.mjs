import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("// EDITAR_PRE_CORTE_RESTAURADO_V2")) process.exit(0);

const anchor = '  const removerItem = (id) => salvar(itens.filter((i) => i.id !== id));\n';
if (!source.includes(anchor)) throw new Error("NeoCooler: âncora de edição do Pré-Corte não encontrada.");

const editFn = `  // EDITAR_PRE_CORTE_RESTAURADO_V2\n  const editarItemPreCorte = async (pedidoAtual, produtoAtual) => {\n    const encontrados = itens.filter((i) => i.pedido === pedidoAtual && i.produto === produtoAtual && i.etapa === "pre_corte");\n    if (!encontrados.length) return;\n    const item = encontrados[0];\n\n    const novoPedido = (window.prompt("Número do pedido:", pedidoAtual) || "").trim();\n    if (!novoPedido) return;\n\n    const novoProduto = window.prompt("Produto (use o nome cadastrado):", produtoAtual);\n    if (!novoProduto || !PRODUTOS.includes(novoProduto)) {\n      setErro("Produto inválido. Escolha exatamente um produto cadastrado.");\n      return;\n    }\n\n    const novaQtdTexto = window.prompt("Quantidade:", String(item.qtd));\n    if (novaQtdTexto === null) return;\n    const novaQtd = Number(novaQtdTexto);\n    if (!Number.isFinite(novaQtd) || novaQtd < 1) {\n      setErro("A quantidade deve ser maior que zero.");\n      return;\n    }\n\n    const dataAtual = pedidosMeta[pedidoAtual]?.dataEntrega || "";\n    const novaData = window.prompt("Data de entrega (AAAA-MM-DD):", dataAtual);\n    if (novaData === null) return;\n\n    const conflito = itens.some((i) =>\n      i.id !== item.id &&\n      i.pedido === novoPedido &&\n      i.produto === novoProduto &&\n      i.etapa === "pre_corte"\n    );\n    if (conflito) {\n      setErro("Esse pedido já possui esse produto no Pré-Corte. Para evitar duplicação, edite o lançamento existente.");\n      return;\n    }\n\n    const alterado = {\n      ...item,\n      pedido: novoPedido,\n      produto: novoProduto,\n      qtd: novaQtd,\n      alteradoEm: Date.now(),\n    };\n    const novaLista = itens.map((i) => i.id === item.id ? alterado : i);\n    await salvar(novaLista);\n\n    const novoMeta = { ...pedidosMeta };\n    const metaDestino = { ...(novoMeta[novoPedido] || {}), excluidoPreCorte: false };\n    if (novaData) metaDestino.dataEntrega = novaData;\n    novoMeta[novoPedido] = metaDestino;\n\n    if (pedidoAtual !== novoPedido && novoMeta[pedidoAtual]) {\n      const antiga = { ...novoMeta[pedidoAtual] };\n      delete antiga.dataEntrega;\n      if (Object.keys(antiga).length) novoMeta[pedidoAtual] = antiga;\n      else delete novoMeta[pedidoAtual];\n    }\n\n    await salvarMeta(novoMeta);\n    setErro("");\n  };\n\n`;
source = source.replace(anchor, editFn + anchor);

const buttonAnchor = '<span style={styles.equipePill}>restam {linha.restante}un</span>';
if (!source.includes(buttonAnchor)) throw new Error("NeoCooler: âncora do botão Editar no Pré-Corte não encontrada.");
const buttonReplacement = `${buttonAnchor}<button type="button" style={styles.editarPedidoBtn} onClick={() => editarItemPreCorte(p.numero, linha.produto)}>Editar</button>`;
source = source.replace(buttonAnchor, buttonReplacement);

const styleAnchor = '  limparBtn: {';
if (!source.includes(styleAnchor)) throw new Error("NeoCooler: âncora dos estilos do Pré-Corte não encontrada.");
source = source.replace(
  styleAnchor,
  '  editarPedidoBtn: { border: "1px solid #6b6255", color: "#4f483d", background: "#fff", borderRadius: 8, padding: "6px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginLeft: 6 },\n' + styleAnchor
);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: edição de pedidos restaurada no Pré-Corte.");
