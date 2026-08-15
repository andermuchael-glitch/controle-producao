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
    nome: "produtosEmOrdemAlfabetica",
    from: 'const PRODUTOS = ["LATA 350ML","LATA 473ML","LATA PALITO 269ML","LATA PALITO 350ML","LONG NECK","GFA 600ML","GFA 1000ML","PORTA COPOS","COOLER TÉRMICO PEQUENO","COOLER TÉRMICO GRANDE","PORTA ÁGUA/ISOTÔNICO","PORTA SQUEEZE","600ML DE MESA","BARMAT GRANDE","BARMAT PADRÃO","COOLER TÉRMICO LATERAL","PORTA VINHO SIMPLES","PORTA VINHO DUPLO","PORTA VINHO DUPLO COM BOLSA","ESPUMANTES","ESTEIRA DE PRAIA","MATEIRA MEDIA","MATEIRA GRANDE","MINI BAG PEQUENA TRANSVERSAL","CASE TABLET","CASE NOTEBOOK","MOUSEPAD PADRÃO","MOUSEPAD GAMER","POCHETE","PORTA ÓCULOS","VISEIRA","MUNHEQUEIRA","TAPA OLHOS","CASE CELULAR","TAG MALA","LUVA COM APARADOR","CORRENTE ÓCULOS","NECESSAIRE GRANDE","MÁSCARA","PROTETOR FACIAL","MOCHILA TRANSVERSAL","BOLSA DE OMBRO","BOLSA MEIA LUA","MINI BAG","CARTEIRA FEMININA","LIXEIRA","MOEDEIRO","NECESSAIRE","LANCHEIRA","ESTOJO","MOCHILA TÉRMICA","MOCHILA INFANTIL","LATA CAMISA","LONG NECK CAMISA","PORTA UTILIDADES","WINE BAG","WINE CASE DELUXE","MARMITEIRA","CANGA DE PRAIA","SUPORTE DE COPO","TOLHA DE BANHO","TOALHA C/ CAPUZ G","TOALHA C/ CAPUZ M","BOLSA TOALHA","CANGA DE PRAIA GRANDE","CAPA P/ MALA GRANDE","CAPA P/ MALA MÉDIA","CAPA P/ MALA PEQUENA","MOCHILA IMPERMEÁVEL","VISEIRA TURBANTE"];',
    to: 'const PRODUTOS = ["600ML DE MESA","BARMAT GRANDE","BARMAT PADRÃO","BOLSA DE OMBRO","BOLSA MEIA LUA","BOLSA TOALHA","CANGA DE PRAIA","CANGA DE PRAIA GRANDE","CAPA P/ MALA GRANDE","CAPA P/ MALA MÉDIA","CAPA P/ MALA PEQUENA","CARTEIRA FEMININA","CASE CELULAR","CASE NOTEBOOK","CASE TABLET","COOLER TÉRMICO GRANDE","COOLER TÉRMICO LATERAL","COOLER TÉRMICO PEQUENO","CORRENTE ÓCULOS","ESPUMANTES","ESTEIRA DE PRAIA","ESTOJO","GFA 1000ML","GFA 600ML","LANCHEIRA","LATA 350ML","LATA 473ML","LATA CAMISA","LATA PALITO 269ML","LATA PALITO 350ML","LIXEIRA","LONG NECK","LONG NECK CAMISA","LUVA COM APARADOR","MARMITEIRA","MATEIRA GRANDE","MATEIRA MEDIA","MINI BAG","MINI BAG PEQUENA TRANSVERSAL","MOCHILA IMPERMEÁVEL","MOCHILA INFANTIL","MOCHILA TRANSVERSAL","MOCHILA TÉRMICA","MOEDEIRO","MOUSEPAD GAMER","MOUSEPAD PADRÃO","MUNHEQUEIRA","MÁSCARA","NECESSAIRE","NECESSAIRE GRANDE","POCHETE","PORTA COPOS","PORTA SQUEEZE","PORTA UTILIDADES","PORTA VINHO DUPLO","PORTA VINHO DUPLO COM BOLSA","PORTA VINHO SIMPLES","PORTA ÁGUA/ISOTÔNICO","PORTA ÓCULOS","PROTETOR FACIAL","SUPORTE DE COPO","TAG MALA","TAPA OLHOS","TOALHA C/ CAPUZ G","TOALHA C/ CAPUZ M","TOLHA DE BANHO","VISEIRA","VISEIRA TURBANTE","WINE BAG","WINE CASE DELUXE"];',
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
    to: '            <Field label="Produto">\n              <select style={styles.input} value={produto} onChange={(e) => setProduto(e.target.value)}>\n                <option value="__MANUAL__">✏️ Escrever manualmente</option>\n                {PRODUTOS.map((p) => (\n                  <option key={p} value={p}>{p}</option>\n                ))}\n              </select>\n              {produto === "__MANUAL__" && (\n                <input\n                  style={{ ...styles.input, marginTop: 6 }}\n                  value={produtoManual}\n                  onChange={(e) => setProdutoManual(e.target.value)}\n                  placeholder="Nome do produto novo"\n                  autoComplete="off"\n                />\n              )}\n            </Field>\n            <Field label="Passa pelo corte?">\n              <select style={styles.input} value={passaPeloCorte ? "sim" : "nao"} onChange={(e) => setPassaPeloCorte(e.target.value === "sim")}>\n                <option value="sim">Sim — entra no Pré-Corte</option>\n                <option value="nao">Não — vai direto para Aguardando Sublimação</option>\n              </select>\n            </Field>\n            <Field label="Qtd do pedido">',
  },
  {
    nome: "tituloLancamento",
    from: '<h2 style={styles.formTitle}>Lançar item manualmente (entra no pré-corte)</h2>',
    to: '<h2 style={styles.formTitle}>Lançar item manualmente</h2>',
  },
  {
    nome: "botaoLancamento",
    from: '<button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim()}>Adicionar ao pré-corte</button>',
    to: '<button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim() || (produto === "__MANUAL__" && !produtoManual.trim())}>\n            {passaPeloCorte ? "Adicionar ao pré-corte" : "Adicionar sem passar pelo corte"}\n          </button>',
  },
  {
    nome: "avisoLancamento",
    from: '<p style={styles.aviso}>Assim que o Patrick cortar, marque a quantidade e o dia na aba Pré-Corte.</p>',
    to: '<p style={styles.aviso}>Produtos novos podem ser escritos manualmente. Selecione se o item passa pelo corte; quando não passar, ele entra diretamente em Aguardando Sublimação.</p>',
  },
];

for (const reparo of reparos) {
  if (source.includes(reparo.from)) {
    source = source.replace(reparo.from, reparo.to);
    alterado = true;
    console.log(`NeoCooler: ${reparo.nome} aplicado.`);
  }
}

if (alterado) {
  fs.writeFileSync(path, source, "utf8");
} else {
  console.log("NeoCooler: nenhum reparo pendente; continuando build.");
}
