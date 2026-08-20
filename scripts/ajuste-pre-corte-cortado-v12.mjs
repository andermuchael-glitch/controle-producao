import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

// 1) Remove Corte somente da interface. A etapa "corte" continua existindo
// internamente para preservar/migrar registros históricos e calcular produção.
source = source.replace(/\n\s*\{ id: "corte", label: "Corte", contagem: totalCorte \},?/g, "");
source = source.replace(/\n\s*<Stat label="corte" value=\{totalCorte\} \/>/g, "");

// Remove o bloco visual da antiga aba Corte, preservando as demais abas.
const corteStart = source.indexOf('{loaded && aba === "corte" && (');
const aguardandoStart = source.indexOf('{loaded && aba === "aguardando_sublimacao" && (', corteStart + 1);
if (corteStart >= 0 && aguardandoStart > corteStart) {
  source = source.slice(0, corteStart) + source.slice(aguardandoStart);
}

// 2) Cabeçalho deixa claro o novo fluxo sem a aba Corte.
source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");

// 3) A produção do corte fica visível no próprio Pré-Corte, usando exatamente
// a mesma lógica de Hoje/mês usada para a produção por sublimador.
if (!source.includes("PAINEL_CORTE_PRE_CORTE_V12")) {
  const anchor = '<section style={styles.listWrap}>\n            <p style={styles.aviso}>\n              Pedidos lançados aqui aguardam corte.';
  const painel = `<section style={styles.listWrap}>\n            {/* PAINEL_CORTE_PRE_CORTE_V12 */}\n            <div style={styles.painelProducao}>\n              <h3 style={styles.painelTitulo}>Produção do corte</h3>\n              <div style={styles.producaoGrid} className="producao-grid">\n                <div style={styles.producaoColHead}>Cortador</div>\n                <div style={styles.producaoColHead}>Hoje</div>\n                <div style={styles.producaoColHead}>{nomeMes(mesRef(hoje()))}</div>\n                {CORTADORES.map((c) => (\n                  <FragmentoProducao key={c} nome={c} hoje={producaoPorCortador[c]?.hoje || 0} mes={producaoPorCortador[c]?.mes || 0} />\n                ))}\n              </div>\n            </div>\n            <p style={styles.aviso}>\n              Pedidos lançados aqui aguardam corte.`;
  if (source.includes(anchor)) source = source.replace(anchor, painel);
}

// 4) Garante que o total cortado de cada pedido seja calculado pelos registros
// que realmente representam corte (dataCorte/cortador), e não por qualquer
// etapa posterior. Assim a quantidade não dobra ao avançar para sublimação.
const oldCalc = `    for (const it of itens) {\n      if (it.etapa === "pre_corte") continue;\n      const chave = chaveAloc(it.pedido, it.produto);\n      cortadoPorChave[chave] = (cortadoPorChave[chave] || 0) + it.qtd;\n    }`;
const newCalc = `    for (const it of itens) {\n      if (it.etapa === "pre_corte") continue;\n      if (!it.dataCorte && !it.cortador) continue;\n      const chave = chaveAloc(it.pedido, it.produto);\n      cortadoPorChave[chave] = (cortadoPorChave[chave] || 0) + (Number(it.qtd) || 0);\n    }`;
if (source.includes(oldCalc)) source = source.replace(oldCalc, newCalc);

// 5) Se algum estado antigo tentar abrir Corte, volta imediatamente ao Pré-Corte.
if (!source.includes("PRE_CORTE_SEM_ABA_CORTE_V12")) {
  const abaAnchor = '  const [aba, setAba] = useState("pre_corte");';
  const abaPatch = `${abaAnchor}\n\n  // PRE_CORTE_SEM_ABA_CORTE_V12\n  useEffect(() => {\n    if (aba === "corte") setAba("pre_corte");\n  }, [aba]);`;
  if (source.includes(abaAnchor)) source = source.replace(abaAnchor, abaPatch);
}

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("V12 aplicado: produção do corte incorporada ao Pré-Corte e aba Corte removida do layout.");
} else {
  log("V12: nenhuma alteração necessária.");
}
