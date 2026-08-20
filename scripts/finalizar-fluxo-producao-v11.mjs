import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

const especiais = [
  "TOALHA PERSONALIZADO 70X40",
  "TOALHA 80X30",
  "TOALHA C/ CAPUZ G",
  "TOALHA C/ CAPUZ M",
];

// 1) A etapa Corte deixa de existir no fluxo visual.
source = source.replace(
  /const ETAPAS = \[[^\]]*\];/s,
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];'
);
source = source.replace(/\n\s*corte:\s*"Corte",?/g, "\n");

// 2) Dados antigos que ainda estiverem em Corte são corrigidos uma única vez
// ao carregar. Produtos especiais seguem para Aguardando Costura; os demais
// retornam ao Pré-Corte, conforme a regra solicitada.
const normalizador = `

// FLUXO_SEM_CORTE_V11
const PRODUTOS_COSTURA_ANTES_SUBLIMACAO_V11 = ${JSON.stringify(especiais)};
const precisaCosturaAntesSublimacaoV11 = (nome) =>
  PRODUTOS_COSTURA_ANTES_SUBLIMACAO_V11.includes(String(nome || "").trim().toUpperCase());

const normalizarDadosV11 = (lista) => {
  const entrada = Array.isArray(lista) ? lista : [];
  const vistosExatos = new Set();
  const saida = [];
  let alterou = false;

  for (const bruto of entrada) {
    const item = {
      ...bruto,
      qtd: Number(bruto.qtd) || 0,
      equipe: bruto.equipe || "Não decidido",
      feito: bruto.feito ?? false,
      conferido: bruto.conferido ?? false,
    };
    if (item.qtd <= 0) { alterou = true; continue; }

    const nome = String(item.produto || "").trim().toUpperCase();
    if (item.etapa === "corte") {
      item.etapa = precisaCosturaAntesSublimacaoV11(nome) ? "aguardando_costura" : "pre_corte";
      alterou = true;
    }

    // Remove somente duplicações realmente idênticas. Lotes diferentes,
    // cores diferentes ou quantidades diferentes continuam preservados.
    const chave = [
      String(item.pedido), nome, item.etapa, item.qtd,
      item.cor || "", item.sublimador || "", item.cortador || "",
      item.equipe || "", item.dataCorte || "", item.dataSublimacao || "",
      item.dataEntrega || ""
    ].join("||");
    if (vistosExatos.has(chave)) { alterou = true; continue; }
    vistosExatos.add(chave);
    saida.push(item);
  }
  return { lista: saida, alterou };
};
`;
if (!source.includes("FLUXO_SEM_CORTE_V11")) {
  const anchor = 'const AUDIT_ADMIN_EMAIL = "andermuchael@gmail.com";';
  if (source.includes(anchor)) source = source.replace(anchor, anchor + normalizador);
}

// 3) Usa o normalizador no carregamento do Firebase/localStorage e persiste
// a correção, para que o 11089 e os demais registros não voltem para Corte.
const cargaAntiga = /const carregados = JSON\.parse\(raw\);\s*const migrados = carregados\.map\(\(i\) => \(\{[\s\S]*?\}\)\);\s*setItens\(migrados\);/;
if (cargaAntiga.test(source)) {
  source = source.replace(cargaAntiga, `const carregados = JSON.parse(raw);
          const normalizadoV11 = normalizarDadosV11(carregados);
          setItens(normalizadoV11.lista);
          if (normalizadoV11.alterou) salvarValor(STORAGE_KEY, JSON.stringify(normalizadoV11.lista)).catch(() => {});`);
} else if (!source.includes("normalizadoV11.lista")) {
  // Fallback para qualquer versão do carregador que tenha mudado.
  source = source.replace(
    /const carregados = JSON\.parse\(raw\);[\s\S]*?setItens\([^;]+\);/,
    `const carregados = JSON.parse(raw);
          const normalizadoV11 = normalizarDadosV11(carregados);
          setItens(normalizadoV11.lista);
          if (normalizadoV11.alterou) salvarValor(STORAGE_KEY, JSON.stringify(normalizadoV11.lista)).catch(() => {});`
  );
}

// 4) Remove o bloco visual inteiro da aba Corte.
const corteVisualStart = source.indexOf('        {loaded && aba === "corte" && (');
const aguardandoVisualStart = source.indexOf('        {loaded && aba === "aguardando_sublimacao" && (', corteVisualStart + 1);
if (corteVisualStart >= 0 && aguardandoVisualStart > corteVisualStart) {
  source = source.slice(0, corteVisualStart) + source.slice(aguardandoVisualStart);
}

