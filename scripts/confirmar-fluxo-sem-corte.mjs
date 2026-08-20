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

// Produtos que, depois da sublimação, precisam passar pela costura e depois
// voltar para Aguardando Sublimação.
const anchor = 'const CORTADORES = ["Patrick"];';
if (!source.includes("FLUXO_SEM_CORTE_ESPECIAIS_V8") && source.includes(anchor)) {
  const bloco = [
    "",
    "// FLUXO_SEM_CORTE_ESPECIAIS_V8",
    `const PRODUTOS_COSTURA_ANTES_SUBLIMACAO = ${JSON.stringify(especiais)};`,
    'const precisaCosturaAntesSublimacao = (nome) => PRODUTOS_COSTURA_ANTES_SUBLIMACAO.includes(String(nome || "").trim().toUpperCase());',
    "",
  ].join("\n");
  source = source.replace(anchor, anchor + bloco);
}

for (const nome of especiais) {
  const literal = JSON.stringify(nome);
  if (!source.includes(literal)) {
    source = source.replace("const PRODUTOS = [", `const PRODUTOS = [${literal},`);
  }
}

// Corte deixa de existir como etapa operacional/visual.
source = source.replace(
  /const ETAPAS = \[[^\n]*\];/,
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];'
);
source = source.replace(/\n\s*corte:\s*"Corte",/, "\n");

// Normalização persistente de dados antigos. Isso roda no carregamento do
// aplicativo, portanto o pedido 11089 não depende de um script de migração
// externo para sair de Corte.
if (!source.includes("NORMALIZACAO_FLUXO_SEM_CORTE_V8")) {
  const storageAnchor = 'const AUDIT_ADMIN_EMAIL = "andermuchael@gmail.com";';
  const normalizador = `
// NORMALIZACAO_FLUXO_SEM_CORTE_V8
const normalizarItensPersistidos = (lista) => {
  const entrada = Array.isArray(lista) ? lista : [];
  const base = entrada.map((i) => {
    const nome = String(i.produto || "").trim().toUpperCase();
    let etapa = i.etapa || "costura";
    if (etapa === "corte") {
      etapa = precisaCosturaAntesSublimacao(nome) ? "aguardando_costura" : "aguardando_sublimacao";
    }
    return {
      ...i,
      etapa,
      equipe: i.equipe || "Não decidido",
      feito: i.feito ?? false,
      conferido: i.conferido ?? false,
    };
  });

  // Remove registros exatamente iguais.
  const vistos = new Set();
  const semExatos = base.filter((i) => {
    const chave = [
      String(i.pedido),
      String(i.produto || "").trim().toUpperCase(),
      i.etapa,
      Number(i.qtd) || 0,
      i.cor || "",
      i.sublimador || "",
      i.equipe || "",
    ].join("||");
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });

  // Pré-Corte representa somente o saldo ainda não avançado. Se o mesmo
  // pedido/produto já estiver em etapa posterior, não o recriamos no Pré-Corte.
  const porChave = {};
  for (const i of semExatos) {
    const chave = String(i.pedido) + "||" + String(i.produto || "").trim().toUpperCase();
    if (!porChave[chave]) porChave[chave] = { pre: [], posterior: [] };
    if (i.etapa === "pre_corte") porChave[chave].pre.push(i);
    else porChave[chave].posterior.push(i);
  }

  const resultado = [];
  for (const grupo of Object.values(porChave)) {
    const totalPre = grupo.pre.reduce((s, i) => s + (Number(i.qtd) || 0), 0);
    const totalPosterior = grupo.posterior.reduce((s, i) => s + (Number(i.qtd) || 0), 0);
    const saldoPre = Math.max(0, totalPre - totalPosterior);
    if (grupo.pre.length && saldoPre > 0) {
      resultado.push({ ...grupo.pre[0], qtd: saldoPre });
    }
    for (const i of grupo.posterior) resultado.push(i);
  }
  return resultado;
};
`;
  if (source.includes(storageAnchor)) {
    source = source.replace(storageAnchor, storageAnchor + normalizador);
  }
}

