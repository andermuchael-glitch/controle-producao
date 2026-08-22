import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("// PRODUCAO_SUBLIMADORES_V1")) {
  console.log("NeoCooler: produção por sublimador já instalada.");
  process.exit(0);
}

const anchorData = '  const sublimacaoFiltrada = useMemo(() =>';
if (!source.includes(anchorData)) throw new Error("NeoCooler: âncora sublimacaoFiltrada não encontrada.");

const dataBlock = `  // PRODUCAO_SUBLIMADORES_V1
  const producaoPorSublimador = useMemo(() => {
    const hojeStr = hoje();
    const mesAtual = mesRef(hojeStr);
    const mapa = {};
    for (const s of SUBLIMADORES) mapa[s] = { hoje: 0, mes: 0 };
    for (const it of itens) {
      if (!it.sublimador || !it.dataSublimacao) continue;
      if (!mapa[it.sublimador]) mapa[it.sublimador] = { hoje: 0, mes: 0 };
      const qtd = Number(it.qtd) || 0;
      if (it.dataSublimacao === hojeStr) mapa[it.sublimador].hoje += qtd;
      if (mesRef(it.dataSublimacao) === mesAtual) mapa[it.sublimador].mes += qtd;
    }
    return mapa;
  }, [itens]);
`;
source = source.replace(anchorData, dataBlock + anchorData);

const anchorUi = '{loaded && aba === "sublimacao" && <section style={styles.listWrap}>';
if (!source.includes(anchorUi)) throw new Error("NeoCooler: âncora da aba Sublimação não encontrada.");

const uiBlock = `{loaded && aba === "sublimacao" && <section style={styles.listWrap}>
          <div style={styles.painelProducao}>
            <h3 style={styles.painelTitulo}>Produção por sublimador</h3>
            <div style={styles.producaoGrid} className="producao-grid">
              <div style={styles.producaoColHead}>Sublimador</div>
              <div style={styles.producaoColHead}>Hoje</div>
              <div style={styles.producaoColHead}>{nomeMes(mesRef(hoje()))}</div>
              {SUBLIMADORES.map((s) => (
                <FragmentoProducao key={s} nome={s} hoje={producaoPorSublimador[s]?.hoje || 0} mes={producaoPorSublimador[s]?.mes || 0} />
              ))}
            </div>
          </div>`;
source = source.replace(anchorUi, uiBlock);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: total sublimado por sublimador restaurado (hoje e mês).");
