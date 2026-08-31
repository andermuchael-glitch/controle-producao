import { readFile, writeFile } from "node:fs/promises";

const path = "src/App.jsx";
let s = await readFile(path, "utf8");

// Correção de compatibilidade para um fechamento JSX antigo.
const broken = 'onClick={()=>enviarParaSublimacao(p.numero,linha.produto)}>Enviar p/ sublimação</button></div></div>)}';
const fixed = 'onClick={()=>enviarParaSublimacao(p.numero,linha.produto)}>Enviar p/ sublimação</button></div></div>})}';
if (s.includes(broken)) {
  s = s.replace(broken, fixed);
  console.log("JSX corrigido automaticamente antes do build.");
}

// Compatibilidade com o botão de tela cheia.
// Nunca duplicar state ou função quando eles já existem com espaçamentos diferentes.
const hasFullscreenState = /const\s*\[\s*telaCheia\s*,\s*setTelaCheia\s*\]\s*=\s*useState/.test(s);
const hasFullscreenFn = /const\s+alternarTelaCheia\s*=/.test(s);

if (!hasFullscreenState || !hasFullscreenFn) {
  const markers = [
    'return <div className="neocooler-app" style={styles.page}>',
    'return <div style={styles.page}>'
  ];
  const marker = markers.find(m => s.includes(m));

  if (!marker) {
    console.warn("Marcador de renderização não encontrado; compatibilidade de tela cheia ignorada.");
  } else {
    const prefix = [
      !hasFullscreenState ? 'const [telaCheia,setTelaCheia]=useState(false);' : '',
      !hasFullscreenFn ? 'const alternarTelaCheia=()=>{try{if(document.fullscreenElement){document.exitFullscreen?.();setTelaCheia(false)}else{document.documentElement.requestFullscreen?.();setTelaCheia(true)}}catch(e){console.warn("Fullscreen indisponível",e)}};' : ''
    ].filter(Boolean).join('\n  ');

    s = s.replace(marker, prefix + (prefix ? '\n  ' : '') + marker);
    console.log("Compatibilidade de tela cheia verificada.");
  }
}

await writeFile(path, s, "utf8");
