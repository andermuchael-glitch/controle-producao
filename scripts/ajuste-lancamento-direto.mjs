import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
let alterado = false;

const aplicar = (nome, from, to) => {
  if (!source.includes(from)) return;
  source = source.replace(from, to);
  alterado = true;
  console.log(`NeoCooler: ${nome} aplicado.`);
};

// Estado do destino do lançamento e dos dados retroativos de sublimação.
aplicar(
  "estadoDestinoLancamento",
  '  const [passaPeloCorte, setPassaPeloCorte] = useState(true);\n  const [qtd, setQtd] = useState(1);',
  '  const [passaPeloCorte, setPassaPeloCorte] = useState(true);\n  const [destinoLancamento, setDestinoLancamento] = useState("pre_corte");\n  const [sublimadorLancamento, setSublimadorLancamento] = useState(SUBLIMADORES[0]);\n  const [dataSublimacaoLancamento, setDataSublimacaoLancamento] = useState(hoje());\n  const [qtd, setQtd] = useState(1);'
);

// O item pode começar em qualquer entrada operacional.
aplicar(
  "destinoNoAdicionarItem",
  '      passaPeloCorte,\n      etapa: passaPeloCorte ? "pre_corte" : "aguardando_sublimacao",\n      criadoEm: Date.now(),',
  '      passaPeloCorte: destinoLancamento === "pre_corte",\n      etapa: destinoLancamento,\n      ...(destinoLancamento === "aguardando_costura" ? {\n        sublimador: sublimadorLancamento,\n        dataSublimacao: dataSublimacaoLancamento || hoje(),\n        retroativo: true,\n      } : {}),\n      criadoEm: Date.now(),'
);

// Limpa a escolha para o próximo lançamento.
aplicar(
  "limparDestinoLancamento",
  '    setPassaPeloCorte(true);',
  '    setPassaPeloCorte(true);\n    setDestinoLancamento("pre_corte");\n    setSublimadorLancamento(SUBLIMADORES[0]);\n    setDataSublimacaoLancamento(hoje());'
);

// Substitui a escolha anterior por um destino explícito.
aplicar(
  "campoDestinoLancamento",
  `            <Field label="Passa pelo corte?">\n              <select style={styles.input} value={passaPeloCorte ? "sim" : "nao"} onChange={(e) => setPassaPeloCorte(e.target.value === "sim")}>\n                <option value="sim">Sim — entra no Pré-Corte</option>\n                <option value="nao">Não — vai direto para Aguardando Sublimação</option>\n              </select>\n            </Field>`,
  `            <Field label="Destino do pedido">\n              <select style={styles.input} value={destinoLancamento} onChange={(e) => {\n                const valor = e.target.value;\n                setDestinoLancamento(valor);\n                setPassaPeloCorte(valor === "pre_corte");\n              }}>\n                <option value="pre_corte">🔵 Pré-Corte — fluxo normal</option>\n                <option value="aguardando_sublimacao">🟡 Aguardando Sublimação — não passa pelo corte</option>\n                <option value="aguardando_costura">🟢 Já sublimado — vai para Aguardando Costura</option>\n              </select>\n            </Field>\n            {destinoLancamento === "aguardando_costura" && (\n              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>\n                <Field label="Sublimador">\n                  <select style={styles.input} value={sublimadorLancamento} onChange={(e) => setSublimadorLancamento(e.target.value)}>\n                    {SUBLIMADORES.map((s) => <option key={s} value={s}>{s}</option>)}\n                  </select>\n                </Field>\n                <Field label="Data da sublimação">\n                  <input style={styles.input} type="date" value={dataSublimacaoLancamento} onChange={(e) => setDataSublimacaoLancamento(e.target.value)} />\n                </Field>\n              </div>\n            )}`
);

aplicar(
  "botaoDestinoLancamento",
  '<button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim() || (produto === "__MANUAL__" && !produtoManual.trim())}>{passaPeloCorte ? "Adicionar ao pré-corte" : "Adicionar sem passar pelo corte"}</button>',
  '<button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim() || (produto === "__MANUAL__" && !produtoManual.trim())}>\n            {destinoLancamento === "pre_corte" ? "Adicionar ao pré-corte" : destinoLancamento === "aguardando_sublimacao" ? "Adicionar à aguardando sublimação" : "Adicionar já sublimado à aguardando costura"}\n          </button>'
);

aplicar(
  "avisoDestinoLancamento",
  '<p style={styles.aviso}>Produtos novos podem ser escritos manualmente. Selecione se o item passa pelo corte; quando não passar, ele entra diretamente em Aguardando Sublimação.</p>',
  '<p style={styles.aviso}>Escolha o destino. Em <b>Já sublimado</b>, informe o sublimador e a data da sublimação; o item entra diretamente em <b>Aguardando Costura</b>.</p>'
);

if (!alterado) {
  console.log("NeoCooler: nenhum ajuste novo de lançamento foi necessário.");
} else {
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: lançamento já sublimado com sublimador e data habilitado.");
}
