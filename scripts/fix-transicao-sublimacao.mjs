import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const antigo = /  const enviarParaSublimacao = \(pedidoNum, produtoNome\) => \{[\s\S]*?\n  \};\n\n  const moverParaAguardandoCostura/;

const novo = `  const enviarParaSublimacao = (pedidoNum, produtoNome) => {
    const f = getAlocForm(pedidoNum, produtoNome);
    const disponivel = itens
      .filter((i) => i.etapa === "aguardando_sublimacao" && i.pedido === pedidoNum && i.produto === produtoNome)
      .reduce((s, i) => s + Number(i.qtd || 0), 0);

    if (disponivel <= 0) return;

    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, disponivel));
    let restante = qtdNum;
    const novosItens = [];

    for (const item of itens) {
      if (item.etapa !== "aguardando_sublimacao" || item.pedido !== pedidoNum || item.produto !== produtoNome || restante <= 0) {
        novosItens.push(item);
        continue;
      }

      const qtdItem = Number(item.qtd || 0);
      const consumir = Math.min(qtdItem, restante);
      const sobra = qtdItem - consumir;
      if (sobra > 0) novosItens.push({ ...item, qtd: sobra });
      restante -= consumir;
    }

    novosItens.push({
      id: uid(),
      pedido: pedidoNum,
      produto: produtoNome,
      cor: f.cor,
      qtd: qtdNum,
      etapa: "sublimacao",
      sublimador: f.sublimador,
      dataSublimacao: f.data || hoje(),
      equipe: "Não decidido",
      feito: false,
      conferido: false,
      criadoEm: Date.now(),
    });

    salvar(novosItens);
    setAlocForm((f2) => ({
      ...f2,
      [chaveAloc(pedidoNum, produtoNome)]: {
        cor: CORES[0].nome,
        qtd: 1,
        sublimador: f.sublimador,
        data: f.data,
      },
    }));
  };

  const moverParaAguardandoCostura`;

if (antigo.test(source)) {
  source = source.replace(antigo, novo);
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: transição aguardando sublimação → sublimação corrigida.");
} else {
  console.log("NeoCooler: função de transição não encontrada; nenhuma alteração aplicada.");
}
