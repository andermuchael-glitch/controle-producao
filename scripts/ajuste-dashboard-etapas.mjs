import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");
let alterado = false;

// A navegação das etapas fica nos cartões azuis. A barra superior continua apenas com o rastreamento global.
const antigo = `          <div style={styles.stats} className="stats-row">\n            <Stat label="pré-corte" value={totalPreCorte} />\n            <Stat label="corte" value={totalCorte} />\n            <Stat label="aguard. sublimação" value={totalAguardandoSublimacao} />\n            <Stat label="sublimação" value={totalSublimacao} />\n            <Stat label="pedidos costura" value={totalCosturaAberto} />\n          </div>`;

const novo = `          <div style={styles.stats} className="stats-row etapas-cards">\n            <button type="button" className={\`etapa-card azul-etapa \${aba === "pre_corte" ? "etapa-card-ativa" : ""}\`} onClick={() => setAba("pre_corte")}>\n              <strong>{totalPreCorte}</strong><span>Pré-Corte</span>\n            </button>\n            <button type="button" className={\`etapa-card azul-etapa \${aba === "corte" ? "etapa-card-ativa" : ""}\`} onClick={() => setAba("corte")}>\n              <strong>{totalCorte}</strong><span>Corte</span>\n            </button>\n            <button type="button" className={\`etapa-card azul-etapa \${aba === "aguardando_sublimacao" ? "etapa-card-ativa" : ""}\`} onClick={() => setAba("aguardando_sublimacao")}>\n              <strong>{totalAguardandoSublimacao}</strong><span>Aguardando Sublimação</span>\n            </button>\n            <button type="button" className={\`etapa-card azul-etapa \${aba === "sublimacao" ? "etapa-card-ativa" : ""}\`} onClick={() => setAba("sublimacao")}>\n              <strong>{totalSublimacao}</strong><span>Sublimação</span>\n            </button>\n            <button type="button" className={\`etapa-card azul-etapa \${aba === "aguardando_costura" ? "etapa-card-ativa" : ""}\`} onClick={() => setAba("aguardando_costura")}>\n              <strong>{totalAguardando}</strong><span>Aguardando Costura</span>\n            </button>\n            <button type="button" className={\`etapa-card azul-etapa \${aba === "costura" ? "etapa-card-ativa" : ""}\`} onClick={() => setAba("costura")}>\n              <strong>{totalCosturaAberto}</strong><span>Pedidos Costura</span>\n            </button>\n            <button type="button" className={\`etapa-card azul-etapa \${aba === "separacao" ? "etapa-card-ativa" : ""}\`} onClick={() => setAba("separacao")}>\n              <strong>{totalSeparacaoPend}</strong><span>Separação</span>\n            </button>\n          </div>`;

if (source.includes(antigo)) {
  source = source.replace(antigo, novo);
  alterado = true;
}

const estiloAntigo = `        @media (max-width: 640px) {`;
const estiloNovo = `        .etapas-cards{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px!important;margin-top:10px}.etapa-card{border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:10px 9px;text-align:left;cursor:pointer;font-family:inherit;min-height:68px;transition:.15s ease}.azul-etapa{background:#263c53;color:#fff;box-shadow:none}.azul-etapa:hover{background:#2d465f;transform:translateY(-1px)}.etapa-card-ativa{background:#e7662b!important;border-color:#e7662b!important;box-shadow:0 4px 12px rgba(0,0,0,.16)}.etapa-card strong{display:block;font-size:22px;line-height:1.05}.etapa-card span{display:block;margin-top:5px;color:#bdc8d3;font-size:11px;line-height:1.15}.etapa-card-ativa span{color:#fff}.etapa-card:focus-visible{outline:3px solid rgba(255,255,255,.5);outline-offset:2px}\n\n        @media (max-width: 640px) {`;
if (source.includes(estiloAntigo) && !source.includes(".etapas-cards{display:grid")) {
  source = source.replace(estiloAntigo, estiloNovo);
  alterado = true;
}

if (alterado) fs.writeFileSync(path, source, "utf8");
console.log(`NeoCooler: cartões de todas as etapas ${alterado ? "aplicados" : "já estavam aplicados"}.`);
