import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
if (source.includes("// FIX_UI_AGUARDANDO_SUBLIMACAO_V2")) process.exit(0);

const inicio = source.indexOf("  // ---------- AGUARDANDO SUBLIMAÇÃO: agrupado por pedido, sem cor, com alocado/restante ----------");
const fim = source.indexOf("\n  // ---------- SUBLIMAÇÃO: agrupado por dia de lançamento ----------", inicio);
if (inicio === -1 || fim === -1) throw new Error("NeoCooler: bloco de Aguardando Sublimação não encontrado.");

const novo = `  // FIX_UI_AGUARDANDO_SUBLIMACAO_V2
  // Nesta etapa, "restante" é exatamente o que ainda existe em Aguardando Sublimação.
  // Não usamos registros de etapas posteriores para bloquear o botão, pois registros antigos
  // podem ter sido criados antes da correção da movimentação.
  const aguardandoSublimacaoAgrupado = useMemo(() => {
    const grupos = {};
    for (const it of itens) {
      if (it.etapa !== "aguardando_sublimacao") continue;
      if (!grupos[it.pedido]) grupos[it.pedido] = {};
      if (!grupos[it.pedido][it.produto]) grupos[it.pedido][it.produto] = 0;
      grupos[it.pedido][it.produto] += Number(it.qtd) || 0;
    }

    const sublimadoPorChave = {};
    for (const it of itens) {
      if (it.etapa !== "sublimacao") continue;
      const chave = chaveAloc(it.pedido, it.produto);
      sublimadoPorChave[chave] = (sublimadoPorChave[chave] || 0) + (Number(it.qtd) || 0);
    }

    const pedidosArr = Object.entries(grupos).map(([numero, produtos]) => {
      const linhas = Object.entries(produtos).map(([prod, aguardando]) => {
        const alocado = sublimadoPorChave[chaveAloc(numero, prod)] || 0;
        return {
          produto: prod,
          total: aguardando + alocado,
          alocado,
          restante: aguardando,
        };
      });
      const totalGeral = linhas.reduce((s, l) => s + l.total, 0);
      const alocadoGeral = linhas.reduce((s, l) => s + l.alocado, 0);
      return {
        numero,
        linhas: linhas.sort((a, b) => a.produto.localeCompare(b.produto)),
        totalGeral,
        alocadoGeral,
        dataEntrega: pedidosMeta[numero]?.dataEntrega || "",
      };
    });

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

source = source.slice(0, inicio) + novo + source.slice(fim);

// Ajusta o texto da linha para deixar explícito que a quantidade disponível é a que está aguardando.
source = source.replace(
  '<span style={styles.itemTexto}><b>{linha.produto}</b> · cortado: {linha.total}un</span>',
  '<span style={styles.itemTexto}><b>{linha.produto}</b> · aguardando: {linha.restante}un</span>'
);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: UI de Aguardando Sublimação agora usa a quantidade real pendente e não bloqueia registros antigos.");
