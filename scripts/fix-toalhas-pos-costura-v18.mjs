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

// Migra registros antigos: toalhas que já chegaram à Separação sem concluir a
// sublimação pós-costura retornam uma única vez para Aguardando Sublimação.
if (!source.includes("V18_MIGRACAO_TOALHAS_SEPARACAO")) {
  const loadedAnchor = '  const [loaded, setLoaded] = useState(false);';
  const efeito = `\n\n  // V18_MIGRACAO_TOALHAS_SEPARACAO\n  useEffect(() => {\n    if (!loaded || !Array.isArray(itens) || !itens.length) return;\n    const corrigidos = itens.map((i) => {\n      const toalha = produtoToalhaPosCosturaV18(i.produto);\n      if (!toalha || i.etapa !== "separacao" || i.sublimacaoPosCosturaConcluida === true) return i;\n      return { ...i, etapa: "aguardando_sublimacao", aguardaSublimacaoPosCostura: true };\n    });\n    if (JSON.stringify(corrigidos) !== JSON.stringify(itens)) {\n      setItens(corrigidos);\n      salvarValor(STORAGE_KEY, JSON.stringify(corrigidos)).catch(() => {});\n    }\n  }, [loaded]);\n`;
  if (!source.includes(loadedAnchor)) throw new Error("V18: estado loaded não encontrado.");
  source = source.replace(loadedAnchor, loadedAnchor + efeito);
}

// Quando a sublimação pós-costura for enviada para Aguardando Costura,
// marca que o retorno já foi concluído. Trata tanto lote inteiro quanto parcial.
if (!source.includes("V18_MARCA_SUBLIMACAO_POS_COSTURA")) {
  source = source.replace(
    'const moverParaAguardandoCostura = (id) => {',
    '/* V18_MARCA_SUBLIMACAO_POS_COSTURA */\n  const moverParaAguardandoCostura = (id) => {'
  );
  source = source.replace(
    'i.id === id ? { ...i, etapa: "aguardando_costura" } : i',
    'i.id === id ? { ...i, etapa: "aguardando_costura", ...(produtoToalhaPosCosturaV18(i.produto) ? { aguardaSublimacaoPosCostura: false, sublimacaoPosCosturaConcluida: true } : {}) } : i'
  );
  source = source.replace(
    'etapa: "aguardando_costura",\n        criadoEm: Date.now(),',
    'etapa: "aguardando_costura",\n        ...(produtoToalhaPosCosturaV18(item.produto) ? { aguardaSublimacaoPosCostura: false, sublimacaoPosCosturaConcluida: true } : {}),\n        criadoEm: Date.now(),'
  );
}

// Costura -> próximo destino: toalhas retornam para Aguardando Sublimação na primeira passagem;
// depois da segunda sublimação seguem normalmente para Separação.
const oldSeparacao = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => (i.pedido === numero && i.etapa === "costura" ? { ...i, etapa: "separacao" } : i)));\n  };`;
const newSeparacao = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => {\n      if (i.pedido !== numero || i.etapa !== "costura") return i;\n      if (produtoToalhaPosCosturaV18(i.produto) && i.sublimacaoPosCosturaConcluida !== true) {\n        return { ...i, etapa: "aguardando_sublimacao", aguardaSublimacaoPosCostura: true };\n      }\n      return { ...i, etapa: "separacao" };\n    }));\n  };`;
if (source.includes(oldSeparacao)) source = source.replace(oldSeparacao, newSeparacao);

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("V18 aplicado: TOALHA C/ CAPUZ G/M retornam para Aguardando Sublimação após a primeira Costura; registros antigos em Separação também são corrigidos; após a segunda Sublimação seguem para Separação sem loop.");
} else {
  log("V18: nenhuma alteração necessária.");
}
