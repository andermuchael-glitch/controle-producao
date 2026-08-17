import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("DIRECT_TO_SEPARACAO_V1")) process.exit(0);

const marker = 'const ETAPA_LABEL = {';
const directConst = `const DIRECT_TO_SEPARACAO_V1 = new Set(["PORTA COPOS", "MOUSEPAD PADRÃO", "MOUSEPAD GAMER"]);\n`;
if (!source.includes(directConst)) {
  if (!source.includes(marker)) throw new Error("NeoCooler: marcador ETAPA_LABEL não encontrado.");
  source = source.replace(marker, directConst + marker);
}

const oldA = `  const moverParaAguardandoCostura = (id) => {\n    salvar(itens.map((i) => (i.id === id ? { ...i, etapa: "aguardando_costura" } : i)));\n  };`;
const newA = `  const moverParaAguardandoCostura = (id) => {\n    salvar(itens.map((i) => {\n      if (i.id !== id) return i;\n      const etapaDestino = DIRECT_TO_SEPARACAO_V1.has(i.produto) ? "separacao" : "aguardando_costura";\n      return { ...i, etapa: etapaDestino };\n    }));\n  };`;
if (source.includes(oldA)) source = source.replace(oldA, newA);

const oldB = `  const moverParaCostura = (id) => {\n    salvar(itens.map((i) => (i.id === id ? { ...i, etapa: "costura" } : i)));\n  };`;
const newB = `  const moverParaCostura = (id) => {\n    salvar(itens.map((i) => {\n      if (i.id !== id) return i;\n      const etapaDestino = DIRECT_TO_SEPARACAO_V1.has(i.produto) ? "separacao" : "costura";\n      return { ...i, etapa: etapaDestino };\n    }));\n  };`;
if (source.includes(oldB)) source = source.replace(oldB, newB);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: Porta Copos, Mousepad Padrão e Mousepad Gamer passam diretamente para Separação.");
