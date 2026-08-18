import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// Garantia final: esta etapa roda por último, depois de todos os patches de build.
// A área de distribuição de cores não usa a classe pedido-card, portanto nunca é
// escondida pelo recurso de compactação dos pedidos.

if (!source.includes('const [corForm, setCorForm] = useState({});')) {
  const anchor = '  const [alocForm, setAlocForm] = useState({});';
  if (source.includes(anchor)) {
    source = source.replace(anchor, `${anchor}\n  const [corForm, setCorForm] = useState({});`);
  }
}

if (!source.includes('const distribuirCorParaAguardandoCostura')) {
  const anchor = '  const moverParaCostura = (id) => {';
  const bloco = `  const getCorForm = (id) => corForm[id] || { cor: CORES[0].nome, qtd: 1, equipe: "Não decidido" };
  const setCorFormCampo = (id, campo, valor) => {
    setCorForm((f) => ({ ...f, [id]: { ...getCorForm(id), [campo]: valor } }));
  };
  const distribuirCorParaAguardandoCostura = (id) => {
    const origem = itens.find((i) => i.id === id && i.etapa === "aguardando_costura");
    if (!origem) return;
    const f = getCorForm(id);
    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, origem.qtd));
    const novaCor = { ...origem, id: uid(), qtd: qtdNum, cor: f.cor, equipe: f.equipe || "Não decidido", criadoEm: Date.now() };
    const restantes = origem.qtd - qtdNum;
    const base = itens.filter((i) => i.id !== id);
    salvar(restantes > 0 ? [...base, { ...origem, qtd: restantes }, novaCor] : [...base, novaCor]);
    setCorForm((f2) => ({ ...f2, [id]: { cor: f.cor, qtd: restantes > 0 ? restantes : 1, equipe: f.equipe || "Não decidido" } }));
  };

`;
  if (source.includes(anchor)) source = source.replace(anchor, bloco + anchor);
}

const inicio = source.indexOf('        {loaded && aba === "aguardando_costura" && (');
const fim = source.indexOf('        {loaded && aba === "costura" && (', inicio);
if (inicio !== -1 && fim !== -1) {
  const novo = `        {loaded && aba === "aguardando_costura" && (
          <section style={styles.listWrap}>
            <div style={{ background: "#fffdf8", border: "2px solid #1c2a3a", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 800, color: "#1c2a3a", marginBottom: 5 }}>
                DISTRIBUIÇÃO DE CORES — AGUARDANDO COSTURA
              </div>
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "#5c5343", lineHeight: 1.45 }}>
                Aqui você divide o total sublimado entre as cores. Os campos abaixo ficam sempre visíveis.
              </div>
            </div>
            {aguardandoCosturaAgrupado.length === 0 ? (
              <p style={styles.vazio}>Nada aguardando costura no momento.</p>
            ) : (
              aguardandoCosturaAgrupado.map((p) => (
                <div key={p.numero} style={{ ...styles.pedidoCard, padding: 14 }} className="card costura-distribuicao-card">
                  <div style={styles.pedidoTop}>
                    <div style={styles.pedidoNumWrap}>
                      <span style={styles.pedidoNum}>#{p.numero}</span>
                      {p.dataEntrega && (
                        <span style={{ ...styles.badgeUrgencia, background: urgenciaInfo(p.dataEntrega).fundo, color: urgenciaInfo(p.dataEntrega).cor }}>
                          {formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}
                        </span>
                      )}
                    </div>
                    <span style={styles.pctText}>{p.total}un aguardando</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {p.itens.map((it) => {
                      const f = getCorForm(it.id);
                      return (
                        <div key={it.id} style={{ borderTop: "1px solid #e4dbc8", paddingTop: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 9, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#17283a" }}>
                              {it.produto} · {it.qtd}un {it.cor ? `· ${it.cor}` : "· SEM COR"}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: it.cor ? "#1f8a3d" : "#d8622c", background: it.cor ? "#e7f5ea" : "#fff0e7", borderRadius: 20, padding: "4px 9px" }}>
                              {it.cor ? "cor definida" : `faltam ${it.qtd}un`}
                            </span>
                          </div>
                          {!it.cor ? (
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 9, background: "#eef3f7", border: "2px solid #7f909f", borderRadius: 11, padding: 11 }}>
                              <label style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 800, color: "#34495a" }}>
                                COR
                                <select value={f.cor} onChange={(e) => setCorFormCampo(it.id, "cor", e.target.value)} style={{ display: "block", boxSizing: "border-box", width: "100%", minHeight: 52, marginTop: 4, padding: "10px 12px", background: "#ffffff", color: "#17283a", border: "2px solid #566b7d", borderRadius: 9, fontSize: 16, fontWeight: 700 }}>
                                  {CORES.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
                                </select>
                              </label>
                              <label style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 800, color: "#34495a" }}>
                                QUANTIDADE
                                <input type="number" min={1} max={it.qtd} value={f.qtd} onChange={(e) => setCorFormCampo(it.id, "qtd", e.target.value)} style={{ display: "block", boxSizing: "border-box", width: "100%", minHeight: 52, marginTop: 4, padding: "10px 12px", background: "#ffffff", color: "#17283a", border: "2px solid #566b7d", borderRadius: 9, fontSize: 17, fontWeight: 800 }} />
                              </label>
                              <label style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 800, color: "#34495a" }}>
                                EQUIPE DE COSTURA
                                <select value={f.equipe} onChange={(e) => setCorFormCampo(it.id, "equipe", e.target.value)} style={{ display: "block", boxSizing: "border-box", width: "100%", minHeight: 52, marginTop: 4, padding: "10px 12px", background: "#ffffff", color: "#17283a", border: "2px solid #566b7d", borderRadius: 9, fontSize: 16, fontWeight: 700 }}>
                                  {EQUIPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
                                </select>
                              </label>
                              <button style={{ minHeight: 52, width: "100%", background: "#1f8a3d", color: "#fff", border: "none", borderRadius: 9, padding: "10px 14px", fontSize: 16, fontWeight: 800, cursor: "pointer" }} onClick={() => distribuirCorParaAguardandoCostura(it.id)}>
                                + ADICIONAR ESTA COR
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                              <span style={{ width: 18, height: 18, borderRadius: "50%", background: corHex(it.cor), border: "1px solid #0003" }} />
                              <b style={{ fontSize: 13 }}>{it.cor} · {it.qtd}un</b>
                              <span style={styles.equipePill}>{it.equipe || "Não decidido"}</span>
                              <button style={styles.enviarBtn} onClick={() => moverParaCostura(it.id)}>Enviar p/ costura</button>
                              <button style={styles.removerBtn} onClick={() => removerItem(it.id)}>×</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

`;
  source = source.slice(0, inicio) + novo + source.slice(fim);
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: seção Aguardando Costura reconstruída sem compactação e com controles visíveis.");
