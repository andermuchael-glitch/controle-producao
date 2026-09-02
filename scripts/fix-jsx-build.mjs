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
const corteGridFrom = 'corteFormGrid:{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"center",marginTop:8}';
const corteGridTo = 'corteFormGrid:{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:9,alignItems:"center",marginTop:9}';
if (s.includes(corteGridFrom)) {
  s = s.replace(corteGridFrom, corteGridTo);
  console.log("Campos de quantidade e data ampliados no Pré-Corte.");
}

// Garante no próprio JSX que o botão de corte fique abaixo dos campos.
const marcarCortadoFrom = '<button style={styles.enviarBtn} onClick={()=>marcarCortado(p.numero,linha.produto,linha.restante)}>Marcar como cortado</button>';
const marcarCortadoTo = '<button style={{...styles.enviarBtn,gridColumn:"1/-1",width:"100%"}} onClick={()=>marcarCortado(p.numero,linha.produto,linha.restante)}>Marcar como cortado</button>';
if (s.includes(marcarCortadoFrom)) {
  s = s.replace(marcarCortadoFrom, marcarCortadoTo);
  console.log("Botão Marcar como cortado ajustado para os novos campos.");
}

// Na Aguardando Sublimação, organiza Cor + Quantidade / Sublimador + Data.
const alocGridFrom = 'alocGrid:{display:"grid",gridTemplateColumns:"1.2fr .6fr 1fr 1fr auto",gap:8,alignItems:"center",marginTop:8}';
const alocGridTo = 'alocGrid:{display:"grid",gridTemplateColumns:"minmax(0,1.25fr) minmax(78px,.75fr)",gap:9,alignItems:"center",marginTop:9}';
if (s.includes(alocGridFrom)) {
  s = s.replace(alocGridFrom, alocGridTo);
  console.log("Campos da Aguardando Sublimação reorganizados.");
}

// Permite corrigir a quantidade real de um item que já chegou em Aguardando Costura.
// A quantidade digitada é salva ao sair do campo, sem precisar apagar e relançar o pedido.
const costuraSaveFrom = 'const setCosturaFormCampo=(id,restante,campo,valor,corAtual="")=>setCosturaForm(f=>({...f,[id]:{...getCosturaForm(id,restante,corAtual),[campo]:valor}}));';
const costuraSaveTo = 'const setCosturaFormCampo=(id,restante,campo,valor,corAtual="")=>setCosturaForm(f=>({...f,[id]:{...getCosturaForm(id,restante,corAtual),[campo]:valor}})); const salvarQuantidadeAguardandoCostura=async id=>{const origem=itens.find(i=>i.id===id&&i.etapa==="aguardando_costura");if(!origem){setErro("Item de Aguardando Costura não encontrado.");return}const f=getCosturaForm(id,Number(origem.qtd)||0,origem.cor||"");const novaQtd=Math.floor(Number(f.qtd));if(!Number.isFinite(novaQtd)||novaQtd<1){setErro("Informe uma quantidade válida maior que zero.");return}await salvar(itens.map(i=>i.id===id?{...i,qtd:novaQtd}:i));setCosturaForm(x=>({...x,[id]:{...f,qtd:novaQtd}}));setErro("")};';
if (s.includes(costuraSaveFrom) && !s.includes('salvarQuantidadeAguardandoCostura=')) {
  s = s.replace(costuraSaveFrom, costuraSaveTo);
  console.log("Edição da quantidade em Aguardando Costura adicionada.");
}

// O limite do campo era o próprio valor antigo. Isso impedia corrigir 3 para 30.
const costuraQtdFrom = 'max={Number(it.qtd)||1} value={f.qtd} onChange={e=>setCosturaFormCampo(it.id,Number(it.qtd)||0,"qtd",e.target.value)} placeholder="Qtd"/>';
const costuraQtdTo = 'max={999999} value={f.qtd} onChange={e=>setCosturaFormCampo(it.id,Number(it.qtd)||0,"qtd",e.target.value)} onBlur={()=>salvarQuantidadeAguardandoCostura(it.id)} placeholder="Qtd"/>';
if (s.includes(costuraQtdFrom)) {
  s = s.replace(costuraQtdFrom, costuraQtdTo);
  console.log("Campo de quantidade da Aguardando Costura liberado para correção.");
}

await writeFile(path, s, "utf8");