// 5) Remove Corte dos cartões superiores, das abas e dos textos antigos.
source = source.replace(/\n\s*<Stat label="corte" value=\{totalCorte\} \/>/g, "");
source = source.replace(/\n\s*\{ id: "corte", label: "Corte", contagem: totalCorte \},/g, "");
source = source.replace(/\{ id: "corte", label: "Corte", contagem: totalCorte \},\n?/g, "");
source = source.replace(/\n\s*\{ id: "corte", label: "Corte", contagem: totalCorte \},/g, "");
source = source.replace(/\n\s*\{ id: "corte", label: "Corte", contagem: totalCorte \},/g, "");
// ABAS pode estar em formato multilinha diferente; remove qualquer objeto simples com id corte.
source = source.replace(/\s*\{\s*id:\s*"corte"\s*,\s*label:\s*"Corte"\s*,\s*contagem:\s*totalCorte\s*\},?/g, "");
source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");
source = source.replaceAll("o item passa para a aba Corte", "o item passa diretamente para a próxima etapa");
source = source.replaceAll("Mova itens pela aba Corte.", "Os itens passam diretamente para a próxima etapa.");
source = source.replaceAll("formulário inline de marcação de corte (pré-corte -> corte)", "formulário inline de confirmação do corte");
source = source.replaceAll("Pré-Corte -> Corte (marcado conforme Patrick vai cortando)", "Pré-Corte -> próxima etapa (marcado conforme Patrick vai cortando)");

// 6) Painel de duplicações: mostra possíveis duplicações por pedido+produto+etapa
// sem esconder lotes legítimos. Duplicações exatas já são removidas na carga.
if (!source.includes("DUPLICACOES_V11")) {
  const stateAnchor = '  const [mostrarAuditoria, setMostrarAuditoria] = useState(false);';
  if (source.includes(stateAnchor)) {
    source = source.replace(stateAnchor, stateAnchor + '\n  const [mostrarDuplicacoes, setMostrarDuplicacoes] = useState(false);\n  const [detalheSublimador, setDetalheSublimador] = useState(null);');
  }

  const computedAnchor = '  const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte").reduce((s, i) => s + i.qtd, 0);';
  const computedBlock = `

  // DUPLICACOES_V11
  const duplicacoes = useMemo(() => {
    const grupos = {};
    for (const it of itens) {
      const chave = [String(it.pedido), String(it.produto || "").trim().toUpperCase(), String(it.etapa || "")].join("||");
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(it);
    }
    return Object.values(grupos)
      .filter((grupo) => grupo.length > 1)
      .map((grupo) => ({
        pedido: grupo[0].pedido,
        produto: grupo[0].produto,
        etapa: grupo[0].etapa,
        total: grupo.reduce((s, i) => s + (Number(i.qtd) || 0), 0),
        itens: grupo,
        exatas: grupo.filter((i, idx) => grupo.findIndex((j) => JSON.stringify(j) === JSON.stringify(i)) !== idx).length,
      }))
      .sort((a, b) => String(a.pedido).localeCompare(String(b.pedido)));
  }, [itens]);

  const itensDoDetalheSublimador = useMemo(() => {
    if (!detalheSublimador) return [];
    const { nome, periodo } = detalheSublimador;
    const hojeStr = hoje();
    return itens
      .filter((i) => i.sublimador === nome && i.dataSublimacao)
      .filter((i) => periodo === "hoje" ? i.dataSublimacao === hojeStr : mesRef(i.dataSublimacao) === mesRef(hojeStr))
      .sort((a, b) => String(b.dataSublimacao).localeCompare(String(a.dataSublimacao)) || String(a.pedido).localeCompare(String(b.pedido)));
  }, [itens, detalheSublimador]);
`;
  if (source.includes(computedAnchor)) source = source.replace(computedAnchor, computedBlock + "\n" + computedAnchor);

  const exportAnchor = '          <button style={styles.limparBtn} onClick={() => setConfirmarLimpeza(true)} disabled={itens.length === 0}>🗑 Limpar tudo</button>';
  const dupButton = exportAnchor + '\n          <button style={styles.exportBtnOutline} onClick={() => setMostrarDuplicacoes(true)}>🔎 Duplicações ({duplicacoes.length})</button>';
  if (source.includes(exportAnchor)) source = source.replace(exportAnchor, dupButton);

  const modalAnchor = '        {mostrarDrive && (';
  const modais = `        {mostrarDuplicacoes && (
          <div style={styles.modalOverlay} onClick={() => setMostrarDuplicacoes(false)}>
            <div style={{ ...styles.modalBox, maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <h3 style={styles.modalTitle}>Duplicações / possíveis duplicações</h3>
                <button style={styles.modalFechar} onClick={() => setMostrarDuplicacoes(false)}>Fechar</button>
              </div>
              {duplicacoes.length === 0 ? (
                <p style={styles.vazio}>Nenhuma duplicação encontrada.</p>
              ) : (
                <div style={{ maxHeight: 520, overflow: "auto" }}>
                  {duplicacoes.map((d) => (
                    <div key={String(d.pedido) + d.produto + d.etapa} style={{ padding: 12, borderBottom: "1px solid #e4dbc8" }}>
                      <b>Pedido #{d.pedido}</b> · <b>{d.produto}</b><br />
                      <span style={{ fontSize: 12, color: "#6f6658" }}>{ETAPA_LABEL[d.etapa] || d.etapa} · {d.itens.length} registros · {d.total}un</span>
                      {d.itens.map((it) => (
                        <div key={it.id} style={{ marginTop: 6, fontSize: 13 }}>
                          {it.qtd}un{it.cor ? ` · ${it.cor}` : ""}{it.sublimador ? ` · ${it.sublimador}` : ""}{it.dataSublimacao ? ` · ${formatarDataBR(it.dataSublimacao)}` : ""}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {detalheSublimador && (
          <div style={styles.modalOverlay} onClick={() => setDetalheSublimador(null)}>
            <div style={{ ...styles.modalBox, maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <h3 style={styles.modalTitle}>Sublimações de {detalheSublimador.nome}</h3>
                <button style={styles.modalFechar} onClick={() => setDetalheSublimador(null)}>Fechar</button>
              </div>
              <p style={styles.modalTexto}>{detalheSublimador.periodo === "hoje" ? "Hoje" : `Mês atual (${nomeMes(mesRef(hoje()))})`}</p>
              {itensDoDetalheSublimador.length === 0 ? (
                <p style={styles.vazio}>Nenhuma sublimação registrada nesse período.</p>
              ) : (
                <div style={{ maxHeight: 520, overflow: "auto" }}>
                  {itensDoDetalheSublimador.map((it) => (
                    <div key={it.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr auto", gap: 10, padding: "9px 0", borderBottom: "1px solid #e4dbc8", alignItems: "center" }}>
                      <span>{formatarDataBR(it.dataSublimacao)}</span>
                      <span><b>#{it.pedido}</b> · {it.produto}{it.cor ? ` · ${it.cor}` : ""}</span>
                      <b>{it.qtd}un</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

`;
  if (source.includes(modalAnchor)) source = source.replace(modalAnchor, modais + modalAnchor);
}

