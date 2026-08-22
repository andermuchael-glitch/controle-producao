import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// O restaurador de costura precisa da função moverParaAguardandoCostura
// apenas como ponto de inserção. Não dependemos mais de outra função para
// localizar essa posição: usamos uma âncora estável que existe no App.
const anchor = '  const moverParaAguardandoCostura = (id) =>';
if (!source.includes(anchor)) {
  const anchors = [
    '  const removerItem = (id) =>',
    '  const setEquipeItem = (id, equipe) =>',
    '  const toggleConferido = (id) =>',
    '  const toggleFeito = (id) =>',
    '  const getItensDataEntrega = (numero) =>',
  ];
  const fallback = anchors.find((a) => source.includes(a));
  if (!fallback) {
    throw new Error("Não foi possível preparar a restauração de costura: nenhuma âncora estável encontrada no App.jsx.");
  }
  const pos = source.indexOf(fallback);
  const fn = `${anchor} salvar(itens.map((i) => i.id === id ? { ...i, etapa: "aguardando_costura" } : i));\n`;
  source = source.slice(0, pos) + fn + source.slice(pos);
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: âncora moverParaAguardandoCostura criada com fallback estável.");
} else {
  console.log("NeoCooler: âncora moverParaAguardandoCostura já presente.");
}

await import("./restaurar-cores-costura.mjs");
