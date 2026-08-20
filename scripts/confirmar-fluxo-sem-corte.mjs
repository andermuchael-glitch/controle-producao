import fs from "node:fs";

const file = "src/App.jsx";
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

const PRODUTOS_COSTURA_ANTES_SUBLIMACAO = ["TOALHA PERSONALIZADO 70X40", "TOALHA 80X30"];
const precisaCosturaAntesSublimacao = (produtoNome) => PRODUTOS_COSTURA_ANTES_SUBLIMACAO.includes(String(produtoNome || "").trim().toUpperCase());

// Garante os dois produtos no cadastro.
if (!source.includes('"TOALHA 80X30"')) {
  const anchor = 'const PRODUTOS = [';
  if (!source.includes(anchor)) throw new Error("NeoCooler: lista PRODUTOS não encontrada.");
  source = source.replace(anchor, `${anchor}"TOALHA 80X30",`);
}
if (!source.includes('"TOALHA PERSONALIZADO 70X40"')) {
  const anchor = 'const PRODUTOS = [';
  if (!source.includes(anchor)) throw new Error("NeoCooler: lista PRODUTOS não encontrada.");
  source = source.replace(anchor, `${anchor}"TOALHA PERSONALIZADO 70X40",`);
}

// Migra registros antigos da antiga etapa Corte. O pedido 11089 e as duas
// toalhas especiais devem entrar em Aguardando Costura; os demais vão para
// Aguardando Sublimação.
const oldLoadRegex = /etapa:\s*i\.etapa\s*===\s*["']corte["']\s*\?\s*["']aguardando_sublimacao["']\s*:\s*\(i\.etapa\s*\|\|\s*["']costura["']\),/;
const oldLoadReplacement = 'etapa: i.etapa === "corte" ? ((String(i.pedido) === "11089" || precisaCosturaAntesSublimacao(i.produto)) ? "aguardando_costura" : "aguardando_sublimacao") : (i.etapa || "costura"),';
if (oldLoadRegex.test(source)) {
  source = source.replace(oldLoadRegex, oldLoadReplacement);
} else if (source.includes('etapa: i.etapa || "costura",')) {
  source = source.replace('etapa: i.etapa || "costura",', oldLoadReplacement);
}

// Persiste a migração no Firebase para que o pedido 11089 não volte à antiga
// etapa Corte em outro dispositivo.
const persistOldMigration = '          setItens(migrados);';
const persistNewMigration = `          const houveMigracaoEtapa = migrados.some((item, index) => item.etapa !== carregados[index]?.etapa);\n          setItens(migrados);\n          if (houveMigracaoEtapa) salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});`;
if (source.includes(persistOldMigration) && !source.includes("houveMigracaoEtapa")) {
  source = source.replace(persistOldMigration, persistNewMigration);
}

