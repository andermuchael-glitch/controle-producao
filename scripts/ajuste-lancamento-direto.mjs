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

// Estado do destino do lançamento. O fluxo normal continua existindo, mas agora
// também é possível iniciar um pedido diretamente em Aguardando Costura.
aplicar(
  "estadoDestinoLancamento",
  '  const [passaPeloCorte, setPassaPeloCorte] = useState(true);\n  const [qtd, setQtd] = useState(1);',
  '  const [passaPeloCorte, setPassaPeloCorte] = useState(true);\n  const [destinoLancamento, setDestinoLancamento] = useState("pre_corte");\n  const [qtd, setQtd] = useState(1);'
);

// O item pode começar em qualquer uma das três entradas operacionais.
aplicar(
  "destinoNoAdicionarItem",
  '      passaPeloCorte,\n      etapa: passaPeloCorte ? "pre_corte" : "aguardando_sublimacao",\n      criadoEm: Date.now(),',
  '      passaPeloCorte: destinoLancamento === "pre_corte",\n      etapa: destinoLancamento,\n      criadoEm: Date.now(),'
);

// Limpa a escolha para o próximo lançamento.
aplicar(
  "limparDestinoLancamento",
  '    setPassaPeloCorte(true);',
  '    setPassaPeloCorte(true);\n    setDestinoLancamento("pre_corte");'
);

// Substitui a escolha anterior "Passa pelo corte?" por um destino explícito.
aplicar(
  "campoDestinoLancamento",
  `            <Field label="Passa pelo corte?">\n              <select style={styles.input} value={passaPeloCorte ? "sim" : "nao"} onChange={(e) => setPassaPeloCorte(e.target.value === "sim")}>\n                <option value="sim">Sim — entra no Pré-Corte</option>\n                <option value="nao">Não — vai direto para Aguardando Sublimação</option>\n              </select>\n            </Field>`,
  `            <Field label="Destino do pedido">\n              <select style={styles.input} value={destinoLancamento} onChange={(e) => {\n                const valor = e.target.value;\n                setDestinoLancamento(valor);\n                setPassaPeloCorte(valor === "pre_corte");\n              }}>\n                <option value="pre_corte">🔵 Pré-Corte — fluxo normal</option>\n                <option value="aguardando_sublimacao">🟡 Aguardando Sublimação — não passa pelo corte</option>\n                <option value="aguardando_costura">🟢 Aguardando Costura — já pronto para distribuir as cores</option>\n              </select>\n            </Field>`
);

aplicar(
  "botaoDestinoLancamento",
  '<button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim() || (produto === "__MANUAL__" && !produtoManual.trim())}>{passaPeloCorte ? "Adicionar ao pré-corte" : "Adicionar sem passar pelo corte"}</button>',
  '<button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim() || (produto === "__MANUAL__" && !produtoManual.trim())}>\n            {destinoLancamento === "pre_corte" ? "Adicionar ao pré-corte" : destinoLancamento === "aguardando_sublimacao" ? "Adicionar à aguardando sublimação" : "Adicionar direto à aguardando costura"}\n          </button>'
);

aplicar(
  "avisoDestinoLancamento",
  '<p style={styles.aviso}>Produtos novos podem ser escritos manualmente. Selecione se o item passa pelo corte; quando não passar, ele entra diretamente em Aguardando Sublimação.</p>',
  '<p style={styles.aviso}>Produtos novos podem ser escritos manualmente. Escolha o destino: pedidos já prontos podem entrar diretamente em <b>Aguardando Costura</b>, onde você distribui as cores e prepara os lotes para envio à costura.</p>'
);

if (!alterado) {
  console.log("NeoCooler: nenhum ajuste novo de lançamento foi necessário.");
} else {
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: lançamento direto em Aguardando Costura habilitado.");
}
