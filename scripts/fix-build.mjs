import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const fixes = [
  [
    "limparTudo",
    'setConfirmarLimpeza(false);const exportarXLSX = () => {',
    'setConfirmarLimpeza(false);\n  };\n\n  const exportarXLSX = () => {'
  ],
  [
    "cabecalho-fluxo-sem-corte",
    '<h1 style={styles.title}>Corte → Costura</h1>',
    '<h1 style={styles.title}>Pré-Corte → Sublimação → Costura</h1>'
  ],
  [
    "subtitulo-fluxo-sem-corte",
    'Do corte até a expedição, pedido por pedido',
    'Do pré-corte até a expedição, pedido por pedido'
  ],
  [
    "remover-contador-corte",
    '            <Stat label="corte" value={totalCorte} />\n',
    ''
  ],
  [
    "remover-aba-corte",
    '    { id: "corte", label: "Corte", contagem: totalCorte },\n',
    ''
  ],
  [
    "migrar-itens-legados-de-corte",
    '            etapa: i.etapa || "costura",',
    '            etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "costura"),'
  ]
];

let changed = false;
for (const [name, from, to] of fixes) {
  if (source.includes(from)) {
    source = source.replace(from, to);
    changed = true;
    console.log(`NeoCooler: correção ${name} aplicada.`);
  }
}

if (changed) fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: preparação do build concluída.");
