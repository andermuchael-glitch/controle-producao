import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const marker = "// FIX_CORTE_VISIBLE_V1";
if (source.includes(marker)) {
  console.log("NeoCooler: correção da aba Corte já aplicada.");
  process.exit(0);
}

const anchor1 = '        {loaded && aba === "sublimacao" && (';
const anchor2 = '        )}{loaded && aba === "sublimacao" && (';
const anchor = source.includes(anchor1) ? anchor1 : (source.includes(anchor2) ? anchor2 : null);
if (!anchor) {
  throw new Error("NeoCooler: âncora da aba Sublimação não encontrada para inserir a aba Corte.");
}

const bloco = `        {loaded && aba === "corte" && (\n          <section style={styles.listWrap} className="corte-etapa-list">\n            <div style={styles.painelProducao}>\n              <h3 style={styles.painelTitulo}>Produção do corte</h3>\n              <div style={styles.producaoGrid} className="producao-grid">\n                <div style={styles.producaoColHead}>Cortador</div>\n                <div style={styles.producaoColHead}>Hoje</div>\n                <div style={styles.producaoColHead}>{nomeMes(mesRef(hoje()))}</div>\n                {CORTADORES.map((c) => (\n                  <FragmentoProducao key={c} nome={c} hoje={producaoPorCortador[c]?.hoje || 0} mes={producaoPorCortador[c]?.mes || 0} />\n                ))}\n              </div>\n            </div>\n\n            <p style={styles.aviso}>Itens ficam aqui até serem movidos manualmente — o corte nem sempre segue a mesma ordem da sublimação.</p>\n\n            {corteAgrupado.length === 0 ? (\n              <p style={styles.vazio}>Nenhum item no Corte no momento.</p>\n            ) : (\n              corteAgrupado.map((p) => (\n                <div key={p.numero} style={styles.pedidoCard} className="card pedido-card pedido-aberto corte-etapa-card">\n                  <div style={styles.pedidoTop}>\n                    <div style={styles.pedidoNumWrap}>\n                      <span style={styles.pedidoNum}>#{p.numero}</span>\n                      {p.dataEntrega && (\n                        <span style={{ ...styles.badgeUrgencia, background: urgenciaInfo(p.dataEntrega).fundo, color: urgenciaInfo(p.dataEntrega).cor }}>\n                          {formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}\n                        </span>\n                      )}\n                    </div>\n                    <span style={styles.pctText}>{p.totalGeral}un cortadas</span>\n                  </div>\n                  <div style={styles.itensLista}>\n                    {p.linhas.map((linha) => (\n                      <div key={linha.produto} style={styles.itemLinha} className="item-linha">\n                        <span style={styles.itemTexto}><b>{linha.produto}</b> · {linha.total}un</span>\n                        <span style={styles.equipePill}>{p.cortador}</span>\n                        <button style={styles.removerBtn} onClick={() => removerItem(itens.find((i) => i.pedido === p.numero && i.produto === linha.produto && i.etapa === "corte")?.id)} disabled={!itens.some((i) => i.pedido === p.numero && i.produto === linha.produto && i.etapa === "corte")}>×</button>\n                      </div>\n                    ))}\n                  </div>\n                </div>\n              ))\n            )}\n          </section>\n        )}\n\n`;

source = source.replace(anchor, bloco + anchor);

const cssAnchor = "        @media (prefers-reduced-motion: reduce)";
if (!source.includes(cssAnchor)) throw new Error("NeoCooler: âncora CSS não encontrada.");

const css = `        /* FIX_CORTE_VISIBLE_V1: a aba Corte nunca fica com barras vazias. */\n        .corte-etapa-list .corte-etapa-card,\n        .corte-etapa-list .corte-etapa-card.pedido-aberto {\n          display: block !important;\n          visibility: visible !important;\n          opacity: 1 !important;\n          overflow: visible !important;\n          height: auto !important;\n          max-height: none !important;\n        }\n        .corte-etapa-list .corte-etapa-card > .pedidoTop,\n        .corte-etapa-list .corte-etapa-card > .itensLista,\n        .corte-etapa-list .corte-etapa-card .item-linha {\n          display: flex !important;\n          visibility: visible !important;\n          opacity: 1 !important;\n        }\n        .corte-etapa-list .corte-etapa-card .pedidoTop::after {\n          display: none !important;\n        }\n\n`;
source = source.replace(cssAnchor, css + cssAnchor);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: aba Corte reconstruída e cartões mantidos visíveis.");
