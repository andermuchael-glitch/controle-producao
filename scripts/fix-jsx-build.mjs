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

// Exibe a data de entrega nos cartões que antes mostravam somente o pedido.
const patches = [
  {
    from: '<div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span></div><span style={styles.pctText}>{p.totalGeral}un</span>',
    to: '<div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span>{p.dataEntrega&&<span style={{...styles.badgeUrgencia,background:urgenciaInfo(p.dataEntrega).fundo,color:urgenciaInfo(p.dataEntrega).cor}}>{formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}</span>}</div><span style={styles.pctText}>{p.totalGeral}un</span>'
  },
  {
    from: '<div style={styles.pedidoTop}><span style={styles.pedidoNum}>#{p.numero}</span><span style={styles.pctText}>{p.total}un</span></div>',
    to: '<div style={styles.pedidoTop}><div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span>{p.dataEntrega&&<span style={{...styles.badgeUrgencia,background:urgenciaInfo(p.dataEntrega).fundo,color:urgenciaInfo(p.dataEntrega).cor}}>{formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}</span>}</div><span style={styles.pctText}>{p.total}un</span></div>'
  },
  {
    from: '<div style={styles.pedidoTop}><span style={styles.pedidoNum}>#{p.numero}</span><span style={styles.pctText}>{p.feito}/{p.total}</span></div>',
    to: '<div style={styles.pedidoTop}><div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span>{p.dataEntrega&&<span style={{...styles.badgeUrgencia,background:urgenciaInfo(p.dataEntrega).fundo,color:urgenciaInfo(p.dataEntrega).cor}}>{formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}</span>}</div><span style={styles.pctText}>{p.feito}/{p.total}</span></div>'
  }
];
for (const {from,to} of patches) {
  if (s.includes(from) && !s.includes(to)) {
    s = s.replace(from,to);
    console.log("Informação de entrega adicionada ao cartão.");
  }
}

await writeFile(path, s, "utf8");
