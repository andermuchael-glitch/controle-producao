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

// 1) Estados para lançamento retroativo direto em Aguardando Costura.
substituir(
  "estadoRetroativoCostura",
  'const [passaPeloCorte, setPassaPeloCorte] = useState(true);\n  const [qtd, setQtd] = useState(1);',
  'const [passaPeloCorte, setPassaPeloCorte] = useState(true);\n  const [destinoLancamento, setDestinoLancamento] = useState("pre_corte");\n  const [dataSublimacaoRetroativa, setDataSublimacaoRetroativa] = useState(hoje());\n  const [sublimadorRetroativo, setSublimadorRetroativo] = useState(SUBLIMADORES[0]);\n  const [qtd, setQtd] = useState(1);'
);

// 2) Substitui a função de lançamento para suportar os três destinos e o histórico de sublimação.
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
      id: uid(),
      pedido: pedido.trim(),
      produto: produtoFinal,
      qtd: qtdFinal,
      passaPeloCorte: etapaFinal === "pre_corte",
      etapa: etapaFinal,
      criadoEm: Date.now(),
      ...(etapaFinal === "aguardando_costura" ? {
        sublimador: sublimadorRetroativo,
        dataSublimacao: dataSublimacaoRetroativa || hoje(),
        retroativo: true,
        equipe: "Não decidido",
        feito: false,
        conferido: false,
      } : {}),
    };
    salvar([...itens, novo]);
    if (dataEntregaForm) definirDataEntrega(pedido.trim(), dataEntregaForm);
    setQtd(1);
    setProdutoManual("");
    setProduto(PRODUTOS[0]);
    setPassaPeloCorte(true);
    setDestinoLancamento("pre_corte");
    setDataSublimacaoRetroativa(hoje());
    setSublimadorRetroativo(SUBLIMADORES[0]);
  };
`;
  source = source.slice(0, inicio) + novo + source.slice(fim);
  alterado = true;
  console.log("NeoCooler: lançamento retroativo aplicado.");
}

// 3) Troca o campo de passagem pelo corte por destino explícito e, quando necessário, exibe data/sublimador.
const antigoCampo = `            <Field label="Passa pelo corte?">
              <select style={styles.input} value={passaPeloCorte ? "sim" : "nao"} onChange={(e) => setPassaPeloCorte(e.target.value === "sim")}>
                <option value="sim">Sim — entra no Pré-Corte</option>
                <option value="nao">Não — vai direto para Aguardando Sublimação</option>
              </select>
            </Field>`;
const novoCampo = `            <Field label="Destino do pedido">
              <select
                style={styles.input}
                value={destinoLancamento}
                onChange={(e) => {
                  const v = e.target.value;
                  setDestinoLancamento(v);
                  setPassaPeloCorte(v === "pre_corte");
                }}
              >
                <option value="pre_corte">Pré-Corte — fluxo normal</option>
                <option value="aguardando_sublimacao">Aguardando Sublimação — não passa pelo corte</option>
                <option value="aguardando_costura">Aguardando Costura — já sublimado</option>
              </select>
            </Field>
            {destinoLancamento === "aguardando_costura" && (
              <>
                <Field label="Data em que foi sublimado">
                  <input style={styles.input} type="date" value={dataSublimacaoRetroativa} onChange={(e) => setDataSublimacaoRetroativa(e.target.value)} />
                </Field>
                <Field label="Quem sublimou">
                  <select style={styles.input} value={sublimadorRetroativo} onChange={(e) => setSublimadorRetroativo(e.target.value)}>
                    {SUBLIMADORES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </>
            )}`;
substituir("campoDestinoLancamento", antigoCampo, novoCampo);

// 4) Texto do botão se adapta ao destino.
substituir(
  "botaoDestinoLancamento",
  '{passaPeloCorte ? "Adicionar ao pré-corte" : "Adicionar sem passar pelo corte"}',
  '{destinoLancamento === "aguardando_costura" ? "Lançar em aguardando costura" : destinoLancamento === "aguardando_sublimacao" ? "Lançar em aguardando sublimação" : "Adicionar ao pré-corte"}'
);

// 5) Aviso explica o lançamento retroativo.
substituir(
  "avisoDestinoLancamento",
  '<p style={styles.aviso}>Produtos novos podem ser escritos manualmente. Selecione se o item passa pelo corte; quando não passar, ele entra diretamente em Aguardando Sublimação.</p>',
  '<p style={styles.aviso}>Você pode lançar o pedido no fluxo normal, direto em Aguardando Sublimação ou, se já estiver sublimado, diretamente em Aguardando Costura informando a data e quem sublimou.</p>'
);

// 6) Migração defensiva para registros antigos.
const marcador = '            equipe: i.equipe || "Não decidido",\n            feito: i.feito ?? false,';
substituir(
  "migracaoHistoricoSublimacao",
  marcador,
  '            equipe: i.equipe || "Não decidido",\n            sublimador: i.sublimador || "",\n            dataSublimacao: i.dataSublimacao || "",\n            retroativo: i.retroativo ?? false,\n            feito: i.feito ?? false,'
);

if (alterado) fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: suporte a lançamentos retroativos em Aguardando Costura concluído.");
