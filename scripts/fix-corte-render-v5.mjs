import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const marker = "/* FIX_CORTE_RENDER_V5 */";
if (source.includes(marker)) {
  console.log("NeoCooler: renderização direta da aba Corte V5 já aplicada.");
  process.exit(0);
}

const startAnchor = '        {loaded && aba === "corte" && (';
const endAnchor = '        {loaded && aba === "aguardando_sublimacao" && (';
const start = source.indexOf(startAnchor);
const end = source.indexOf(endAnchor, start);
if (start === -1 || end === -1 || end <= start) {
  throw new Error("NeoCooler: bloco da aba Corte não encontrado para substituição V5.");
}

const replacement = `        {loaded && aba === "corte" && (
          <section style={styles.listWrap} className="corte-etapa-list corte-v5">
            <div style={styles.painelProducao}>
              <h3 style={styles.painelTitulo}>Produção do corte</h3>
              <div style={styles.producaoGrid} className="producao-grid">
                <div style={styles.producaoColHead}>Cortador</div>
                <div style={styles.producaoColHead}>Hoje</div>
                <div style={styles.producaoColHead}>{nomeMes(mesRef(hoje()))}</div>
                {CORTADORES.map((c) => (
                  <FragmentoProducao key={c} nome={c} hoje={producaoPorCortador[c]?.hoje || 0} mes={producaoPorCortador[c]?.mes || 0} />
                ))}
              </div>
            </div>

            <p style={styles.aviso}>
              Itens ficam aqui até serem movidos manualmente — o corte nem sempre segue a mesma ordem da sublimação.
            </p>

            {corteAgrupado.length === 0 ? (
              <p style={styles.vazio}>Nada no corte. Importe um PDF ou lance manualmente acima.</p>
            ) : (
              corteAgrupado.map((p) => (
                <article key={p.numero} className="corte-v5-card" style={{
                  background: "#fffdf8",
                  border: "2px solid #d8cdb9",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                  display: "block",
                  color: "#231f1a",
                  fontFamily: "Arial, sans-serif",
                  opacity: 1,
                  visibility: "visible"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 18, color: "#231f1a" }}>#{p.numero}</strong>
                      {p.cortador && <span style={{ background: "#e6dcc8", color: "#5c4a12", borderRadius: 20, padding: "4px 9px", fontSize: 11, fontWeight: 700 }}>{p.cortador}</span>}
                      {p.dataEntrega && <span style={{ background: urgenciaInfo(p.dataEntrega).fundo, color: urgenciaInfo(p.dataEntrega).cor, borderRadius: 20, padding: "4px 9px", fontSize: 11, fontWeight: 700 }}>{formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}</span>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#5c5343" }}>{p.totalGeral}un cortadas</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(p.linhas || p.itens || []).map((linha) => (
                      <div key={linha.produto || linha.id} style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        borderTop: "1px solid #eee5d2",
                        paddingTop: 9,
                        color: "#231f1a"
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#231f1a", flex: 1, minWidth: 180 }}>
                          {linha.produto} · {linha.total ?? linha.qtd}un
                        </span>
                        <button
                          type="button"
                          style={{ background: "#1f8a3d", color: "#fff", border: "none", borderRadius: 7, padding: "8px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                          onClick={() => moverParaAguardandoSublimacao(p.numero, linha.produto)}
                        >
                          Mover p/ aguardando sublimação
                        </button>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </section>
        )}

`;

source = source.slice(0, start) + replacement + source.slice(end);

const cssAnchor = "        @media (prefers-reduced-motion: reduce)";
if (!source.includes(cssAnchor)) {
  throw new Error("NeoCooler: âncora CSS não encontrada para V5.");
}

const css = `        /* FIX_CORTE_RENDER_V5 */
        .corte-v5,
        .corte-v5-card,
        .corte-v5-card * {
          visibility: visible !important;
          opacity: 1 !important;
          animation: none !important;
          transform: none !important;
          -webkit-text-fill-color: initial !important;
        }
        .corte-v5-card {
          display: block !important;
          min-height: 100px !important;
        }
        .corte-v5-card button {
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

`;
source = source.replace(cssAnchor, css + cssAnchor);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: V5 aplicada; bloco da aba Corte substituído por renderização direta e visível.");
