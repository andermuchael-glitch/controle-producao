import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// Substitui a transição inteira por uma versão que consome o lote aguardando.
const antigoEnviar = /  const enviarParaSublimacao = \(pedidoNum, produtoNome\) => \{[\s\S]*?\n  \};\n\n  const moverParaAguardandoCostura/;
const novoEnviar = `  const enviarParaSublimacao = (pedidoNum, produtoNome) => {
    const f = getAlocForm(pedidoNum, produtoNome);
    const disponivel = itens
      .filter((i) => i.etapa === "aguardando_sublimacao" && i.pedido === pedidoNum && i.produto === produtoNome)
      .reduce((s, i) => s + Number(i.qtd || 0), 0);

    if (disponivel <= 0) return;

    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, disponivel));
    let restanteParaConsumir = qtdNum;
    const novosItens = [];

    for (const item of itens) {
      if (item.etapa !== "aguardando_sublimacao" || item.pedido !== pedidoNum || item.produto !== produtoNome || restanteParaConsumir <= 0) {
        novosItens.push(item);
        continue;
      }

      const qtdItem = Number(item.qtd || 0);
      const consumir = Math.min(qtdItem, restanteParaConsumir);
      const sobra = qtdItem - consumir;
      if (sobra > 0) novosItens.push({ ...item, qtd: sobra });
      restanteParaConsumir -= consumir;
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

if (!antigoEnviar.test(source)) {
  console.error("NeoCooler: função enviarParaSublimacao não encontrada.");
  process.exit(1);
}
source = source.replace(antigoEnviar, novoEnviar);

// Aguardando deve mostrar sempre o total original já chegado a esta etapa:
// pendente + o que já foi alocado para sublimação/costura/separação.
const inicio = source.indexOf('  // ---------- AGUARDANDO SUBLIMAÇÃO:');
const fim = source.indexOf('  // ---------- SUBLIMAÇÃO: agrupado por dia de lançamento ----------');
if (inicio < 0 || fim <= inicio) {
  console.error("NeoCooler: bloco Aguardando Sublimação não encontrado.");
  process.exit(1);
}

const blocoNovo = `  // ---------- AGUARDANDO SUBLIMAÇÃO: agrupado por pedido, com alocado/restante ----------
  const aguardandoSublimacaoAgrupado = useMemo(() => {
    const pendentes = {};
    for (const it of itens) {
      if (it.etapa !== "aguardando_sublimacao") continue;
      if (!pendentes[it.pedido]) pendentes[it.pedido] = {};
      if (!pendentes[it.pedido][it.produto]) pendentes[it.pedido][it.produto] = 0;
      pendentes[it.pedido][it.produto] += Number(it.qtd || 0);
    }

    const alocadoPorChave = {};
    for (const it of itens) {
      if (it.etapa === "pre_corte" || it.etapa === "corte" || it.etapa === "aguardando_sublimacao") continue;
      const chave = chaveAloc(it.pedido, it.produto);
      alocadoPorChave[chave] = (alocadoPorChave[chave] || 0) + Number(it.qtd || 0);
    }

    const pedidos = new Set([
      ...Object.keys(pendentes),
      ...Object.keys(alocadoPorChave).map((chave) => chave.split("||")[0]),
    ]);

    const pedidosArr = Array.from(pedidos).map((numero) => {
      const produtos = new Set([
        ...Object.keys(pendentes[numero] || {}),
        ...Object.keys(alocadoPorChave)
          .filter((chave) => chave.startsWith(`${numero}||`))
          .map((chave) => chave.slice(`${numero}||`.length)),
      ]);

      const linhas = Array.from(produtos).map((prod) => {
        const restante = Number(pendentes[numero]?.[prod] || 0);
        const alocado = Number(alocadoPorChave[chaveAloc(numero, prod)] || 0);
        return { produto: prod, total: restante + alocado, alocado, restante };
      }).filter((l) => l.total > 0);

      const totalGeral = linhas.reduce((s, l) => s + l.total, 0);
      const alocadoGeral = linhas.reduce((s, l) => s + l.alocado, 0);
      return {
        numero,
        linhas: linhas.sort((a, b) => a.produto.localeCompare(b.produto)),
        totalGeral,
        alocadoGeral,
        dataEntrega: pedidosMeta[numero]?.dataEntrega || "",
      };
    }).filter((p) => p.linhas.some((l) => l.restante > 0));

    pedidosArr.sort((a, b) => {
      const da = diasAteEntrega(a.dataEntrega);
      const db = diasAteEntrega(b.dataEntrega);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
    return pedidosArr.filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase()));
  }, [itens, pedidosMeta, filtroPedido]);

`;
source = source.slice(0, inicio) + blocoNovo + source.slice(fim);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: alocação Aguardando Sublimação → Sublimação corrigida.");
