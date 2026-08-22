import fs from "node:fs";

const path = "scripts/restaurar-cores-costura.mjs";
let source = fs.readFileSync(path, "utf8");
if (source.includes("COSTURA_ANCHOR_V2")) process.exit(0);

const old = `  const anchor = '  const moverParaAguardandoCostura = (id) =>';\n  const pos = source.indexOf(anchor);\n  if (pos === -1) throw new Error("Função moverParaAguardandoCostura não encontrada.");\n  const end = source.indexOf('\\n  };', pos);`;

if (!source.includes(old)) throw new Error("Trecho antigo da âncora de Costura não encontrado no restaurador.");

const replacement = `  // COSTURA_ANCHOR_V2\n  // Não depender de moverParaAguardandoCostura: outros restauradores podem recriar esse trecho.\n  // Inserimos os helpers antes de removerItem, que é uma âncora estável do App.jsx.\n  const anchor = '  const removerItem = (id) =>';\n  const pos = source.indexOf(anchor);\n  if (pos === -1) throw new Error("Âncora removerItem não encontrada no App.jsx.");\n  const end = pos;`;

source = source.replace(old, replacement);
// O código original usa end + 4 para inserir depois de um `};`. Como agora\n// queremos inserir exatamente antes da âncora, ajustamos a expressão abaixo.\nsource = source.replace('source = source.slice(0, end + 4) + helper + source.slice(end + 4);', 'source = source.slice(0, end) + helper + source.slice(end);');
fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: âncora da restauração de Costura corrigida para V2.");
