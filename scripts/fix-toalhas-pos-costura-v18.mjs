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

// Migração independente do formato do carregamento anterior: corrige imediatamente
// toalhas que já estejam em Separação sem ter concluído a sublimação pós-costura.
if (!source.includes("V18_MIGRACAO_TOALHAS_SEPARACAO")) {
  const loadedAnchor = '  const [loaded, setLoaded] = useState(false);';
  const efeito = `\n\n  // V18_MIGRACAO_TOALHAS_SEPARACAO\n  useEffect(() => {\n    if (!loaded || !Array.isArray(itens) || !itens.length) return;\n    const corrigidos = itens.map((i) => {\n      const toalha = produtoToalhaPosCosturaV18(i.produto);\n      if (!toalha || i.etapa !== "separacao" || i.sublimacaoPosCosturaConcluida === true) return i;\n      return { ...i, etapa: "aguardando_sublimacao", aguardaSublimacaoPosCostura: true };\n    });\n    if (JSON.stringify(corrigidos) !== JSON.stringify(itens)) {\n      setItens(corrigidos);\n      salvarValor(STORAGE_KEY, JSON.stringify(corrigidos)).catch(() => {});\n    }\n  }, [loaded]);\n`;
  if (!source.includes(loadedAnchor)) throw new Error("V18: estado loaded não encontrado.");
  source = source.replace(loadedAnchor, loadedAnchor + efeito);
}

// Depois da sublimação pós-costura, ao entrar em Aguardando Costura, encerra o retorno.
if (!source.includes("sublimacaoPosCosturaConcluida: true")) {
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

// Costura -> próximo destino: toalhas voltam para Aguardando Sublimação na primeira passagem.
const oldSeparacao = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => (i.pedido === numero && i.etapa === "costura" ? { ...i, etapa: "separacao" } : i)));\n  };`;
const newSeparacao = `  const moverPedidoParaSeparacao = (numero) => {\n    salvar(itens.map((i) => {\n      if (i.pedido !== numero || i.etapa !== "costura") return i;\n      if (produtoToalhaPosCosturaV18(i.produto) && i.sublimacaoPosCosturaConcluida !== true) {\n        return { ...i, etapa: "aguardando_sublimacao", aguardaSublimacaoPosCostura: true };\n      }\n      return { ...i, etapa: "separacao" };\n    }));\n  };`;
if (source.includes(oldSeparacao)) source = source.replace(oldSeparacao, newSeparacao);

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("V18 aplicado: TOALHA C/ CAPUZ G/M retornam para Aguardando Sublimação após a primeira Costura; registros antigos em Separação também são corrigidos; após a segunda Sublimação seguem para Separação sem loop.");
} else {
  log("V18: nenhuma alteração necessária.");
}
