import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const importLine = 'import NeoTopBar from "./NeoTopBar.jsx";';
if (!source.includes(importLine)) {
  const anchor = 'import { firebaseConfigurado } from "./firebase.js";';
  if (!source.includes(anchor)) throw new Error("NeoCooler: âncora de imports não encontrada.");
  source = source.replace(anchor, `${anchor}\n${importLine}`);
}

if (!source.includes("<NeoTopBar ")) {
  const anchor = '    <div style={styles.page}>';
  const topbar = `    <div style={styles.page}>
      <NeoTopBar
        etapas={ABAS}
        aba={aba}
        setAba={setAba}
        itens={itens}
        pedidosMeta={pedidosMeta}
        filtroPedido={filtroPedido}
        setFiltroPedido={setFiltroPedido}
      />`;
  if (!source.includes(anchor)) throw new Error("NeoCooler: âncora da página não encontrada.");
  source = source.replace(anchor, topbar);
}

source = source.replaceAll(
  '<section style={styles.listWrap}>',
  '<section style={styles.listWrap} className="neo-board">'
);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: barra superior e quadros aplicados sem alterar a estrutura de dados.");
