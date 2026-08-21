import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

const TOALHAS = new Set(["TOALHA C/ CAPUZ G", "TOALHA C/ CAPUZ M"]);
const helperAnchor = 'const AUDIT_ADMIN_EMAIL = "andermuchael@gmail.com";';
if (!source.includes("FLUXO_TOALHAS_POS_COSTURA_V18")) {
  const helper = `\n\n// FLUXO_TOALHAS_POS_COSTURA_V18\nconst produtoToalhaPosCosturaV18 = (nome) => TOALHAS.has(String(nome || "").trim().toUpperCase());\n`;
  if (!source.includes(helperAnchor)) throw new Error("V18: âncora de configuração não encontrada.");
  source = source.replace(helperAnchor, helperAnchor + helper);
}

// Corrige registros antigos: toalhas que chegaram à Separação sem concluir a segunda sublimação
// voltam para Aguardando Sublimação apenas uma vez. Depois da sublimação, a flag é encerrada.
const oldLoad = `          const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa || "costura",\n            equipe: i.equipe || "Não decidido",\n            feito: i.feito ?? false,\n            conferido: i.conferido ?? false,\n          }));\n          setItens(migrados);`;
const newLoad = `          const migrados = carregados.map((i) => {\n            const toalha = produtoToalhaPosCosturaV18(i.produto);\n            const precisaRetorno = toalha && i.etapa === "separacao" && i.sublimacaoPosCosturaConcluida !== true;\n            return {\n              ...i,\n              etapa: precisaRetorno ? "aguardando_sublimacao" : (i.etapa || "costura"),\n              aguardaSublimacaoPosCostura: precisaRetorno ? true : (i.aguardaSublimacaoPosCostura ?? false),\n              equipe: i.equipe || "Não decidido",\n              feito: i.feito ?? false,\n              conferido: i.conferido ?? false,\n            };\n          });\n          setItens(migrados);\n          if (JSON.stringify(migrados) !== JSON.stringify(carregados)) salvarValor(STORAGE_KEY, JSON.stringify(migrados)).catch(() => {});`;
if (source.includes(oldLoad)) source = source.replace(oldLoad, newLoad);

// Depois da sublimação, ao entrar em Aguardando Costura, marca a segunda sublimação como concluída.
const oldAwaitCostura = `  const moverParaAguardandoCostura = (id) => {`;
if (source.includes(oldAwaitCostura) && !source.includes("sublimacaoPosCosturaConcluida: true")) {
  const pattern = /  const moverParaAguardandoCostura = \(id\) => \{[\s\S]*?\n  \};/;
  const match = source.match(pattern);
  if (match) {
    const bloco = match[0];
    const corrigido = bloco.replace(
      'etapa: "aguardando_costura"',
      'etapa: "aguardando_costura",\n        ...(produtoToalhaPosCosturaV18(item.produto) ? { aguardaSublimacaoPosCostura: false, sublimacaoPosCosturaConcluida: true } : {})'
    );
    source = source.replace(bloco, corrigido);
  }
}

// Costura -> próximo destino: toalhas vão para Aguardando Sublimação na primeira passagem;
// os demais produtos continuam indo para Separação. Depois da segunda sublimação, as toalhas seguem normalmente.
const oldSeparacao = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => (i.pedido === numero && i.etapa === "costura" ? { ...i, etapa: "separacao" } : i)));\n  };`;
const newSeparacao = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => {\n      if (i.pedido !== numero || i.etapa !== "costura") return i;\n      if (produtoToalhaPosCosturaV18(i.produto) && i.sublimacaoPosCosturaConcluida !== true) {\n        return { ...i, etapa: "aguardando_sublimacao", aguardaSublimacaoPosCostura: true };\n      }\n      return { ...i, etapa: "separacao" };\n    }));\n  };`;
if (source.includes(oldSeparacao)) source = source.replace(oldSeparacao, newSeparacao);

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("V18 aplicado: TOALHA C/ CAPUZ G/M retornam para Aguardando Sublimação após a primeira Costura; após a segunda Sublimação seguem para Separação sem loop.");
} else {
  log("V18: nenhuma alteração necessária.");
}
