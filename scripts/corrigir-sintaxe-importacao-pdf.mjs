import fs from "node:fs";

const path = "scripts/ajuste-importacao-divergentes.mjs";
let source = fs.readFileSync(path, "utf8");

if (source.includes("BUILD_SYNTAX_FIX_V1")) process.exit(0);

const inicio = source.indexOf("const addBloco = `");
const fim = source.indexOf("source = source.slice(0, addInicio) + addBloco + source.slice(addFim);");
if (inicio === -1 || fim === -1) throw new Error("NeoCooler: bloco adicionarItem não encontrado para correção.");

const linhas = [
  "  const adicionarItem = () => {",
  "    const numero = pedido.trim();",
  "    if (!numero) return;",
  "    const produtoFinal = produto;",
  "    const passaPeloCorte = produtoFinal !== \"TOALHA ESPORTIVA 80X30\";",
  "    const etapaInicial = passaPeloCorte ? \"pre_corte\" : \"aguardando_sublimacao\";",
  "    const existente = itens.find((i) => i.pedido === numero && i.produto === produtoFinal && i.etapa === etapaInicial);",
  "    if (existente) {",
  "      setErro(passaPeloCorte ? `O pedido #${numero} já possui ${produtoFinal} no pré-corte. Para evitar duplicação, altere a quantidade no lançamento existente.` : `O pedido #${numero} já possui ${produtoFinal} em Aguardando Sublimação.`);",
  "      return;",
  "    }",
  "    const novo = { id: uid(), pedido: numero, produto: produtoFinal, qtd: Math.max(1, Number(qtd) || 1), passaPeloCorte, etapa: etapaInicial, criadoEm: Date.now() };",
  "    salvar([...itens, novo]);",
  "    if (dataEntregaForm) definirDataEntrega(numero, dataEntregaForm);",
  "    setQtd(1);",
  "  };"
];

const novoBloco = "const addBloco = [\n" + linhas.map((l) => `  ${JSON.stringify(l)}`).join(",\n") + "\n].join(\"\\n\");\n// BUILD_SYNTAX_FIX_V1\n";
source = source.slice(0, inicio) + novoBloco + source.slice(fim);
fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: sintaxe do script de importação PDF corrigida antes do build.");
