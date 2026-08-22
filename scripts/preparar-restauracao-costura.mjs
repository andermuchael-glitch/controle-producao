import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// O restaurador de costura usa moverParaAguardandoCostura como âncora.
// Alguns scripts anteriores do build podem reconstruir o trecho e remover
// essa função. Recrie a âncora mínima antes de executar o restaurador.
const anchor = '  const moverParaAguardandoCostura = (id) =>';
if (!source.includes(anchor)) {
  const fallbackAnchor = '  const moverParaCostura = (id) =>';
  const pos = source.indexOf(fallbackAnchor);
  if (pos === -1) {
    throw new Error("Não foi possível preparar a restauração de costura: âncora de movimentação não encontrada.");
  }
  source = source.slice(0, pos) + `${anchor} salvar(itens.map((i) => i.id === id ? { ...i, etapa: "aguardando_costura" } : i));\n` + source.slice(pos);
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: âncora moverParaAguardandoCostura recriada antes da restauração.");
} else {
  console.log("NeoCooler: âncora moverParaAguardandoCostura já presente.");
}

await import("./restaurar-cores-costura.mjs");