// Novo comportamento do Pré-Corte: o que Patrick marca como cortado sai do
// Pré-Corte imediatamente. Toalhas especiais passam primeiro pela Costura;
// os demais itens vão diretamente para Aguardando Sublimação.
const marcarStart = source.indexOf('  const marcarCortado = (pedidoNum, produtoNome, restante) => {');
if (marcarStart >= 0) {
  const marcarEnd = source.indexOf('\n  };', marcarStart);
  if (marcarEnd > marcarStart) {
    const novoMarcar = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const precisaCostura = precisaCosturaAntesSublimacao(produtoNome);\n    const novo = {\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: precisaCostura ? "aguardando_costura" : "aguardando_sublimacao",\n      origemPreCorte: true,\n      cortador: "Patrick",\n      dataCorte: f.data || hoje(),\n      criadoEm: Date.now(),\n    };\n    salvar([...itens, novo]);\n    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restante - qtdNum, data: f.data } }));\n  };`;
    source = source.slice(0, marcarStart) + novoMarcar + source.slice(marcarEnd + 4);
  }
}

// O saldo do Pré-Corte considera somente itens que nasceram no Pré-Corte.
const mapaRegex = /const cortadoPorChave = \{\};[\s\S]*?\n    const pedidosArr = Object\.entries\(grupos\)\.map\(\(\[numero, produtos\]\) => \{/;
const mapaNovo = `const cortadoPorChave = {};\n    for (const it of itens) {\n      const veioDoPreCorte = it.origemPreCorte === true || (it.etapa === "corte" && it.origemPreCorte !== false);\n      if (!veioDoPreCorte) continue;\n      const chave = chaveAloc(it.pedido, it.produto);\n      cortadoPorChave[chave] = (cortadoPorChave[chave] || 0) + it.qtd;\n    }\n    const pedidosArr = Object.entries(grupos).map(([numero, produtos]) => {`;
if (mapaRegex.test(source)) source = source.replace(mapaRegex, mapaNovo);

// Ao concluir a Costura, as toalhas especiais retornam para Aguardando
// Sublimação; os demais produtos seguem para Separação.
const moverRegex = /  const moverPedidoParaSeparacao = \(numero\) => \{[\s\S]*?\n  \};/;
const moverNovo = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => {\n      if (i.pedido !== numero || i.etapa !== "costura") return i;\n      return precisaCosturaAntesSublimacao(i.produto)\n        ? { ...i, etapa: "aguardando_sublimacao", feito: false, conferido: false }\n        : { ...i, etapa: "separacao", feito: false, conferido: false };\n    }));\n  };`;
if (moverRegex.test(source)) source = source.replace(moverRegex, moverNovo);

// Remove Corte do layout e das etapas exibidas.
source = source.replace(
  'const ETAPAS = ["pre_corte", "corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];'
);
source = source.replace('  corte: "Corte",\n', '');
source = source.replace(/\s*<Stat label=["']corte["'] value=\{totalCorte\} \/>/g, "");
source = source.replace(/\s*\{\s*id:\s*["']corte["'],\s*label:\s*["']Corte["'],\s*contagem:\s*\{totalCorte\}\s*\},/g, "");

// Remove o bloco visual da antiga aba Corte, se ainda existir.
const corteBlockStart = '        {loaded && aba === "corte" && (\n';
const corteBlockEnd = '        {loaded && aba === "aguardando_sublimacao" && (\n';
const start = source.indexOf(corteBlockStart);
const end = source.indexOf(corteBlockEnd, start + corteBlockStart.length);
if (start >= 0 && end > start) source = source.slice(0, start) + source.slice(end);

// Textos do novo fluxo.
source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");
source = source.replaceAll("o item passa para a aba Corte.", "o item passa diretamente para Aguardando Sublimação.");
source = source.replaceAll("Mova itens pela aba Corte.", "Os itens entram aqui automaticamente quando Patrick confirma o corte.");
source = source.replace(
  "Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa para a aba Corte.",
  "Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — itens normais vão para Aguardando Sublimação; TOALHA PERSONALIZADO 70X40 e TOALHA 80X30 passam primeiro pela Costura."
);
source = source.replace(
  "Pedidos lançados aqui aguardam o corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa diretamente para Aguardando Sublimação.",
  "Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — itens normais vão para Aguardando Sublimação; TOALHA PERSONALIZADO 70X40 e TOALHA 80X30 passam primeiro pela Costura."
);

// Botão de conclusão da costura com texto correto para toalhas.
const btnRegex = /\{pedido\.completo && \(\s*<button style=\{styles\.finalizarBtn\} onClick=\{\(\) => onFinalizar\(pedido\.numero\)\}>Mover pedido p\/ separação →<\/button>\s*\)\}/;
const btnNovo = `{pedido.completo && (\n        <button style={styles.finalizarBtn} onClick={() => onFinalizar(pedido.numero)}>\n          {pedido.itens.every((it) => precisaCosturaAntesSublimacao(it.produto)) ? "Concluir costura → Aguardando Sublimação" : "Mover pedido p/ próxima etapa →"}\n        </button>\n      )}`;
if (btnRegex.test(source)) source = source.replace(btnRegex, btnNovo);

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("fluxo sem Corte atualizado: 11089 em Aguardando Costura; toalhas 70x40/80x30 passam pela Costura e retornam para Aguardando Sublimação.");
} else {
  log("fluxo final já estava aplicado.");
}
