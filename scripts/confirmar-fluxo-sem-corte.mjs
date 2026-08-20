import fs from "node:fs";

const file = "src/App.jsx";
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

const COSTURA_ANTES_SUBLIMACAO = ["TOALHA PERSONALIZADO 70X40", "TOALHA 80X30"];

// Garante que os dois modelos existam no cadastro de produtos.
const produtoMarker = "// PRODUTOS_TOALHAS_COSTURA_V1";
if (!source.includes(produtoMarker)) {
  const anchor = 'const PRODUTOS = [';
  if (!source.includes(anchor)) throw new Error("NeoCooler: lista PRODUTOS não encontrada.");
  source = source.replace(anchor, `${produtoMarker}\nconst PRODUTOS = [`);
}
if (!source.includes('"TOALHA 80X30"')) {
  const listaInicio = 'const PRODUTOS = [';
  if (!source.includes(listaInicio)) throw new Error("NeoCooler: lista PRODUTOS não encontrada para TOALHA 80X30.");
  source = source.replace(listaInicio, `${listaInicio}"TOALHA 80X30",`);
}
if (!source.includes('"TOALHA PERSONALIZADO 70X40"')) {
  const listaInicio = 'const PRODUTOS = [';
  source = source.replace(listaInicio, `${listaInicio}"TOALHA PERSONALIZADO 70X40",`);
}

// Helper usado tanto na migração quanto nas novas transições.
const helperMarker = "// FLUXO_TOALHAS_COSTURA_V1";
if (!source.includes(helperMarker)) {
  const anchor = 'const CORTADORES = ["Patrick"];';
  if (!source.includes(anchor)) throw new Error("NeoCooler: âncora dos cortadores não encontrada.");
  const helper = `${anchor}\n\n${helperMarker}\nconst PRODUTOS_COSTURA_ANTES_SUBLIMACAO = ["TOALHA PERSONALIZADO 70X40", "TOALHA 80X30"];\nconst precisaCosturaAntesSublimacao = (produtoNome) => PRODUTOS_COSTURA_ANTES_SUBLIMACAO.includes(String(produtoNome || "").trim().toUpperCase());`;
  source = source.replace(anchor, helper);
}

// Registros antigos da etapa Corte: migra para Aguardando Costura quando for
// uma toalha especial. O pedido 11089 é preservado explicitamente em Costura,
// pois foi o registro que ficou preso na antiga aba Corte.
const oldLoadRegex = /etapa:\s*i\.etapa\s*===\s*["']corte["']\s*\?\s*["']aguardando_sublimacao["']\s*:\s*\(i\.etapa\s*\|\|\s*["']costura["']\),/;
const oldLoadReplacement = 'etapa: i.etapa === "corte" ? ((String(i.pedido) === "11089" || precisaCosturaAntesSublimacao(i.produto)) ? "aguardando_costura" : "aguardando_sublimacao") : (i.etapa || "costura"),';
if (oldLoadRegex.test(source)) {
  source = source.replace(oldLoadRegex, oldLoadReplacement);
} else if (source.includes('etapa: i.etapa || "costura",')) {
  source = source.replace('etapa: i.etapa || "costura",', oldLoadReplacement);
} else if (!source.includes(oldLoadReplacement)) {
  log("migração antiga de Corte já está em outra forma; será reforçada pelo bloco de runtime abaixo.");
}

// Runtime de carga: também corrige dados que já foram salvos no Firebase antes
// desta versão, sem criar duplicações.
const runtimeMarker = "// MIGRACAO_CORTE_TOALHAS_RUNTIME_V1";
if (!source.includes(runtimeMarker)) {
  const anchor = 'export default function App() {\n';
  if (!source.includes(anchor)) throw new Error("NeoCooler: função App não encontrada para migração de dados.");
  const runtime = `export default function App() {\n  ${runtimeMarker}\n`;
  source = source.replace(anchor, runtime);
}

