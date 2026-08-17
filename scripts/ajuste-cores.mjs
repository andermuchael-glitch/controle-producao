import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

source = source.replace(
  '  const [alocForm, setAlocForm] = useState({}); // { "pedido||produto": {cor, qtd, sublimador, data} }',
  '  const [alocForm, setAlocForm] = useState({}); // { "pedido||produto": {qtd, sublimador, data} }\n  const [corForm, setCorForm] = useState({}); // { itemId: {cor, qtd, equipe} }'
);

// Replace the sublimation allocation logic so it never assigns a color.
const inicioAloc = source.indexOf('  // ---- Alocação: aguardando sublimação (sem cor) -> sublimação (com cor) ----');
const fimAloc = source.indexOf('  const moverParaAguardandoCostura =', inicioAloc);
if (inicioAloc !== -1 && fimAloc !== -1) {
  const bloco = `  // ---- Aguardando Sublimação -> Sublimação (sem cor) ----
  const getAlocForm = (p, prod) => alocForm[chaveAloc(p, prod)] || { qtd: 1, sublimador: SUBLIMADORES[0], data: hoje() };
  const setAlocFormCampo = (p, prod, campo, valor) => {
    const chave = chaveAloc(p, prod);
    setAlocForm((f) => ({ ...f, [chave]: { ...getAlocForm(p, prod), [campo]: valor } }));
  };

  const enviarParaSublimacao = (pedidoNum, produtoNome) => {
    const f = getAlocForm(pedidoNum, produtoNome);
    const qtdNum = Math.max(1, Number(f.qtd) || 1);
    const novo = {
      id: uid(), pedido: pedidoNum, produto: produtoNome, qtd: qtdNum,
      etapa: "sublimacao", sublimador: f.sublimador, dataSublimacao: f.data || hoje(),
      equipe: "Não decidido", feito: false, conferido: false, criadoEm: Date.now(),
    };
    salvar([...itens, novo]);
    setAlocForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: 1, sublimador: f.sublimador, data: f.data } }));
  };

`;
  source = source.slice(0, inicioAloc) + bloco + source.slice(fimAloc);
}

// Add color distribution only in Aguardando Costura.
const markerMoveCostura = '  const moverParaCostura = (id) => {';
const posMoveCostura = source.indexOf(markerMoveCostura);
if (posMoveCostura !== -1 && !source.includes('const distribuirCorParaAguardandoCostura')) {
  const blocoCor = `  // ---- Aguardando Costura: dividir o total sublimado em cores ----
  const getCorForm = (id) => corForm[id] || { cor: CORES[0].nome, qtd: 1, equipe: "Não decidido" };
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
    setCorForm((f2) => ({ ...f2, [id]: { cor: f.cor, qtd: restantes > 0 ? restantes : 1, equipe: f.equipe } }));
  };

`;
  source = source.slice(0, posMoveCostura) + blocoCor + source.slice(posMoveCostura);
}

source = source.replace(
  '            <p style={styles.aviso}>\n              Aqui você define a cor e a quantidade de cada lote antes de enviar para o sublimador — pode dividir\n              o total de um modelo em quantas cores forem necessárias.\n            </p>',
  '            <p style={styles.aviso}>\n              Aqui você envia a quantidade total para a sublimação. <b>As cores serão distribuídas somente em Aguardando Costura.</b>\n            </p>'
);

// Remove color selector from Aguardando Sublimação.
const oldGrid = `                            <div style={styles.alocGrid} className="aloc-grid">\n                              <div style={styles.corSelectWrap}>\n                                <span style={{ ...styles.swatch, background: corHex(f.cor), borderColor: corClara(corHex(f.cor)) ? "#0002" : "transparent" }} />\n                                <select style={{ ...styles.input, paddingLeft: 34 }} value={f.cor} onChange={(e) => setAlocFormCampo(p.numero, linha.produto, "cor", e.target.value)}>\n                                  {CORES.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}\n                                </select>\n                              </div>\n                              <input\n                                style={styles.input}\n                                type="number"\n                                min={1}\n                                max={linha.restante}\n                                value={f.qtd}\n                                onChange={(e) => setAlocFormCampo(p.numero, linha.produto, "qtd", e.target.value)}\n                              />\n                              <select style={styles.input} value={f.sublimador} onChange={(e) => setAlocFormCampo(p.numero, linha.produto, "sublimador", e.target.value)}>\n                                {SUBLIMADORES.map((s) => <option key={s} value={s}>{s}</option>)}\n                              </select>\n                              <input\n                                style={styles.input}\n                                type="date"\n                                value={f.data}\n                                onChange={(e) => setAlocFormCampo(p.numero, linha.produto, "data", e.target.value)}\n                              />\n                              <button style={styles.enviarBtn} onClick={() => enviarParaSublimacao(p.numero, linha.produto)}>\n                                Enviar p/ sublimação\n                              </button>\n                            </div>`;
const newGrid = `                            <div style={{ ...styles.alocGrid, gridTemplateColumns: "0.8fr 1fr 0.9fr auto" }} className="aloc-grid">\n                              <input style={styles.input} type="number" min={1} max={linha.restante} value={f.qtd} onChange={(e) => setAlocFormCampo(p.numero, linha.produto, "qtd", e.target.value)} aria-label="Quantidade para sublimação" />\n                              <select style={styles.input} value={f.sublimador} onChange={(e) => setAlocFormCampo(p.numero, linha.produto, "sublimador", e.target.value)}>\n                                {SUBLIMADORES.map((s) => <option key={s} value={s}>{s}</option>)}\n                              </select>\n                              <input style={styles.input} type="date" value={f.data} onChange={(e) => setAlocFormCampo(p.numero, linha.produto, "data", e.target.value)} />\n                              <button style={styles.enviarBtn} onClick={() => enviarParaSublimacao(p.numero, linha.produto)}>Enviar p/ sublimação</button>\n                            </div>`;
source = source.replace(oldGrid, newGrid);

