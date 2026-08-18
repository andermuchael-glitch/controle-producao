import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const antigo = `{p.itens.map((it) => (\n                      <div key={it.id} style={styles.itemLinha} className="item-linha">\n                        <span style={{ ...styles.swatchSm, background: corHex(it.cor) }} />\n                        <span style={styles.itemTexto}>{it.produto} <b>· {it.cor}</b> · {it.qtd}un</span>\n                        <select style={styles.equipeSelect} value={it.equipe} onChange={(e) => setEquipeItem(it.id, e.target.value)}>\n                          {EQUIPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}\n                        </select>\n                        <button style={styles.enviarBtn} onClick={() => moverParaCostura(it.id)}>Enviar p/ costura</button>\n                        <button style={styles.removerBtn} onClick={() => removerItem(it.id)}>×</button>\n                      </div>\n                    ))}`;

const novo = `{p.itens.map((it) => (\n                      <div key={it.id} style={styles.itemLinha} className="item-linha">\n                        <ItemCosturaEditavel it={it} onToggle={toggleFeito} onRemover={removerItem} onEquipe={setEquipeItem} onEdit={editarLancamentoCostura} />\n                        <button style={styles.enviarBtn} onClick={() => moverParaCostura(it.id)}>Enviar p/ costura</button>\n                      </div>\n                    ))}`;

if (source.includes(antigo)) {
  source = source.replace(antigo, novo);
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: edição habilitada também em Aguardando Costura.");
} else {
  console.log("NeoCooler: bloco de Aguardando Costura já alterado ou não encontrado.");
}
