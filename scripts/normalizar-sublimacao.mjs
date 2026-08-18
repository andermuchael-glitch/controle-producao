import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
let alterado = false;

const antigo = `          const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa || "costura",\n            equipe: i.equipe || "Não decidido",\n            feito: i.feito ?? false,\n            conferido: i.conferido ?? false,\n          }));\n          setItens(migrados);`;

const novo = `          const migrados = carregados.map((i) => ({\n            ...i,\n            etapa: i.etapa || "costura",\n            equipe: i.equipe || "Não decidido",\n            feito: i.feito ?? false,\n            conferido: i.conferido ?? false,\n          }));\n\n          // Consolida registros de sublimação que representam o mesmo lote.\n          // Assim, 1 + 1 + 1 peças da mesma cor não ficam como vários registros.\n          const mapaSublimacao = new Map();\n          const normalizados = [];\n          for (const item of migrados) {\n            if (item.etapa !== "sublimacao") {\n              normalizados.push(item);\n              continue;\n            }\n            const chave = [\n              item.pedido,\n              item.produto,\n              item.cor || "",\n              item.sublimador || SUBLIMADORES[0],\n              item.dataSublimacao || "",\n            ].join("||");\n            const existente = mapaSublimacao.get(chave);\n            if (existente) {\n              existente.qtd += Number(item.qtd) || 0;\n            } else {\n              const copia = { ...item, sublimador: item.sublimador || SUBLIMADORES[0] };\n              mapaSublimacao.set(chave, copia);\n              normalizados.push(copia);\n            }\n          }\n          if (normalizados.length !== migrados.length) {\n            salvarValor(STORAGE_KEY, JSON.stringify(normalizados));\n          }\n          setItens(normalizados);`;

if (source.includes(antigo)) {
  source = source.replace(antigo, novo);
  alterado = true;
  console.log("NeoCooler: normalização de registros duplicados aplicada.");
} else {
  console.log("NeoCooler: alvo da normalização não encontrado; nada alterado.");
}

if (alterado) fs.writeFileSync(path, source, "utf8");