// 7) Os totais de Hoje e do mês na produção por sublimador tornam-se clicáveis.
const mapAnchor = '<FragmentoProducao key={s} nome={s} hoje={producaoPorSublimador[s]?.hoje || 0} mes={producaoPorSublimador[s]?.mes || 0} />';
const mapReplacement = '<FragmentoProducao key={s} nome={s} hoje={producaoPorSublimador[s]?.hoje || 0} mes={producaoPorSublimador[s]?.mes || 0} onHoje={() => setDetalheSublimador({ nome: s, periodo: "hoje" })} onMes={() => setDetalheSublimador({ nome: s, periodo: "mes" })} />';
source = source.replace(mapAnchor, mapReplacement);

const componentOld = `function FragmentoProducao({ nome, hoje, mes }) {
  return (
    <>
      <div style={styles.producaoNome}>{nome}</div>
      <div style={styles.producaoValor}>{hoje}</div>
      <div style={styles.producaoValor}>{mes}</div>
    </>
  );
}`;
const componentNew = `function FragmentoProducao({ nome, hoje, mes, onHoje, onMes }) {
  const Valor = ({ value, onClick }) => onClick ? (
    <button type="button" onClick={onClick} style={{ ...styles.producaoValor, cursor: "pointer", border: 0, background: "transparent", textDecoration: "underline" }} title="Ver detalhes">
      {value}
    </button>
  ) : <div style={styles.producaoValor}>{value}</div>;
  return (
    <>
      <div style={styles.producaoNome}>{nome}</div>
      <Valor value={hoje} onClick={onHoje} />
      <Valor value={mes} onClick={onMes} />
    </>
  );
}`;
if (source.includes(componentOld)) source = source.replace(componentOld, componentNew);

// 8) Não deixa a aba antiga selecionada se algum estado de sessão tiver "corte".
source = source.replace('  const [aba, setAba] = useState("pre_corte");', '  const [aba, setAba] = useState("pre_corte");');

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("fluxo V11 aplicado: Corte removido, dados migrados, duplicações e detalhe por sublimador adicionados.");
} else {
  log("fluxo V11: nenhuma alteração necessária.");
}
