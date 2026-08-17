import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// Move the exact quantity from Aguardando Sublimação to Sublimação.
// If only part is sent, the remainder stays waiting; this prevents duplicate quantities.
const inicioSub = source.indexOf('  const enviarParaSublimacao = (pedidoNum, produtoNome) => {');
const fimSub = source.indexOf('  };', inicioSub);
if (inicioSub !== -1 && fimSub !== -1) {
  const novo = `  const enviarParaSublimacao = (pedidoNum, produtoNome) => {
    const f = getAlocForm(pedidoNum, produtoNome);
    const origem = itens.find((i) => i.etapa === "aguardando_sublimacao" && i.pedido === pedidoNum && i.produto === produtoNome);
    if (!origem) return;
    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, origem.qtd));
    const novo = {
      id: uid(), pedido: pedidoNum, produto: produtoNome, qtd: qtdNum,
      etapa: "sublimacao", sublimador: f.sublimador, dataSublimacao: f.data || hoje(),
      equipe: "Não decidido", feito: false, conferido: false, criadoEm: Date.now(),
    };
    const restantes = origem.qtd - qtdNum;
    const base = itens.filter((i) => i.id !== origem.id);
    salvar(restantes > 0 ? [...base, { ...origem, qtd: restantes }, novo] : [...base, novo]);
    setAlocForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restantes > 0 ? restantes : 1, sublimador: f.sublimador, data: f.data } }));
  }`;
  source = source.slice(0, inicioSub) + novo + source.slice(fimSub + 4);
}

// When leaving Sublimation, remove any old color assignment. Colors are defined only in Aguardando Costura.
const oldMove = `  const moverParaAguardandoCostura = (id) => {\n    salvar(itens.map((i) => (i.id === id ? { ...i, etapa: "aguardando_costura" } : i)));\n  };`;
const newMove = `  const moverParaAguardandoCostura = (id) => {
    salvar(itens.map((i) => {
      if (i.id !== id) return i;
      const { cor, ...semCor } = i;
      return { ...semCor, etapa: "aguardando_costura" };
    }));
  };`;
source = source.replace(oldMove, newMove);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: fluxo de quantidade entre sublimação e costura protegido; cores definidas somente em Aguardando Costura.");
