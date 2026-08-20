import fs from "node:fs";

const file = "src/App.jsx";
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

const PRODUTOS_COSTURA_ANTES_SUBLIMACAO = [
  "TOALHA PERSONALIZADO 70X40",
  "TOALHA 80X30",
  "TOALHA C/ CAPUZ G",
  "TOALHA C/ CAPUZ M",
];
const helperMarker = "// FLUXO_TOALHAS_COSTURA_V4";

// Regras centrais do novo fluxo. O Corte não é mais uma etapa da interface:
// Patrick apenas confirma o que já foi cortado.
if (!source.includes(helperMarker)) {
  const anchor = 'const CORTADORES = ["Patrick"];';
  if (!source.includes(anchor)) throw new Error("NeoCooler: âncora dos cortadores não encontrada.");
  const helper = `${anchor}\n\n${helperMarker}\nconst PRODUTOS_COSTURA_ANTES_SUBLIMACAO = ${JSON.stringify(PRODUTOS_COSTURA_ANTES_SUBLIMACAO)};\nconst precisaCosturaAntesSublimacao = (produtoNome) => PRODUTOS_COSTURA_ANTES_SUBLIMACAO.includes(String(produtoNome || "").trim().toUpperCase());`;
  source = source.replace(anchor, helper);
}

// Garante os produtos usados nas regras especiais no cadastro.
for (const produto of ["TOALHA 80X30", "TOALHA PERSONALIZADO 70X40"]) {
  if (!source.includes(`"${produto}"`)) {
    source = source.replace("const PRODUTOS = [", `const PRODUTOS = ["${produto}",`);
  }
}

// Migração de itens antigos: se ainda estiverem em Corte, toalhas especiais
// vão para Aguardando Costura; os demais vão para Aguardando Sublimação.
const loadLine = /etapa:\s*i\.etapa\s*===\s*["']corte["']\s*\?\s*[^,]+,|etapa:\s*i\.etapa\s*\|\|\s*["']costura["'],/;
const loadReplacement = 'etapa: i.etapa === "corte" ? ((String(i.pedido) === "11089" || precisaCosturaAntesSublimacao(i.produto)) ? "aguardando_costura" : "aguardando_sublimacao") : (i.etapa || "costura"),';
if (loadLine.test(source)) source = source.replace(loadLine, loadReplacement);

// Migração persistente no carregamento. Usa o bloco real atual do App.jsx,
// sem depender de espaços/linhas exatas que mudavam entre versões.
const mapRegex = /const migrados = carregados\.map\(\(i\) => \(\{[\s\S]*?\n\s*\}\)\);\n\s*setItens\(migrados\);/;
if (mapRegex.test(source) && !source.includes("// MIGRACAO_11089_RUNTIME_V4")) {
  const mapReplacement = `// MIGRACAO_11089_RUNTIME_V4\n          let migracaoFeita = false;\n          const migrados = carregados.map((i) => {\n            const etapaAntiga = i.etapa;\n            let etapaNova = i.etapa || "costura";\n            if (String(i.pedido) === "11089") {\n              etapaNova = "aguardando_costura";\n            } else if (etapaAntiga === "corte") {\n              etapaNova = precisaCosturaAntesSublimacao(i.produto) ? "aguardando_costura" : "aguardando_sublimacao";\n            }\n            if (etapaNova !== etapaAntiga) migracaoFeita = true;\n            return {\n              ...i,\n              etapa: etapaNova,\n              equipe: i.equipe || "Não decidido",\n              feito: i.feito ?? false,\n              conferido: i.conferido ?? false,\n            };\n          });\n          setItens(migrados);\n          if (migracaoFeita) salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});`;
  source = source.replace(mapRegex, mapReplacement);
}

// Patrick confirma o corte diretamente da lista de Pré-Corte.
const marcarRegex = /  const marcarCortado = \(pedidoNum, produtoNome, restante\) => \{[\s\S]*?\n  \};/;
if (marcarRegex.test(source)) {
  const marcarNovo = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const destino = precisaCosturaAntesSublimacao(produtoNome) ? "aguardando_costura" : "aguardando_sublimacao";\n    const novo = {\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: destino,\n      origemPreCorte: true,\n      cortador: "Patrick",\n      dataCorte: f.data || hoje(),\n      criadoEm: Date.now(),\n    };\n    salvar([...itens, novo]);\n    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restante - qtdNum, data: f.data } }));\n  };`;
  source = source.replace(marcarRegex, marcarNovo);
}

// Compatibilidade: se ainda existir a ação manual Corte -> Sublimação,
// ela também respeita a regra especial das toalhas.
const moverRegex = /  const moverParaAguardandoSublimacao = \(pedidoNum, produtoNome\) => \{[\s\S]*?\n  \};/;
if (moverRegex.test(source)) {
  const moverNovo = `  const moverParaAguardandoSublimacao = (pedidoNum, produtoNome) => {\n    salvar(itens.map((i) => {\n      if (i.etapa !== "corte" || i.pedido !== pedidoNum || i.produto !== produtoNome) return i;\n      return { ...i, etapa: precisaCosturaAntesSublimacao(i.produto) ? "aguardando_costura" : "aguardando_sublimacao" };\n    }));\n  };`;
  source = source.replace(moverRegex, moverNovo);
}

// Costura concluída: toalhas especiais retornam para Aguardando Sublimação;
// os demais produtos seguem para Separação.
const separacaoRegex = /  const moverPedidoParaSeparacao = \(numero\) => \{[\s\S]*?\n  \};/;
if (separacaoRegex.test(source)) {
  const separacaoNovo = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => {\n      if (i.pedido !== numero || i.etapa !== "costura") return i;\n      return precisaCosturaAntesSublimacao(i.produto)\n        ? { ...i, etapa: "aguardando_sublimacao", feito: false, conferido: false }\n        : { ...i, etapa: "separacao", feito: false, conferido: false };\n    }));\n  };`;
  source = source.replace(separacaoRegex, separacaoNovo);
}

// Remove Corte da interface, caso algum patch anterior ainda o tenha deixado.
source = source.replace('  corte: "Corte",\n', '');
source = source.replace(/\s*<Stat label=["']corte["'] value=\{totalCorte\} \/>/g, "");
source = source.replace(/\s*\{\s*id:\s*["']corte["'],\s*label:\s*["']Corte["'],\s*contagem:\s*\{totalCorte\}\s*\},/g, "");
source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");
source = source.replaceAll("Mova itens pela aba Corte.", "Os itens entram automaticamente na próxima etapa quando Patrick confirma o corte.");

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("Fluxo sem Corte corrigido; migração 11089 e regras de costura aplicadas.");
} else {
  log("Nenhuma alteração necessária.");
}
