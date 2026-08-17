import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("// EXCLUSAO_REINCLUSAO_PRE_CORTE_V2")) process.exit(0);

const inicio = source.indexOf("  const excluirPedidoPreCorte = async (numero) => {");
const fim = source.indexOf("  const removerItem = (id) => {", inicio);
if (inicio === -1 || fim === -1) throw new Error("NeoCooler: função de exclusão do Pré-Corte não encontrada.");

const novaFuncao = `  // EXCLUSAO_REINCLUSAO_PRE_CORTE_V2\n  const excluirPedidoPreCorte = async (numero) => {\n    const confirmar = window.confirm(\`Excluir o pedido #\${numero} do Pré-Corte?\\n\\nOs itens que ainda estão no Pré-Corte serão removidos do lançamento. A exclusão ficará registrada no histórico.\`);\n    if (!confirmar) return;\n\n    const user = auth?.currentUser;\n    const itensRemovidos = itens.filter((i) => i.pedido === numero && i.etapa === "pre_corte");\n    const novaLista = itens.filter((i) => !(i.pedido === numero && i.etapa === "pre_corte"));\n    const novoMeta = {\n      ...pedidosMeta,\n      [numero]: { ...(pedidosMeta[numero] || {}), excluidoPreCorte: true, excluidoPreCorteEm: Date.now() },\n    };\n\n    await salvar(novaLista);\n    await salvarMeta(novoMeta);\n\n    if (user) {\n      await registrarAuditoria({\n        usuarioEmail: user.email || "desconhecido",\n        usuarioNome: user.displayName || user.email || "desconhecido",\n        acao: "exclusão de pedido do pré-corte",\n        pedido: numero,\n        detalhes: \`Pedido removido do Pré-Corte: \${itensRemovidos.length} lançamento(s). Itens que já estavam em outras etapas foram preservados.\`,\n      });\n    }\n  };\n\n`;

source = source.slice(0, inicio) + novaFuncao + source.slice(fim);
fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: exclusão do Pré-Corte agora remove os lançamentos e permite reinclusão limpa.");
