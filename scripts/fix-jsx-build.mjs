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
// A versão moderna usa className no container principal, por isso não dependemos
// mais de um marcador único de return.
if (!s.includes('const alternarTelaCheia=')) {
  const markers = [
    'return <div className="neocooler-app" style={styles.page}>',
    'return <div style={styles.page}>'
  ];
  const marker = markers.find(m => s.includes(m));

  if (!marker) {
    console.warn("Marcador de renderização não encontrado; nenhuma injeção de tela cheia foi necessária.");
  } else {
    const fullscreenState = s.includes('const [telaCheia,setTelaCheia]')
      ? ''
      : 'const [telaCheia,setTelaCheia]=useState(false);\n  ';

    const fullscreenFn = `const alternarTelaCheia=()=>{try{if(document.fullscreenElement){document.exitFullscreen?.();setTelaCheia(false)}else{document.documentElement.requestFullscreen?.();setTelaCheia(true)}}catch(e){console.warn("Fullscreen indisponível",e)}};\n  `;

    s = s.replace(marker, fullscreenState + fullscreenFn + marker);
    console.log("Compatibilidade de tela cheia aplicada.");
  }
}

await writeFile(path, s, "utf8");
