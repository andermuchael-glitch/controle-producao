import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("// EDITAR_PRE_CORTE_V1")) process.exit(0);

source = source.replace(
  'const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");',
  'const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte" && !pedidosMeta[numero]?.excluidoPreCorte);'
);

source = source.replace(
  '    salvar([...itens, novo]);\n    if (dataEntregaForm) definirDataEntrega(numero, dataEntregaForm);',
  '    const eraExcluido = !!pedidosMeta[numero]?.excluidoPreCorte;\n    const itensBase = eraExcluido ? itens.filter((i) => !(i.pedido === numero && i.etapa === "pre_corte")) : itens;\n    const metaAtualizada = { ...pedidosMeta, [numero]: { ...(pedidosMeta[numero] || {}), excluidoPreCorte: false } };\n    salvar([...itensBase, novo]);\n    if (dataEntregaForm) salvarMeta({ ...metaAtualizada, [numero]: { ...metaAtualizada[numero], dataEntrega: dataEntregaForm } });\n    else if (eraExcluido) salvarMeta(metaAtualizada);'
);

const anchor = '  const removerItem = (id) => {\n';
const editFn = `  // EDITAR_PRE_CORTE_V1\n  const editarItemPreCorte = async (pedidoAtual, produtoAtual) => {\n    const encontrados = itens.filter((i) => i.pedido === pedidoAtual && i.produto === produtoAtual && i.etapa === "pre_corte");\n    if (!encontrados.length) return;\n    const item = encontrados[0];\n    const novoPedido = (window.prompt("Número do pedido:", pedidoAtual) || "").trim();\n    if (!novoPedido) return;\n    const novoProduto = window.prompt("Produto:", produtoAtual);\n    if (!novoProduto || !PRODUTOS.includes(novoProduto)) {\n      setErro("Produto inválido. Escolha exatamente um produto cadastrado.");\n      return;\n    }\n    const novaQtdTexto = window.prompt("Quantidade:", String(item.qtd));\n    if (novaQtdTexto === null) return;\n    const novaQtd = Number(novaQtdTexto);\n    if (!Number.isFinite(novaQtd) || novaQtd < 1) {\n      setErro("A quantidade deve ser maior que zero.");\n      return;\n    }\n    const dataAtual = pedidosMeta[pedidoAtual]?.dataEntrega || "";\n    const novaData = window.prompt("Data de entrega (AAAA-MM-DD):", dataAtual);\n    if (novaData === null) return;\n\n    const conflito = itens.some((i) => i.id !== item.id && i.pedido === novoPedido && i.produto === novoProduto && i.etapa === "pre_corte" && !pedidosMeta[novoPedido]?.excluidoPreCorte);\n    if (conflito) {\n      setErro("Esse pedido já possui esse produto no Pré-Corte. Para evitar duplicação, edite o lançamento existente.");\n      return;\n    }\n\n    const novaLista = itens.map((i) => i.id === item.id ? { ...i, pedido: novoPedido, produto: novoProduto, qtd: novaQtd, alteradoEm: Date.now() } : i);\n    salvar(novaLista);\n\n    const novoMeta = { ...pedidosMeta };\n    if (pedidoAtual !== novoPedido) {\n      if (novoMeta[pedidoAtual]?.dataEntrega) {\n        const dataAntiga = novoMeta[pedidoAtual].dataEntrega;\n        novoMeta[pedidoAtual] = { ...novoMeta[pedidoAtual] };\n        delete novoMeta[pedidoAtual].dataEntrega;\n        if (!novoMeta[pedidoAtual].excluidoPreCorte) delete novoMeta[pedidoAtual];\n        novoMeta[novoPedido] = { ...(novoMeta[novoPedido] || {}), dataEntrega: novaData || dataAntiga, excluidoPreCorte: false };\n      } else {\n        novoMeta[novoPedido] = { ...(novoMeta[novoPedido] || {}), dataEntrega: novaData, excluidoPreCorte: false };\n      }\n    } else {\n      novoMeta[novoPedido] = { ...(novoMeta[novoPedido] || {}), dataEntrega: novaData, excluidoPreCorte: false };\n    }\n    await salvarMeta(novoMeta);\n    setErro("");\n  };\n\n`;
if (!source.includes(anchor)) throw new Error("NeoCooler: âncora de edição não encontrada.");
source = source.replace(anchor, editFn + anchor);

const buttonAnchor = '<span style={styles.equipePill}>{concluidoLinha ? "totalmente cortado" : `restam ${linha.restante}un`}</span>';
const buttonReplacement = `${buttonAnchor}\n                            {!concluidoLinha && <button style={styles.editarPedidoBtn} onClick={() => editarItemPreCorte(p.numero, linha.produto)}>Editar</button>}`;
if (!source.includes(buttonAnchor)) throw new Error("NeoCooler: âncora do botão Editar não encontrada.");
source = source.replace(buttonAnchor, buttonReplacement);

const styleAnchor = '  limparBtn: {';
if (!source.includes(styleAnchor)) throw new Error("NeoCooler: âncora de estilos não encontrada.");
source = source.replace(styleAnchor, '  editarPedidoBtn: { border: "1px solid #6b6255", color: "#4f483d", background: "#fff", borderRadius: 8, padding: "6px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginLeft: 6 },\n' + styleAnchor);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: edição e relançamento de pedidos do Pré-Corte aplicados.");
