import fs from "node:fs";

const path = "src/NeoTopBar.jsx";
let source = fs.readFileSync(path, "utf8");
let alterado = false;

const nav = /\s*<nav className="neo-stage-nav"[\s\S]*?<\/nav>/;
if (nav.test(source)) {
  source = source.replace(nav, "");
  alterado = true;
}

source = source.replace(/\.neo-brand\{[^}]*\}/, ".neo-brand{display:flex;align-items:center;gap:8px;flex:0 0 auto;color:#17283d}");
source = source.replace(/\.neo-topbar\{([^}]*)\}/, (m, body) => {
  if (body.includes("justify-content:center")) return m;
  return `.neo-topbar{${body}justify-content:center}`;
});
source = source.replace(/\.neo-search\{position:relative;flex:0 0 230px\}/, ".neo-search{position:relative;flex:0 1 430px;min-width:180px}");

if (alterado) fs.writeFileSync(path, source, "utf8");
console.log(`NeoCooler: barra superior ${alterado ? "simplificada para rastreamento" : "já simplificada"}.`);
