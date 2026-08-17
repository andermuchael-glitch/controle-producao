import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
let alterado = false;

const substituir = (nome, from, to) => {
  if (source.includes(from)) {
    source = source.replace(from, to);
    alterado = true;
    console.log(`NeoCooler: ${nome} aplicado.`);
    return true;
  }
  return false;
};

// O ajuste-lancamento-direto já criou destinoLancamento; acrescentamos o histórico.
substituir(
  "estadoRetroativoCostura",
  '  const [destinoLancamento, setDestinoLancamento] = useState("pre_corte");\n  const [qtd, setQtd] = useState(1);',
  '  const [destinoLancamento, setDestinoLancamento] = useState("pre_corte");\n  const [dataSublimacaoRetroativa, setDataSublimacaoRetroativa] = useState(hoje());\n  const [sublimadorRetroativo, setSublimadorRetroativo] = useState(SUBLIMADORES[0]);\n  const [qtd, setQtd] = useState(1);'
);

// Substitui o lançamento inteiro para registrar data e sublimador no lançamento retroativo.
const inicio = source.indexOf('  const adicionarItem = () => {');
const fim = source.indexOf('\n  // ---- Chave comum', inicio);
if (inicio !== -1 && fim !== -1) {
  const novo = `  const adicionarItem = () => {
    if (!pedido.trim()) return;
    const produtoFinal = produto === "__MANUAL__" ? produtoManual.trim() : produto;
    if (!produtoFinal) {
      setErro("Digite o nome do produto novo antes de adicionar.");
      return;
    }
    const qtdFinal = Math.max(1, Number(qtd) || 1);
    const etapaFinal = destinoLancamento === "aguardando_costura"
      ? "aguardando_costura"
      : destinoLancamento === "aguardando_sublimacao"
        ? "aguardando_sublimacao"
        : "pre_corte";
    const novo = {
      id: uid(), pedido: pedido.trim(), produto: produtoFinal, qtd: qtdFinal,
      passaPeloCorte: etapaFinal === "pre_corte", etapa: etapaFinal, criadoEm: Date.now(),
      ...(etapaFinal === "aguardando_costura" ? {
        sublimador: sublimadorRetroativo, dataSublimacao: dataSublimacaoRetroativa || hoje(),
        retroativo: true, equipe: "Não decidido", feito: false, conferido: false,
      } : {}),
    };
    salvar([...itens, novo]);
    if (dataEntregaForm) definirDataEntrega(pedido.trim(), dataEntregaForm);
    setQtd(1); setProdutoManual(""); setProduto(PRODUTOS[0]);
    setPassaPeloCorte(true); setDestinoLancamento("pre_corte");
    setDataSublimacaoRetroativa(hoje()); setSublimadorRetroativo(SUBLIMADORES[0]);
  };
`;
  source = source.slice(0, inicio) + novo + source.slice(fim);
  alterado = true;
  console.log("NeoCooler: lançamento retroativo aplicado.");
}

// Campo de destino já instalado pelo ajuste-lancamento-direto.
const campoDestinoAtual = `            <Field label="Destino do pedido">\n              <select style={styles.input} value={destinoLancamento} onChange={(e) => {\n                const valor = e.target.value;\n                setDestinoLancamento(valor);\n                setPassaPeloCorte(valor === "pre_corte");\n              }}>\n                <option value="pre_corte">🔵 Pré-Corte — fluxo normal</option>\n                <option value="aguardando_sublimacao">🟡 Aguardando Sublimação — não passa pelo corte</option>\n                <option value="aguardando_costura">🟢 Aguardando Costura — já pronto para distribuir as cores</option>\n              </select>\n            </Field>`;
const campoDestinoNovo = `            <Field label="Destino do pedido">\n              <select style={styles.input} value={destinoLancamento} onChange={(e) => {\n                const valor = e.target.value;\n                setDestinoLancamento(valor);\n                setPassaPeloCorte(valor === "pre_corte");\n              }}>\n                <option value="pre_corte">🔵 Pré-Corte — fluxo normal</option>\n                <option value="aguardando_sublimacao">🟡 Aguardando Sublimação — não passa pelo corte</option>\n                <option value="aguardando_costura">🟢 Aguardando Costura — já sublimado, preparar cores</option>\n              </select>\n            </Field>\n            {destinoLancamento === "aguardando_costura" && (\n              <>\n                <Field label="Data em que foi sublimado">\n                  <input style={styles.input} type="date" value={dataSublimacaoRetroativa} onChange={(e) => setDataSublimacaoRetroativa(e.target.value)} />\n                </Field>\n                <Field label="Quem sublimou">\n                  <select style={styles.input} value={sublimadorRetroativo} onChange={(e) => setSublimadorRetroativo(e.target.value)}>\n                    {SUBLIMADORES.map((s) => <option key={s} value={s}>{s}</option>)}\n                  </select>\n                </Field>\n              </>\n            )}`;
substituir("campoHistoricoSublimacao", campoDestinoAtual, campoDestinoNovo);

substituir(
  "avisoHistoricoSublimacao",
  '<p style={styles.aviso}>Produtos novos podem ser escritos manualmente. Escolha o destino: pedidos já prontos podem entrar diretamente em <b>Aguardando Costura</b>, onde você distribui as cores e prepara os lotes para envio à costura.</p>',
  '<p style={styles.aviso}>Produtos novos podem ser escritos manualmente. Pedidos já sublimados podem entrar diretamente em <b>Aguardando Costura</b>. Nesse caso informe a data da sublimação e quem sublimou; depois distribua as cores e prepare os lotes para a costura.</p>'
);

// Migração defensiva para registros antigos.
substituir(
  "migracaoHistoricoSublimacao",
  '            equipe: i.equipe || "Não decidido",\n            feito: i.feito ?? false,',
  '            equipe: i.equipe || "Não decidido",\n            sublimador: i.sublimador || "",\n            dataSublimacao: i.dataSublimacao || "",\n            retroativo: i.retroativo ?? false,\n            feito: i.feito ?? false,'
);

if (alterado) fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: suporte a lançamentos retroativos em Aguardando Costura concluído.");