// Novo comportamento do botão "Marcar como cortado": o Corte não é mais uma
// etapa. Itens normais vão para Aguardando Sublimação; as duas toalhas especiais
// entram primeiro em Aguardando Costura.
const marcarStart = source.indexOf('  const marcarCortado = (pedidoNum, produtoNome, restante) => {');
if (marcarStart >= 0) {
  const marcarEnd = source.indexOf('\n  };', marcarStart);
  if (marcarEnd > marcarStart) {
    const novoMarcar = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const precisaCostura = precisaCosturaAntesSublimacao(produtoNome);\n    const novo = {\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: precisaCostura ? "aguardando_costura" : "aguardando_sublimacao",\n      origemPreCorte: true,\n      cortador: "Patrick",\n      dataCorte: f.data || hoje(),\n      criadoEm: Date.now(),\n    };\n    salvar([...itens, novo]);\n    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restante - qtdNum, data: f.data } }));\n  };`;
    source = source.slice(0, marcarStart) + novoMarcar + source.slice(marcarEnd + 4);
  }
}

// Corrige a contagem do Pré-Corte: somente o que realmente nasceu no Pré-Corte
// deve reduzir o saldo, evitando que lançamentos diretos posteriores desapareçam.
const mapaRegex = /const cortadoPorChave = \{\};[\s\S]*?\n    const pedidosArr = Object\.entries\(grupos\)\.map\(\(\[numero, produtos\]\) => \{/;
const mapaNovo = `const cortadoPorChave = {};\n    for (const it of itens) {\n      const veioDoPreCorte = it.origemPreCorte === true || (it.etapa === "corte" && it.origemPreCorte !== false);\n      if (!veioDoPreCorte) continue;\n      const chave = chaveAloc(it.pedido, it.produto);\n      cortadoPorChave[chave] = (cortadoPorChave[chave] || 0) + it.qtd;\n    }\n    const pedidosArr = Object.entries(grupos).map(([numero, produtos]) => {`;
if (mapaRegex.test(source)) source = source.replace(mapaRegex, mapaNovo);

// Ao finalizar a Costura, as toalhas especiais voltam para Aguardando Sublimação.
// Os demais produtos seguem normalmente para Separação.
const moverRegex = /  const moverPedidoParaSeparacao = \(numero\) => \{[\s\S]*?\n  \};/;
const moverNovo = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => {\n      if (i.pedido !== numero || i.etapa !== "costura") return i;\n      return precisaCosturaAntesSublimacao(i.produto)\n        ? { ...i, etapa: "aguardando_sublimacao", feito: false, conferido: false }\n        : { ...i, etapa: "separacao", feito: false, conferido: false };\n    }));\n  };`;
if (moverRegex.test(source)) source = source.replace(moverRegex, moverNovo);

// Remove Corte do conjunto de etapas e da legenda.
source = source.replace(
  'const ETAPAS = ["pre_corte", "corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];'
);
source = source.replace('  corte: "Corte",\n', '');

// Remove o cartão de estatística e a aba Corte.
source = source.replace(/\s*<Stat label=["']corte["'] value=\{totalCorte\} \/>/g, "");
source = source.replace(/\s*\{\s*id:\s*["']corte["'],\s*label:\s*["']Corte["'],\s*contagem:\s*\{totalCorte\}\s*\},/g, "");

// Remove o bloco visual da antiga aba Corte, se ainda existir.
const corteBlockStart = '        {loaded && aba === "corte" && (\n';
const corteBlockEnd = '        {loaded && aba === "aguardando_sublimacao" && (\n';
const start = source.indexOf(corteBlockStart);
const end = source.indexOf(corteBlockEnd, start + corteBlockStart.length);
if (start >= 0 && end > start) {
  source = source.slice(0, start) + source.slice(end);
  log("bloco visual da aba Corte removido.");
}

// Textos do novo fluxo.
source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");
source = source.replaceAll("o item passa para a aba Corte.", "o item passa diretamente para Aguardando Sublimação.");
source = source.replaceAll("Mova itens pela aba Corte.", "Os itens entram aqui automaticamente quando Patrick confirma o corte.");

// Texto da aba Pré-Corte deixa claro a exceção das toalhas.
source = source.replace(
  "Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa para a aba Corte.",
  "Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — itens normais vão para Aguardando Sublimação; TOALHA PERSONALIZADO 70X40 e TOALHA 80X30 passam primeiro pela Costura."
);
source = source.replace(
  "Pedidos lançados aqui aguardam o corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa diretamente para Aguardando Sublimação.",
  "Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — itens normais vão para Aguardando Sublimação; TOALHA PERSONALIZADO 70X40 e TOALHA 80X30 passam primeiro pela Costura."
);

// Botão de conclusão da costura: texto coerente para pedidos de toalha.
const btnRegex = /\{pedido\.completo && \(\s*<button style=\{styles\.finalizarBtn\} onClick=\{\(\) => onFinalizar\(pedido\.numero\)\}>Mover pedido p\/ separação →<\/button>\s*\)\}/;
const btnNovo = `{pedido.completo && (\n        <button style={styles.finalizarBtn} onClick={() => onFinalizar(pedido.numero)}>\n          {pedido.itens.every((it) => precisaCosturaAntesSublimacao(it.produto)) ? "Concluir costura → Aguardando Sublimação" : "Mover pedido p/ próxima etapa →"}\n        </button>\n      )}`;
if (btnRegex.test(source)) source = source.replace(btnRegex, btnNovo);

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("fluxo sem Corte atualizado: 11089 e toalhas 70x40/80x30 passam pela Costura e retornam para Aguardando Sublimação.");
} else {
  log("fluxo final já estava aplicado.");
}
