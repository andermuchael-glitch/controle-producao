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

// Os cartões são estreitos por natureza quando há 5 por linha. Os campos de
// quantidade/data não podem disputar espaço com o botão na mesma linha.
// Mantemos dois campos lado a lado e o botão ocupando toda a largura abaixo.
const corteGridFrom = 'corteFormGrid:{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"center",marginTop:8}';
const corteGridTo = 'corteFormGrid:{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:9,alignItems:"center",marginTop:9}';
if (s.includes(corteGridFrom)) {
  s = s.replace(corteGridFrom, corteGridTo);
  console.log("Campos de quantidade e data ampliados no Pré-Corte.");
}

// Garante no próprio JSX que o botão de corte fique abaixo dos campos, mesmo
// se uma folha de estilo externa estiver atrasada no carregamento.
const marcarCortadoFrom = '<button style={styles.enviarBtn} onClick={()=>marcarCortado(p.numero,linha.produto,linha.restante)}>Marcar como cortado</button>';
const marcarCortadoTo = '<button style={{...styles.enviarBtn,gridColumn:"1/-1",width:"100%"}} onClick={()=>marcarCortado(p.numero,linha.produto,linha.restante)}>Marcar como cortado</button>';
if (s.includes(marcarCortadoFrom)) {
  s = s.replace(marcarCortadoFrom, marcarCortadoTo);
  console.log("Botão Marcar como cortado ajustado para os novos campos.");
}

// Na Aguardando Sublimação, organiza Cor + Quantidade / Sublimador + Data,
// deixando Enviar p/ sublimação em largura total.
const alocGridFrom = 'alocGrid:{display:"grid",gridTemplateColumns:"1.2fr .6fr 1fr 1fr auto",gap:8,alignItems:"center",marginTop:8}';
const alocGridTo = 'alocGrid:{display:"grid",gridTemplateColumns:"minmax(0,1.25fr) minmax(78px,.75fr)",gap:9,alignItems:"center",marginTop:9}';
if (s.includes(alocGridFrom)) {
  s = s.replace(alocGridFrom, alocGridTo);
  console.log("Campos da Aguardando Sublimação reorganizados.");
}

await writeFile(path, s, "utf8");