// Carregamento: normaliza e grava de volta no Firebase quando houver mudança.
const antigoCarregamento = `const migrados = carregados.map((i) => ({
            ...i,
            etapa: i.etapa || "costura",
            equipe: i.equipe || "Não decidido",
            feito: i.feito ?? false,
            conferido: i.conferido ?? false,
          }));
          setItens(migrados);`;
const novoCarregamento = `const migrados = normalizarItensPersistidos(carregados);
          setItens(migrados);
          if (JSON.stringify(migrados) !== JSON.stringify(carregados)) {
            salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});
          }`;
if (source.includes(antigoCarregamento)) {
  source = source.replace(antigoCarregamento, novoCarregamento);
  log("normalização persistente de etapas e duplicações aplicada.");
}

// Não permite lançar novamente o mesmo pedido/produto se ele já estiver em
// qualquer etapa.
const antigoCheck = 'const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");';
const novoCheck = 'const existente = itens.find((i) => String(i.pedido) === String(numero) && String(i.produto || "").trim().toUpperCase() === String(produto || "").trim().toUpperCase());';
if (source.includes(antigoCheck)) source = source.replace(antigoCheck, novoCheck);
source = source.replace(
  'setErro(`O pedido #${numero} já possui ${produto} no pré-corte. Para evitar duplicação, altere a quantidade no lançamento existente.`);',
  'setErro(`O pedido #${numero} já possui ${produto} em outra etapa. Para evitar duplicação, altere o lançamento existente.`);'
);

// Patrick confirma o corte diretamente no Pré-Corte. Não existe mais um cartão
// intermediário em Corte.
const corteStart = source.indexOf('  // ---- Pré-Corte -> Corte (marcado conforme Patrick vai cortando) ----');
const alocStart = source.indexOf('  // ---- Alocação: aguardando sublimação', corteStart);
if (corteStart >= 0 && alocStart > corteStart) {
  const novoBlocoCorte = `  // ---- Pré-Corte -> próxima etapa (Patrick confirma o que realmente cortou) ----
  const getCorteForm = (p, prod, restante) => corteForm[chaveAloc(p, prod)] || { qtd: restante, data: hoje() };
  const setCorteFormCampo = (p, prod, restante, campo, valor) => {
    const chave = chaveAloc(p, prod);
    setCorteForm((f) => ({ ...f, [chave]: { ...getCorteForm(p, prod, restante), [campo]: valor } }));
  };
  const marcarCortado = (pedidoNum, produtoNome, restante) => {
    const f = getCorteForm(pedidoNum, produtoNome, restante);
    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));
    const etapaDestino = precisaCosturaAntesSublimacao(produtoNome) ? "aguardando_costura" : "aguardando_sublimacao";
    let saldo = qtdNum;
    const novaLista = [];
    for (const item of itens) {
      if (saldo > 0 && item.pedido === pedidoNum && item.produto === produtoNome && item.etapa === "pre_corte") {
        const restanteItem = Math.max(0, (Number(item.qtd) || 0) - saldo);
        if (restanteItem > 0) novaLista.push({ ...item, qtd: restanteItem });
        saldo = 0;
      } else {
        novaLista.push(item);
      }
    }
    novaLista.push({
      id: uid(),
      pedido: pedidoNum,
      produto: produtoNome,
      qtd: qtdNum,
      etapa: etapaDestino,
      cortador: "Patrick",
      dataCorte: f.data || hoje(),
      criadoEm: Date.now(),
      equipe: "Não decidido",
      feito: false,
      conferido: false,
    });
    salvar(novaLista);
    setCorteForm((f2) => ({
      ...f2,
      [chaveAloc(pedidoNum, produtoNome)]: { qtd: Math.max(1, restante - qtdNum), data: f.data },
    }));
  };

`;
  source = source.slice(0, corteStart) + novoBlocoCorte + source.slice(alocStart);
  log("confirmação de corte agora envia diretamente para a próxima etapa.");
}

