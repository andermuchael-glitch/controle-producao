import { readFile, writeFile } from "node:fs/promises";

const path = "src/App.jsx";
let s = await readFile(path, "utf8");

// Corrige o fechamento do map interno da aba Aguardando Sublimação.
const broken = 'onClick={()=>enviarParaSublimacao(p.numero,linha.produto)}>Enviar p/ sublimação</button></div></div>)}';
const fixed = 'onClick={()=>enviarParaSublimacao(p.numero,linha.produto)}>Enviar p/ sublimação</button></div></div>})}';

if (s.includes(broken)) {
  s = s.replace(broken, fixed);
  console.log("JSX corrigido automaticamente antes do build.");
}

// Corrige o erro de tela branca causado pelo uso de alternarTelaCheia
// sem a função existir no componente App.
const marker = 'return <div style={styles.page}>';
const fullscreenFn = 'const alternarTelaCheia=()=>{try{if(document.fullscreenElement){document.exitFullscreen?.()}else{document.documentElement.requestFullscreen?.()}}catch(e){console.warn("Fullscreen indisponível",e)}};\n  ';
if (!s.includes('const alternarTelaCheia=')) {
  if (!s.includes(marker)) throw new Error('Marcador de renderização do App não encontrado.');
  s = s.replace(marker, fullscreenFn + marker);
  console.log("Função de tela cheia restaurada.");
}

await writeFile(path, s, "utf8");
