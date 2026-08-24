import { readFile, writeFile } from "node:fs/promises";

const path = "src/App.jsx";
let s = await readFile(path, "utf8");

// Corrige o fechamento do map interno da aba Aguardando Sublimação.
const broken = 'onClick={()=>enviarParaSublimacao(p.numero,linha.produto)}>Enviar p/ sublimação</button></div></div>)}';
const fixed = 'onClick={()=>enviarParaSublimacao(p.numero,linha.produto)}>Enviar p/ sublimação</button></div></div>})}';

if (s.includes(broken)) {
  s = s.replace(broken, fixed);
  await writeFile(path, s, "utf8");
  console.log("JSX corrigido automaticamente antes do build.");
} else {
  console.log("Nenhuma correção JSX necessária.");
}