// Remove helper antigo de Corte, se existir.
const antigoMover = `  // ---- Corte -> Aguardando Sublimação (movido manualmente, fora de sequência) ----
  const moverParaAguardandoSublimacao = (pedidoNum, produtoNome) => {
    salvar(
      itens.map((i) =>
        i.etapa === "corte" && i.pedido === pedidoNum && i.produto === produtoNome
          ? { ...i, etapa: "aguardando_sublimacao" }
          : i
      )
    );
  };
`;
if (source.includes(antigoMover)) source = source.replace(antigoMover, "");

// Produtos especiais retornam à Aguardando Sublimação quando a costura for
// concluída. Os demais seguem o fluxo normal.
const antigoToggle = `  const toggleFeito = (id) => {
    salvar(itens.map((i) => (i.id === id ? { ...i, feito: !i.feito } : i)));
  };`;
const novoToggle = `  const toggleFeito = (id) => {
    const alvo = itens.find((i) => i.id === id);
    if (!alvo) return;
    if (!alvo.feito && precisaCosturaAntesSublimacao(alvo.produto)) {
      salvar(itens.map((i) => i.id === id ? { ...i, feito: true, etapa: "aguardando_sublimacao" } : i));
      return;
    }
    salvar(itens.map((i) => (i.id === id ? { ...i, feito: !i.feito } : i)));
  };`;
if (source.includes(antigoToggle)) source = source.replace(antigoToggle, novoToggle);

// Remove o bloco visual da aba Corte.
const visualCorte = source.indexOf('        {loaded && aba === "corte" && (');
const visualAguardando = source.indexOf('        {loaded && aba === "aguardando_sublimacao" && (', visualCorte);
if (visualCorte >= 0 && visualAguardando > visualCorte) {
  source = source.slice(0, visualCorte) + source.slice(visualAguardando);
  log("bloco visual da aba Corte removido.");
}

// Remove Corte do menu e dos contadores.
const abasRegex = /  const ABAS = \[[\s\S]*?\n  \];/;
const novasAbas = `  const ABAS = [
    { id: "pre_corte", label: "Pré-Corte", contagem: totalPreCorte },
    { id: "aguardando_sublimacao", label: "Aguard. Sublimação", contagem: totalAguardandoSublimacao },
    { id: "sublimacao", label: "Sublimação", contagem: totalSublimacao },
    { id: "aguardando_costura", label: "Aguard. Costura", contagem: totalAguardando },
    { id: "costura", label: "Costura", contagem: totalCosturaAberto },
    { id: "separacao", label: "Separação", contagem: totalSeparacaoPend },
  ];`;
source = source.replace(abasRegex, novasAbas);

source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");
source = source.replaceAll("o item passa para a aba Corte", "o item vai diretamente para a próxima etapa");
source = source.replaceAll("Mova itens pela aba Corte.", "Itens cortados entram diretamente na próxima etapa.");
source = source.replaceAll("marque a quantidade e o dia — o item passa para a aba Corte.", "marque a quantidade e o dia — o item vai diretamente para a próxima etapa.");
source = source.replaceAll("Itens ficam aqui até serem movidos manualmente — o corte nem sempre segue a mesma ordem da sublimação.", "Esta etapa não existe mais. Patrick confirma o que foi realmente cortado diretamente no Pré-Corte.");
source = source.replaceAll("Nada no corte. Importe um PDF ou lance manualmente acima.", "Nada aguardando nesta etapa.");

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("fluxo sem Corte V8 aplicado com sucesso.");
} else {
  log("fluxo sem Corte V8 já estava aplicado.");
}
