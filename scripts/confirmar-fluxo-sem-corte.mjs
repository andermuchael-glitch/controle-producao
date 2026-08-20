import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

const PRODUTOS_COSTURA_ANTES_SUBLIMACAO = [
  "TOALHA PERSONALIZADO 70X40",
  "TOALHA 80X30",
  "TOALHA C/ CAPUZ G",
  "TOALHA C/ CAPUZ M",
];
const helperMarker = "// FLUXO_TOALHAS_COSTURA_V5";

// Regras centrais: Patrick apenas confirma o que já cortou.
if (!source.includes(helperMarker)) {
  const anchor = 'const CORTADORES = ["Patrick"];';
  if (!source.includes(anchor)) throw new Error("NeoCooler: âncora dos cortadores não encontrada.");
  const helper = `${anchor}\n\n${helperMarker}\nconst PRODUTOS_COSTURA_ANTES_SUBLIMACAO = ${JSON.stringify(PRODUTOS_COSTURA_ANTES_SUBLIMACAO)};\nconst precisaCosturaAntesSublimacao = (produtoNome) => PRODUTOS_COSTURA_ANTES_SUBLIMACAO.includes(String(produtoNome || "").trim().toUpperCase());`;
  source = source.replace(anchor, helper);
}

// Garante que os dois produtos que ainda não estavam no cadastro existam no seletor.
for (const produto of ["TOALHA PERSONALIZADO 70X40", "TOALHA 80X30"]) {
  if (!source.includes(`"${produto}"`)) {
    source = source.replace("const PRODUTOS = [", `const PRODUTOS = ["${produto}",`);
  }
}

// 1) Migração persistente dos dados antigos: qualquer item que ainda esteja
// em Corte é retirado dessa etapa. O pedido 11089 e as quatro toalhas passam
// por Aguardando Costura; os demais vão para Aguardando Sublimação.
if (!source.includes("// MIGRACAO_CORTE_RUNTIME_V5")) {
  const marker = "          const carregados = JSON.parse(raw);";
  if (!source.includes(marker)) throw new Error("NeoCooler: carregamento do Firebase não encontrado.");
  const inject = `${marker}\n          // MIGRACAO_CORTE_RUNTIME_V5\n          let migracaoFeita = false;\n          const migrados = carregados.map((i) => {\n            const etapaAntiga = i.etapa;\n            let etapaNova = i.etapa || "costura";\n            if (etapaAntiga === "corte") {\n              etapaNova = String(i.pedido) === "11089" || precisaCosturaAntesSublimacao(i.produto)\n                ? "aguardando_costura"\n                : "aguardando_sublimacao";\n            }\n            if (etapaNova !== etapaAntiga) migracaoFeita = true;\n            return {\n              ...i,\n              etapa: etapaNova,\n              equipe: i.equipe || "Não decidido",\n              feito: i.feito ?? false,\n              conferido: i.conferido ?? false,\n            };\n          });\n          setItens(migrados);\n          if (migracaoFeita) salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});`;

  // Substitui todo o bloco antigo de map/setItens que venha depois do marcador.
  const inicio = source.indexOf(marker);
  const fim = source.indexOf("      }", source.indexOf("setItens(migrados);", inicio));
  const trechoDepoisMarker = source.slice(inicio + marker.length);
  const setIndexLocal = trechoDepoisMarker.indexOf("setItens(migrados);");
  if (setIndexLocal < 0) throw new Error("NeoCooler: setItens(migrados) não encontrado.");
  const inicioBloco = inicio;
  const fimBloco = inicio + marker.length + setIndexLocal + "setItens(migrados);".length;
  source = source.slice(0, inicioBloco) + inject + source.slice(fimBloco);
  log("migração runtime robusta dos itens antigos de Corte aplicada.");
}

