import fs from "node:fs";

const file = "src/App.jsx";
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

// Migra registros antigos que ainda estejam na etapa Corte.
source = source.replace(
  'etapa: i.etapa || "costura",',
  'etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "costura"),'
);

// O que Patrick confirma como cortado vai diretamente para Aguardando Sublimação.
source = source.replace(
  'etapa: "corte",\n      cortador: "Patrick",',
  'etapa: "aguardando_sublimacao",\n      cortador: "Patrick",'
);

// Remove Corte do conjunto de etapas do layout.
source = source.replace(
  'const ETAPAS = ["pre_corte", "corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];',
  'const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];'
);
source = source.replace('  corte: "Corte",\n', '');
source = source.replace('            <Stat label="corte" value={totalCorte} />\n', '');

// Remove a aba Corte.
source = source.replace(
  '    { id: "corte", label: "Corte", contagem: totalCorte },\n',
  ''
);

// Remove o bloco visual inteiro da antiga aba Corte.
const startMarker = '        {loaded && aba === "corte" && (\n';
const endMarker = '        {loaded && aba === "aguardando_sublimacao" && (\n';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);
if (start >= 0 && end > start) source = source.slice(0, start) + source.slice(end);

source = source.replaceAll('Corte → Costura', 'Pré-Corte → Sublimação → Costura');
source = source.replaceAll('Do corte até a expedição, pedido por pedido', 'Do pré-corte até a expedição, pedido por pedido');
source = source.replaceAll('o item passa para a aba Corte.', 'o item passa diretamente para Aguardando Sublimação.');
source = source.replaceAll('Mova itens pela aba Corte.', 'Os itens entram aqui automaticamente quando Patrick confirma o corte.');

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("fluxo sem etapa Corte confirmado no build.");
} else {
  log("fluxo sem etapa Corte já estava aplicado.");
}
