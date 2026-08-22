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
  ],
  [
    "marcar-cortado-direto-aguardando-sublimacao",
    '      etapa: "corte",\n      cortador: "Patrick",',
    '      etapa: "aguardando_sublimacao",\n      cortador: "Patrick",'
  ],
  [
    "texto-pre-corte-sem-aba-corte",
    'Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa para a aba Corte.',
    'Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa diretamente para Aguardando Sublimação.'
  ],
  [
    "texto-aguardando-sem-aba-corte",
    'Nada aguardando sublimação. Mova itens pela aba Corte.',
    'Nada aguardando sublimação. Marque os itens como cortados no Pré-Corte.'
  ],
  [
    "remover-corte-do-migrador-de-aguardando",
    'if (it.etapa === "corte" || it.etapa === "aguardando_sublimacao") continue;',
    'if (it.etapa === "corte" || it.etapa === "aguardando_sublimacao") continue;'
  ]
];

let changed = false;
for (const [name, from, to] of fixes) {
  if (source.includes(from) && from !== to) {
    source = source.replace(from, to);
    changed = true;
    console.log(`NeoCooler: correção ${name} aplicada.`);
  }
}

// Garantia estrutural: mesmo que uma versão futura do código reintroduza a aba Corte,
// ela não deve aparecer na navegação principal.
source = source.replace(/\n\s*\{ id: "corte", label: "Corte", contagem: totalCorte \},/g, "");

if (changed) fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: preparação do build concluída.");