// 2) Patrick confirma diretamente no Pré-Corte. O destino depende do produto.
const marcarInicio = source.indexOf("  const marcarCortado = (pedidoNum, produtoNome, restante) => {");
if (marcarInicio >= 0) {
  const marcarFim = source.indexOf("\n  };", marcarInicio);
  if (marcarFim < 0) throw new Error("NeoCooler: função marcarCortado não encontrada.");
  const marcarNovo = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const destino = precisaCosturaAntesSublimacao(produtoNome) ? "aguardando_costura" : "aguardando_sublimacao";\n    const novo = {\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: destino,\n      origemPreCorte: true,\n      cortador: "Patrick",\n      dataCorte: f.data || hoje(),\n      criadoEm: Date.now(),\n    };\n    salvar([...itens, novo]);\n    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restante - qtdNum, data: f.data } }));\n  };`;
  source = source.slice(0, marcarInicio) + marcarNovo + source.slice(marcarFim + "\n  };".length);
  log("confirmação de corte direcionada para a próxima etapa.");
}

// 3) Se ainda houver a função antiga Corte -> Sublimação, ela passa a respeitar a regra.
const moverInicio = source.indexOf("  const moverParaAguardandoSublimacao = (pedidoNum, produtoNome) => {");
if (moverInicio >= 0) {
  const moverFim = source.indexOf("\n  };", moverInicio);
  if (moverFim >= 0) {
    const moverNovo = `  const moverParaAguardandoSublimacao = (pedidoNum, produtoNome) => {\n    salvar(itens.map((i) => {\n      if (i.etapa !== "corte" || i.pedido !== pedidoNum || i.produto !== produtoNome) return i;\n      return { ...i, etapa: precisaCosturaAntesSublimacao(i.produto) ? "aguardando_costura" : "aguardando_sublimacao" };\n    }));\n  };`;
    source = source.slice(0, moverInicio) + moverNovo + source.slice(moverFim + "\n  };".length);
  }
}

// 4) Costura concluída: as toalhas especiais retornam para Aguardando Sublimação.
const sepInicio = source.indexOf("  const moverPedidoParaSeparacao = (numero) => {");
if (sepInicio >= 0) {
  const sepFim = source.indexOf("\n  };", sepInicio);
  if (sepFim >= 0) {
    const sepNovo = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => {\n      if (i.pedido !== numero || i.etapa !== "costura") return i;\n      return precisaCosturaAntesSublimacao(i.produto)\n        ? { ...i, etapa: "aguardando_sublimacao", feito: false, conferido: false }\n        : { ...i, etapa: "separacao", feito: false, conferido: false };\n    }));\n  };`;
    source = source.slice(0, sepInicio) + sepNovo + source.slice(sepFim + "\n  };".length);
  }
}

// 5) Remover Corte da interface de forma estrutural, independentemente dos patches anteriores.
source = source.replace(/,\s*"corte"(?=,\s*"aguardando_sublimacao")/g, "");
source = source.replace(/\n\s*corte:\s*"Corte",/g, "");
source = source.replace(/\n\s*<Stat label="corte" value=\{totalCorte\} \/>/g, "");
source = source.replace(/\n\s*\{ id: "corte", label: "Corte", contagem: totalCorte \},/g, "");

// Remove o bloco visual da antiga aba Corte, se algum patch anterior o tiver deixado.
const corteBlockStart = '        {loaded && aba === "corte" && (';
const corteBlockEnd = '        {loaded && aba === "aguardando_sublimacao" && (';
const visualStart = source.indexOf(corteBlockStart);
const visualEnd = source.indexOf(corteBlockEnd, visualStart);
if (visualStart >= 0 && visualEnd > visualStart) {
  source = source.slice(0, visualStart) + source.slice(visualEnd);
  log("bloco visual da aba Corte removido.");
}

source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");
source = source.replaceAll("o item passa para a aba Corte", "o item passa diretamente para a próxima etapa");
source = source.replaceAll("Mova itens pela aba Corte.", "Os itens entram automaticamente na próxima etapa quando Patrick confirma o corte.");

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("Fluxo sem Corte finalizado; 11089 e regras especiais migrados.");
} else {
  log("Nenhuma alteração necessária.");
}