source = source.replace(
  `                      <span style={{ ...styles.swatchSm, background: corHex(it.cor) }} />\n                      <span style={styles.itemTexto}>#{it.pedido} · {it.produto} <b>· {it.cor}</b> · {it.qtd}un</span>`,
  `                      <span style={styles.itemTexto}>#{it.pedido} · {it.produto} · {it.qtd}un</span>`
);

// Replace the whole Aguardando Costura section.
const inicio = source.indexOf('        {loaded && aba === "aguardando_costura" && (');
const fim = source.indexOf('        {loaded && aba === "costura" && (', inicio);
if (inicio !== -1 && fim !== -1) {
  const novo = `        {loaded && aba === "aguardando_costura" && (\n          <section style={styles.listWrap}>\n            <p style={styles.aviso}>\n              <b>É aqui que você distribui as cores.</b> O total que saiu da sublimação permanece igual ao total cortado.\n              Ex.: 30 necessaires → 10 pretas + 6 azuis + 4 rosas + 5 vermelhas + 5 verdes.\n            </p>\n            {aguardandoCosturaAgrupado.length === 0 ? (\n              <p style={styles.vazio}>Nada aguardando costura no momento.</p>\n            ) : (\n              aguardandoCosturaAgrupado.map((p) => (\n                <div key={p.numero} style={styles.pedidoCard} className="card pedido-card">\n                  <div style={styles.pedidoTop}>\n                    <div style={styles.pedidoNumWrap}>\n                      <span style={styles.pedidoNum}>#{p.numero}</span>\n                      {p.dataEntrega && (\n                        <span style={{ ...styles.badgeUrgencia, background: urgenciaInfo(p.dataEntrega).fundo, color: urgenciaInfo(p.dataEntrega).cor }}>\n                          {formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}\n                        </span>\n                      )}\n                    </div>\n                    <span style={styles.pctText}>{p.total}un aguardando costura</span>\n                  </div>\n                  <div style={styles.itensLista}>\n                    {p.itens.map((it) => {\n                      const f = getCorForm(it.id);\n                      return (\n                        <div key={it.id} style={styles.corteLinha}>\n                          <div style={styles.corteLinhaTopo}>\n                            <span style={styles.itemTexto}><b>{it.produto}</b> · {it.qtd}un {it.cor ? `· ${it.cor}` : "· sem cor definida"}</span>\n                            <span style={styles.equipePill}>{it.cor ? "cor definida" : `restam ${it.qtd}un para distribuir`}</span>\n                          </div>\n                          {!it.cor && (\n                            <div style={{ ...styles.alocGrid, gridTemplateColumns: "1.2fr 0.7fr 1fr auto" }} className="aloc-grid">\n                              <div style={styles.corSelectWrap}>\n                                <span style={{ ...styles.swatch, background: corHex(f.cor), borderColor: corClara(corHex(f.cor)) ? "#0002" : "transparent" }} />\n                                <select style={{ ...styles.input, paddingLeft: 34 }} value={f.cor} onChange={(e) => setCorFormCampo(it.id, "cor", e.target.value)}>\n                                  {CORES.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}\n                                </select>\n                              </div>\n                              <input style={styles.input} type="number" min={1} max={it.qtd} value={f.qtd} onChange={(e) => setCorFormCampo(it.id, "qtd", e.target.value)} aria-label="Quantidade desta cor" />\n                              <select style={styles.input} value={f.equipe} onChange={(e) => setCorFormCampo(it.id, "equipe", e.target.value)}>\n                                {EQUIPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}\n                              </select>\n                              <button style={styles.enviarBtn} onClick={() => distribuirCorParaAguardandoCostura(it.id)}>Adicionar cor</button>\n                            </div>\n                          )}\n                          {it.cor && (\n                            <div style={styles.itemLinha}>\n                              <span style={{ ...styles.swatchSm, background: corHex(it.cor) }} />\n                              <span style={styles.itemTexto}>Lote: <b>{it.cor}</b> · {it.qtd}un</span>\n                              <span style={styles.equipePill}>{it.equipe || "Não decidido"}</span>\n                              <button style={styles.enviarBtn} onClick={() => moverParaCostura(it.id)}>Enviar p/ costura</button>\n                              <button style={styles.removerBtn} onClick={() => removerItem(it.id)}>×</button>\n                            </div>\n                          )}\n                        </div>\n                      );\n                    })}\n                  </div>\n                </div>\n              ))\n            )}\n          </section>\n        )}\n\n`;
  source = source.slice(0, inicio) + novo + source.slice(fim);
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: cores movidas para Aguardando Costura; Sublimação trabalha com quantidade total sem cor.");
