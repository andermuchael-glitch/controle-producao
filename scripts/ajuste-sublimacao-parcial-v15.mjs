import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

// 1) Estado para escolher quantas unidades de cada lote sublimado seguem para costura.
const stateAnchor = '  const [corteForm, setCorteForm] = useState({}); // { "pedido||produto": {qtd, data} }';
const stateReplacement = stateAnchor + '\n  // quantidade parcial da sublimação que será enviada para costura, por item\n  const [costuraForm, setCosturaForm] = useState({});';
if (source.includes(stateAnchor) && !source.includes('const [costuraForm, setCosturaForm]')) {
  source = source.replace(stateAnchor, stateReplacement);
}

// 2) Substitui o movimento integral por um movimento parcial, consumindo somente a quantidade escolhida.
const oldMove = `  const moverParaAguardandoCostura = (id) => {
    salvar(itens.map((i) => (i.id === id ? { ...i, etapa: "aguardando_costura" } : i)));
  };`;
const newMove = `  const getCosturaQtd = (it) => Math.min(Number(costuraForm[it.id]?.qtd) || Number(it.qtd) || 1, Number(it.qtd) || 1);
  const setCosturaQtd = (id, valor) => setCosturaForm((f) => ({ ...f, [id]: { ...(f[id] || {}), qtd: valor } }));

  const moverParaAguardandoCostura = (id) => {
    const item = itens.find((i) => i.id === id && i.etapa === "sublimacao");
    if (!item) return;
    const total = Number(item.qtd) || 0;
    const qtdEnviar = Math.max(1, Math.min(Number(costuraForm[id]?.qtd) || total, total));
    if (qtdEnviar >= total) {
      salvar(itens.map((i) => (i.id === id ? { ...i, etapa: "aguardando_costura" } : i)));
    } else {
      const novo = {
        ...item,
        id: uid(),
        qtd: qtdEnviar,
        etapa: "aguardando_costura",
        criadoEm: Date.now(),
      };
      salvar(itens.flatMap((i) => i.id === id ? [{ ...i, qtd: total - qtdEnviar }, novo] : [i]));
    }
    setCosturaForm((f) => ({ ...f, [id]: { qtd: 1 } }));
  };`;
if (source.includes(oldMove)) source = source.replace(oldMove, newMove);

// 3) Na aba Sublimação, mostrar quantidade disponível + campo de quantidade a enviar.
const oldRender = `                    <div key={it.id} style={styles.itemLinha} className="item-linha">
                      <button style={styles.enviarBtn} onClick={() => moverParaAguardandoCostura(it.id)}>Enviar p/ costura</button>
                      <span style={{ ...styles.swatchSm, background: corHex(it.cor) }} />
                      <span style={styles.itemTexto}>#{it.pedido} · {it.produto} <b>· {it.cor}</b> · {it.qtd}un</span>
                      <span style={styles.sublimadorPill}>{it.sublimador}</span>
                      <button style={styles.removerBtn} onClick={() => removerItem(it.id)}>×</button>
                    </div>`;
const newRender = `                    <div key={it.id} style={styles.itemLinha} className="item-linha">
                      <span style={{ ...styles.swatchSm, background: corHex(it.cor) }} />
                      <span style={styles.itemTexto}>#{it.pedido} · {it.produto} <b>· {it.cor}</b> · {it.qtd}un</span>
                      <span style={styles.sublimadorPill}>{it.sublimador}</span>
                      <input
                        style={{ ...styles.input, width: 82, minWidth: 82, padding: "7px 8px" }}
                        type="number"
                        min={1}
                        max={it.qtd}
                        value={costuraForm[it.id]?.qtd ?? it.qtd}
                        onChange={(e) => setCosturaQtd(it.id, e.target.value)}
                        title="Quantidade que vai para aguardando costura"
                      />
                      <button style={styles.enviarBtn} onClick={() => moverParaAguardandoCostura(it.id)}>
                        Enviar p/ costura
                      </button>
                      <button style={styles.removerBtn} onClick={() => removerItem(it.id)}>×</button>
                    </div>`;
if (source.includes(oldRender)) source = source.replace(oldRender, newRender);

// 4) Texto explicativo da aba.
source = source.replace(
  '<h3 style={styles.painelTitulo}>Produção por sublimador</h3>',
  '<h3 style={styles.painelTitulo}>Produção por sublimador</h3>'
);

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("V15 aplicado: Sublimação agora envia quantidade parcial para Aguardando Costura, sem prender o lote inteiro.");
} else {
  log("V15: nenhuma alteração necessária.");
}
