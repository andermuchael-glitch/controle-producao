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
const helperMarker = "// FLUXO_TOALHAS_COSTURA_V3";

// Helper primeiro: as migrações abaixo usam esta função.
if (!source.includes(helperMarker)) {
  const anchor = 'const CORTADORES = ["Patrick"];';
  if (!source.includes(anchor)) throw new Error("NeoCooler: âncora dos cortadores não encontrada.");
  const helper = `${anchor}\n\n${helperMarker}\nconst PRODUTOS_COSTURA_ANTES_SUBLIMACAO = ${JSON.stringify(PRODUTOS_COSTURA_ANTES_SUBLIMACAO)};\nconst precisaCosturaAntesSublimacao = (produtoNome) => PRODUTOS_COSTURA_ANTES_SUBLIMACAO.includes(String(produtoNome || "").trim().toUpperCase());`;
  source = source.replace(anchor, helper);
}

// Garante os dois produtos adicionais no cadastro.
for (const produto of ["TOALHA 80X30", "TOALHA PERSONALIZADO 70X40"]) {
  if (!source.includes(`"${produto}"`)) {
    source = source.replace("const PRODUTOS = [", `const PRODUTOS = ["${produto}",`);
  }
}

// Corrige a migração de dados antigos do carregamento. Este caso é importante:
// a versão anterior já tinha convertido Corte -> Aguardando Sublimação antes
// de a regra especial das toalhas ser aplicada. Aqui fazemos a decisão final.
const etapaLineRegex = /etapa:\s*i\.etapa\s*===\s*["']corte["']\s*\?\s*[^,]+,/;
const etapaLineReplacement = 'etapa: i.etapa === "corte" ? ((String(i.pedido) === "11089" || precisaCosturaAntesSublimacao(i.produto)) ? "aguardando_costura" : "aguardando_sublimacao") : (i.etapa || "costura"),';
if (etapaLineRegex.test(source)) {
  source = source.replace(etapaLineRegex, etapaLineReplacement);
} else if (source.includes('etapa: i.etapa || "costura",')) {
  source = source.replace('etapa: i.etapa || "costura",', etapaLineReplacement);
}

// Migração persistente em runtime. Além de itens que ainda estão em Corte,
// corrige o 11089 mesmo se algum build anterior já o tiver colocado em
// Aguardando Sublimação. Não cria duplicação: somente altera etapa.
const runtimeMarker = "// MIGRACAO_11089_RUNTIME_V3";
if (!source.includes(runtimeMarker)) {
  const anchor = '    const cancelarItens = inscrever(STORAGE_KEY, (raw, erroSnap) => {\n';
  if (!source.includes(anchor)) throw new Error("NeoCooler: bloco de inscrição dos itens não encontrado.");
  const oldBlock = `    const cancelarItens = inscrever(STORAGE_KEY, (raw, erroSnap) => {\n      if (erroSnap) {\n        setErro("Não foi possível conectar ao Firebase. Verifique as chaves no .env.");\n      } else if (raw) {\n        try {\n          const carregados = JSON.parse(raw);\n          const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa || "costura",\n            equipe: i.equipe || "Não decidido",\n            feito: i.feito ?? false,\n            conferido: i.conferido ?? false,\n          }));\n          setItens(migrados);\n        } catch (e) {}\n      }`;
  const newBlock = `    ${runtimeMarker}\n    const cancelarItens = inscrever(STORAGE_KEY, (raw, erroSnap) => {\n      if (erroSnap) {\n        setErro("Não foi possível conectar ao Firebase. Verifique as chaves no .env.");\n      } else if (raw) {\n        try {\n          const carregados = JSON.parse(raw);\n          let migracaoFeita = false;\n          const migrados = carregados.map((i) => {\n            const etapaAntiga = i.etapa;\n            let etapaNova = i.etapa || "costura";\n            // 11089 está explicitamente na regra especial.\n            if (String(i.pedido) === "11089") etapaNova = "aguardando_costura";\n            else if (etapaAntiga === "corte") etapaNova = precisaCosturaAntesSublimacao(i.produto) ? "aguardando_costura" : "aguardando_sublimacao";\n            if (etapaNova !== etapaAntiga) migracaoFeita = true;\n            return {\n              ...i,\n              etapa: etapaNova,\n              equipe: i.equipe || "Não decidido",\n              feito: i.feito ?? false,\n              conferido: i.conferido ?? false,\n            };\n          });\n          setItens(migrados);\n          if (migracaoFeita) salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});\n        } catch (e) {}\n      }`;
  if (source.includes(oldBlock)) source = source.replace(oldBlock, newBlock);
  else throw new Error("NeoCooler: estrutura esperada do carregamento mudou; migração runtime não foi aplicada.");
}

// Patrick confirma o que realmente cortou: sem etapa Corte.
const marcarRegex = /  const marcarCortado = \(pedidoNum, produtoNome, restante\) => \{[\s\S]*?\n  \};/;
const marcarNovo = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {\n    const f = getCorteForm(pedidoNum, produtoNome, restante);\n    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));\n    const destino = precisaCosturaAntesSublimacao(produtoNome) ? "aguardando_costura" : "aguardando_sublimacao";\n    const novo = {\n      id: uid(),\n      pedido: pedidoNum,\n      produto: produtoNome,\n      qtd: qtdNum,\n      etapa: destino,\n      origemPreCorte: true,\n      cortador: "Patrick",\n      dataCorte: f.data || hoje(),\n      criadoEm: Date.now(),\n    };\n    salvar([...itens, novo]);\n    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restante - qtdNum, data: f.data } }));\n  };`;
if (marcarRegex.test(source)) source = source.replace(marcarRegex, marcarNovo);

// Ao concluir a Costura, as quatro toalhas retornam para Aguardando Sublimação.
const moverRegex = /  const moverPedidoParaSeparacao = \(numero\) => \{[\s\S]*?\n  \};/;
const moverNovo = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => {\n      if (i.pedido !== numero || i.etapa !== "costura") return i;\n      return precisaCosturaAntesSublimacao(i.produto)\n        ? { ...i, etapa: "aguardando_sublimacao", feito: false, conferido: false }\n        : { ...i, etapa: "separacao", feito: false, conferido: false };\n    }));\n  };`;
if (moverRegex.test(source)) source = source.replace(moverRegex, moverNovo);

// Remove Corte do layout.
source = source.replace('  corte: "Corte",\n', '');
source = source.replace(/\s*<Stat label=["']corte["'] value=\{totalCorte\} \/>/g, "");
source = source.replace(/\s*\{\s*id:\s*["']corte["'],\s*label:\s*["']Corte["'],\s*contagem:\s*\{totalCorte\}\s*\},/g, "");
const corteBlockStart = '        {loaded && aba === "corte" && (\n';
const corteBlockEnd = '        {loaded && aba === "aguardando_sublimacao" && (\n';
const start = source.indexOf(corteBlockStart);
const end = source.indexOf(corteBlockEnd, start + corteBlockStart.length);
if (start >= 0 && end > start) source = source.slice(0, start) + source.slice(end);

source = source.replaceAll("Corte → Costura", "Pré-Corte → Sublimação → Costura");
source = source.replaceAll("Do corte até a expedição, pedido por pedido", "Do pré-corte até a expedição, pedido por pedido");
source = source.replaceAll("Mova itens pela aba Corte.", "Os itens entram automaticamente na próxima etapa quando Patrick confirma o corte.");

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("Migração 11089 persistente aplicada e etapa Corte removida.");
} else {
  log("Nenhuma alteração necessária.");
}
